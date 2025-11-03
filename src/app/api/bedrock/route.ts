import { NextRequest, NextResponse } from "next/server";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandOutput,
} from "@aws-sdk/client-bedrock-runtime";
import { toUtf8 } from "@aws-sdk/util-utf8";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// 💰 GPT-OSS-120B Pricing (USD per 1K tokens)
const PRICE_PER_1K_INPUT_TOKENS = 0.00018;
const PRICE_PER_1K_OUTPUT_TOKENS = 0.00071;

// 🧮 Global Totals — persist across all POST calls
let totalInputTokens = 0;
let totalOutputTokens = 0;
let totalCostUSD = 0;

function estimateTokens(text: string): number {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / 0.75);
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, jsonData } = await req.json();

    const fullPrompt = `
You are a helpful assistant.
Use the following JSON data to answer or perform the task.

JSON Data:
${JSON.stringify(jsonData, null, 2)}

Task:
${prompt}
    `.trim();

    const payload = {
      modelId: "openai.gpt-oss-120b-1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: fullPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 0.9,
      }),
    };

    const command = new InvokeModelCommand(payload);
    const response: InvokeModelCommandOutput = await client.send(command);

    // ✅ Decode Bedrock response safely
    let responseBody = "";
    const body: any = response.body;

    if (body instanceof Uint8Array) {
      responseBody = toUtf8(body);
    } else if (typeof body?.transformToByteArray === "function") {
      const bytes = await body.transformToByteArray();
      responseBody = toUtf8(bytes);
    } else if (typeof body?.transformToString === "function") {
      responseBody = await body.transformToString();
    } else {
      responseBody = String(body);
    }

    const parsed = JSON.parse(responseBody);
    console.log("🧾 Full Bedrock raw response:", parsed);

    // ✅ Extract message content
    let message = "";
    if (parsed?.choices?.[0]?.message?.content) {
      message = parsed.choices[0].message.content;
    } else if (parsed.output_text) {
      message = parsed.output_text;
    } else if (parsed.output) {
      message = parsed.output;
    } else {
      message = "⚠️ No output returned from Bedrock.";
    }

    message = message.replace(/\s{2,}/g, " ").trim();

    // 🧮 Use real token counts if available, fallback to estimation
    const inputTokens =
      parsed?.usage?.prompt_tokens || estimateTokens(fullPrompt);
    const outputTokens =
      parsed?.usage?.completion_tokens || estimateTokens(message);
    const totalTokens = inputTokens + outputTokens;

    // 💵 Calculate cost based on pricing
    const inputCost = (inputTokens / 1000) * PRICE_PER_1K_INPUT_TOKENS;
    const outputCost = (outputTokens / 1000) * PRICE_PER_1K_OUTPUT_TOKENS;
    const totalCost = inputCost + outputCost;

    // ✅ Add to running totals
    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;
    totalCostUSD += totalCost;

    // 🧾 Console log totals for visibility
    console.log("💰 This call cost:", `$${totalCost.toFixed(6)}`);
    console.log("📊 Running totals:");
    console.log(`   Total Input Tokens: ${totalInputTokens}`);
    console.log(`   Total Output Tokens: ${totalOutputTokens}`);
    console.log(`   Total Cost (USD): $${totalCostUSD.toFixed(6)}`);

    return NextResponse.json({
      success: true,
      message,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
        inputCost: inputCost.toFixed(6),
        outputCost: outputCost.toFixed(6),
        totalCost: totalCost.toFixed(6),
      },
      totals: {
        totalInputTokens,
        totalOutputTokens,
        totalCostUSD: totalCostUSD.toFixed(6),
      },
    });
  } catch (error: any) {
    console.error("❌ Bedrock Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
