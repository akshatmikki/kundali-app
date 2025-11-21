import { NextRequest, NextResponse } from "next/server";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { toUtf8 } from "@aws-sdk/util-utf8";

// === 🔹 Initialize Bedrock client ===
const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// === 💰 Pricing ===
const PRICE_PER_1K_INPUT_TOKENS = 0.00018;
const PRICE_PER_1K_OUTPUT_TOKENS = 0.00071;

// === 🌍 Global trackers ===
let totalInputTokens = 0;
let totalOutputTokens = 0;
let totalCostUSD = 0;

// === 🔹 Estimate tokens roughly ===
function estimateTokens(text: string): number {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / 0.75);
}

// === 🔹 Split large JSONs by token budget ===
function splitJsonSafely(obj: any, maxTokens: number): string[] {
  const chunks: string[] = [];
  let currentChunk: Record<string, any> = {};
  let currentTokens = 0;

  for (const [key, value] of Object.entries(obj)) {
    const str = JSON.stringify({ [key]: value });
    const tokens = estimateTokens(str);
    if (currentTokens + tokens > maxTokens) {
      chunks.push(JSON.stringify(currentChunk));
      currentChunk = {};
      currentTokens = 0;
    }
    currentChunk[key] = value;
    currentTokens += tokens;
  }

  if (Object.keys(currentChunk).length) {
    chunks.push(JSON.stringify(currentChunk));
  }

  return chunks;
}

// === 🔹 Bedrock single call with enhanced logging ===
async function callBedrock(chunk: string, safeMaxTokens: number) {
  const payload = {
    modelId: "openai.gpt-oss-120b-1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      messages: [
        { role: "system", content: "You are a helpful AI assistant." },
        { role: "user", content: chunk },
      ],
      temperature: 0.7,
      max_tokens: safeMaxTokens,
      top_p: 0.9,
    }),
  };

  const command = new InvokeModelCommand(payload);

  try {
    const response = await client.send(command);
    console.log("📨 Bedrock raw metadata:", {
      $metadata: response.$metadata,
      contentType: response.contentType,
    });

    let responseBody = "";
    const body = response.body as
      | Uint8Array
      | {
        transformToByteArray?: () => Promise<Uint8Array>;
        transformToString?: () => Promise<string>;
      }
      | null
      | undefined;

    if (!body) throw new Error("Bedrock returned an empty response body");

    if (body instanceof Uint8Array) {
      responseBody = toUtf8(body);
    } else if (typeof body.transformToByteArray === "function") {
      const bytes = await body.transformToByteArray();
      responseBody = toUtf8(bytes);
    } else if (typeof body.transformToString === "function") {
      responseBody = await body.transformToString();
    } else {
      responseBody = JSON.stringify(body);
    }

    if (!responseBody.trim()) {
      throw new Error("Bedrock returned blank response text");
    }

    let parsed;
    try {
      parsed = JSON.parse(responseBody);
    } catch (err) {
      console.error("❌ Failed to parse Bedrock JSON:", responseBody);
      throw new Error(`Invalid JSON from Bedrock: ${err}`);
    }

    // 🔍 Log the entire parsed object for clarity
    console.log("🧩 Parsed Bedrock response:", JSON.stringify(parsed, null, 2));

    // 🧠 Try multiple possible message formats
    let message: string | undefined =
      parsed?.choices?.[0]?.message?.content ||
      parsed?.choices?.[0]?.message?.text ||
      (typeof parsed?.choices?.[0]?.message === "string"
        ? parsed.choices[0].message
        : undefined) ||
      parsed.output_text ||
      parsed.output;

    if (!message && parsed?.choices?.[0]?.message) {
      // If message is an object, stringify it (for debugging)
      message = JSON.stringify(parsed.choices[0].message);
      console.warn("⚠️ Message object had no direct 'content' field, stringified:", message);
    }

    if (!message) {
      console.error("⚠️ No usable message field found:", parsed);
      throw new Error("Blank message field in Bedrock response");
    }

    message = message.replace(/\s{2,}/g, " ").trim();

    const inputTokens = parsed?.usage?.prompt_tokens || estimateTokens(chunk);
    const outputTokens =
      parsed?.usage?.completion_tokens || estimateTokens(message);

    try {
      return {
        jsonOutput: JSON.parse(message),
        inputTokens,
        outputTokens,
      };
    } catch {
      return {
        jsonOutput: { text: message },
        inputTokens,
        outputTokens,
      };
    }
  } catch (err: any) {
    console.error("🔥 Full Bedrock error dump:", {
      name: err.name,
      message: err.message,
      stack: err.stack,
      $metadata: err.$metadata,
      response: err.response
        ? {
          status: err.response.statusCode,
          headers: err.response.headers,
        }
        : undefined,
    });
    throw err;
  }
}

// === 🔁 Retry logic with exponential backoff and deep logging ===
async function callBedrockWithRetries(
  chunk: string,
  safeMaxTokens: number,
  retries = 5
) {
  let lastErrorMessage = "Unknown failure";

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await callBedrock(chunk, safeMaxTokens);

      if (result && result.jsonOutput && Object.keys(result.jsonOutput).length > 0) {
        console.log(`✅ Success on attempt ${attempt}`);
        return result;
      }

      lastErrorMessage = "Received blank or invalid response.";
      console.warn(`⚠️ Attempt ${attempt}: ${lastErrorMessage}`);
    } catch (err: any) {
      lastErrorMessage = err.message || JSON.stringify(err);
      console.warn(
        `⚠️ Attempt ${attempt}/${retries} failed:\n`,
        JSON.stringify(err, null, 2)
      );
    }

    const waitTime = Math.pow(2, attempt - 1) * 1000;
    console.log(`⏳ Waiting ${waitTime / 1000}s before next retry...`);
    await new Promise((r) => setTimeout(r, waitTime));
  }

  throw new Error(
    `❌ Bedrock failed after ${retries} retries. Last error: ${lastErrorMessage}`
  );
}

// === 🔹 Merge multiple JSON outputs ===
function mergeJsonObjects(objects: any[]): any {
  const result: any = {};
  for (const obj of objects) {
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(result[key]) && Array.isArray(value)) {
        result[key] = result[key].concat(value);
      } else if (
        typeof result[key] === "object" &&
        typeof value === "object" &&
        !Array.isArray(result[key])
      ) {
        result[key] = { ...result[key], ...value };
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

// === 🚀 Main Handler ===
export async function POST(req: NextRequest) {
  try {
    const { prompt, jsonData } = await req.json();
    const MODEL_LIMIT = 4096;

    const jsonChunks = splitJsonSafely(jsonData, MODEL_LIMIT - 800);

    const promises = jsonChunks.map(async (chunkJson) => {
      const chunkPrompt = `
You are a helpful assistant.
Use the following JSON data to perform the task.

JSON Data:
${chunkJson}

Task:
${prompt}
      `.trim();

      const estTokens = estimateTokens(chunkPrompt);
      const safeMaxTokens = Math.max(1, MODEL_LIMIT - estTokens);

      let finalPrompt = chunkPrompt;
      if (estTokens >= MODEL_LIMIT) {
        finalPrompt = chunkPrompt
          .split(/\s+/)
          .slice(0, MODEL_LIMIT - 500)
          .join(" ");
      }

      return callBedrockWithRetries(finalPrompt, safeMaxTokens);
    });

    // Wait for all chunks
    const results = await Promise.allSettled(promises);

    const fulfilled = results
      .filter((r) => r.status === "fulfilled")
      .map((r: any) => r.value);

    if (fulfilled.length !== jsonChunks.length) {
      const failedChunks = results.filter((r) => r.status === "rejected");
      const failureReasons = failedChunks.map(
        (r: any, i) => `Chunk ${i + 1}: ${r.reason?.message || "Unknown"}`
      );
      throw new Error(
        `❌ Some chunks failed after retries:\n${failureReasons.join("\n")}`
      );
    }

    const mergedOutput = mergeJsonObjects(
      fulfilled.map((f) => f.jsonOutput)
    );

    // === 💰 Cost Calculation ===
    const detailedCosts = fulfilled.map((f) => {
      const inputCost = (f.inputTokens / 1000) * PRICE_PER_1K_INPUT_TOKENS;
      const outputCost = (f.outputTokens / 1000) * PRICE_PER_1K_OUTPUT_TOKENS;
      const totalCost = inputCost + outputCost;

      totalInputTokens += f.inputTokens;
      totalOutputTokens += f.outputTokens;
      totalCostUSD += totalCost;

      return {
        inputTokens: f.inputTokens,
        outputTokens: f.outputTokens,
        inputCost,
        outputCost,
        totalCost,
      };
    });

    console.log(`💰 Total cost so far: $${totalCostUSD.toFixed(6)}`);

    return NextResponse.json({
      success: true,
      message: mergedOutput,
      usage: {
        detailed: detailedCosts,
        totalInputTokens,
        totalOutputTokens,
        totalCostUSD: totalCostUSD.toFixed(6),
      },
    });
  } catch (error: any) {
    console.error("❌ Bedrock Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unknown error",
        details: error, // 🔍 Return full error for debugging
      },
      { status: 500 }
    );
  }
}
