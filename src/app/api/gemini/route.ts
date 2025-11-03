import { NextRequest, NextResponse } from "next/server";

// 🧮 Global counters for all Gemini requests (within this runtime)
let totalInputTokens = 0;
let totalOutputTokens = 0;
let totalCostUSD = 0; // 💰 cumulative cost

// 🔁 Persistent retry with exponential backoff + jitter (max 5 retries)
async function fetchUntilSuccess(
  url: string,
  options: RequestInit = {},
  baseDelay = 1000,
  maxDelay = 30000,
  maxRetries = 5,
  maxRuntime = 10 * 60 * 1000
): Promise<Response> {
  let attempt = 0;
  const startTime = Date.now();

  while (attempt < maxRetries) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      return res;
    } catch (err: any) {
      const elapsed = Date.now() - startTime;

      if (elapsed > maxRuntime) {
        console.error("⛔ Gemini API retry timeout exceeded (10 minutes)");
        throw new Error("Gemini API retry timeout exceeded (10 minutes)");
      }

      if (attempt + 1 >= maxRetries) {
        console.error(`🚫 Reached max retry limit (${maxRetries})`);
        throw new Error(
          `Gemini API request failed after ${maxRetries} attempts: ${err?.message || err}`
        );
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * 300;
      const totalDelay = delay + jitter;

      console.error(`⚠️ Gemini API request failed (attempt ${attempt + 1}): ${err?.message || err}`);
      if (err?.stack) console.error("Stack trace:", err.stack);

      console.warn(
        `🔄 Retrying in ${Math.round(totalDelay)}ms... (elapsed: ${Math.round(elapsed / 1000)}s)`
      );

      await new Promise((resolve) => setTimeout(resolve, totalDelay));
      attempt++;
    }
  }

  throw new Error("Unexpected state: fetchUntilSuccess exited loop without returning.");
}

export async function POST(req: NextRequest) {
  try {
    const { contents, generationConfig } = await req.json();

    if (!contents || !Array.isArray(contents)) {
      return NextResponse.json(
        { error: "Invalid request body, 'contents' is required" },
        { status: 400 }
      );
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const apiResponse = await fetchUntilSuccess(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents, generationConfig }),
    });

    const data = await apiResponse.json();

    // ✅ Extract token usage
    const inputTokens = data?.usageMetadata?.promptTokenCount || 0;
    const outputTokens = data?.usageMetadata?.candidatesTokenCount || 0;

    // 💰 Gemini 2.0 Flash pricing (USD per 1K tokens)
    const inputPricePer1K = 0.10;
    const outputPricePer1K = 0.40;

    // 🧮 Per-request cost calculation
    const inputCost = (inputTokens / 100000) * inputPricePer1K;
    const outputCost = (outputTokens / 100000) * outputPricePer1K;
    const totalCost = inputCost + outputCost;

    // 🧩 Update cumulative totals
    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;
    totalCostUSD += totalCost;

    // 🖨️ Log cost + cumulative stats
    console.log("💰 Gemini Cost Estimate (This Request):");
    console.log(`   Input Tokens:  ${inputTokens} → $${inputCost.toFixed(6)}`);
    console.log(`   Output Tokens: ${outputTokens} → $${outputCost.toFixed(6)}`);
    console.log(`   Total Cost:    $${totalCost.toFixed(6)}`);
    console.log("📈 Cumulative Totals:");
    console.log(`   Total Input Tokens:  ${totalInputTokens}`);
    console.log(`   Total Output Tokens: ${totalOutputTokens}`);
    console.log(`   Total Spent (USD):   $${totalCostUSD.toFixed(6)}`);

    // ✅ Return JSON with token + cost info
    return NextResponse.json({
      ...data,
      tokenUsage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      cost: {
        inputCost: inputCost.toFixed(6),
        outputCost: outputCost.toFixed(6),
        totalCost: totalCost.toFixed(6),
        cumulativeTotalUSD: totalCostUSD.toFixed(6),
      },
    });
  } catch (err: any) {
    console.error("❌ Gemini route error:", err.message || err);
    if (err?.stack) console.error("Stack trace:", err.stack);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: err.message || String(err),
      },
      { status: 500 }
    );
  }
}
