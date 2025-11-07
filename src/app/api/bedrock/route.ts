import { NextRequest, NextResponse } from "next/server";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { toUtf8 } from "@aws-sdk/util-utf8";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// 💰 Pricing
const PRICE_PER_1K_INPUT_TOKENS = 0.00018;
const PRICE_PER_1K_OUTPUT_TOKENS = 0.00071;

let totalInputTokens = 0;
let totalOutputTokens = 0;
let totalCostUSD = 0;

// 🔹 Estimate tokens roughly
function estimateTokens(text: string): number {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / 0.75);
}

// 🔹 Split large JSONs by token budget
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

// 🔹 Bedrock call (optimized)
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
  const response = await client.send(command);

  // Decode Bedrock response
  let responseBody = "";

  const body = response.body as
    | Uint8Array
    | {
      transformToByteArray?: () => Promise<Uint8Array>;
      transformToString?: () => Promise<string>;
    }
    | null
    | undefined;

  if (!body) {
    throw new Error("Empty Bedrock response body");
  }

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

  const parsed = JSON.parse(responseBody);
  let message = parsed?.choices?.[0]?.message?.content || parsed.output_text || parsed.output || "{}";
  message = message.replace(/\s{2,}/g, " ").trim();

  const inputTokens = parsed?.usage?.prompt_tokens || estimateTokens(chunk);
  const outputTokens = parsed?.usage?.completion_tokens || estimateTokens(message);

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
}

// 🔹 Merge multiple JSON outputs
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

// 🚀 Optimized handler
export async function POST(req: NextRequest) {
  try {
    const { prompt, jsonData } = await req.json();

    const MODEL_LIMIT = 4096;
    const jsonChunks = splitJsonSafely(jsonData, MODEL_LIMIT - 800);

    // ⚡ Parallel Bedrock calls
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

      // Truncate if necessary
      let finalPrompt = chunkPrompt;
      if (estTokens >= MODEL_LIMIT) {
        finalPrompt = chunkPrompt.split(/\s+/).slice(0, MODEL_LIMIT - 500).join(" ");
      }

      return callBedrock(finalPrompt, safeMaxTokens);
    });

    // Wait for all chunks to complete
    const results = await Promise.allSettled(promises);

    const fulfilled = results
      .filter((r) => r.status === "fulfilled")
      .map((r: any) => r.value);

    const mergedOutput = mergeJsonObjects(fulfilled.map((f) => f.jsonOutput));
   // Calculate cost for each Bedrock call, then sum
const detailedCosts = fulfilled.map((f) => {
  const inputCost = (f.inputTokens / 1000) * PRICE_PER_1K_INPUT_TOKENS;
  const outputCost = (f.outputTokens / 1000) * PRICE_PER_1K_OUTPUT_TOKENS;
  return {
    inputTokens: f.inputTokens,
    outputTokens: f.outputTokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
});

// Aggregate totals
const totalInput = detailedCosts.reduce((sum, d) => sum + d.inputTokens, 0);
const totalOutput = detailedCosts.reduce((sum, d) => sum + d.outputTokens, 0);
const totalCost = detailedCosts.reduce((sum, d) => sum + d.totalCost, 0);

// Accumulate global stats
totalInputTokens += totalInput;
totalOutputTokens += totalOutput;
totalCostUSD += totalCost;

    console.log(`💰 Total cost: $${totalCost.toFixed(6)}`);

    return NextResponse.json({
  success: true,
  message: mergedOutput,
  usage: {
    detailed: detailedCosts, // 👈 show per-call stats
    inputTokens: totalInput,
    outputTokens: totalOutput,
    totalTokens: totalInput + totalOutput,
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
