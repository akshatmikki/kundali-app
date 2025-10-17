import pLimit from "p-limit";
import { model } from "./geminiClient";
import { redis } from "./redisClient";

// Helper to batch prompts
function batchPrompts(prompts: string[], batchSize = 5) {
  const batches: string[][] = [];
  for (let i = 0; i < prompts.length; i += batchSize) {
    batches.push(prompts.slice(i, i + batchSize));
  }
  return batches;
}

export async function generateMultiple(prompts: string[]) {
  const limit = pLimit(5); // 5 parallel requests max

  // Optional batching (if prompts are short)
  const batches = batchPrompts(prompts, 5);

  const results: string[] = [];

  await Promise.all(
    batches.map((batch, batchIndex) =>
      limit(async () => {
        const combinedPrompt = batch
          .map((p, i) => `${i + 1}. ${p}`)
          .join("\n");

        const cacheKey = `gemini:${Buffer.from(combinedPrompt).toString("base64")}`;

        // 🔹 Try cache first
        if (redis) {
          const cached = await redis.get(cacheKey);
          if (cached) {
            console.log(`Cache hit for batch ${batchIndex + 1}`);
            results.push(...cached.split("|||"));
            return;
          }
        }

        // 🔹 Generate from Gemini
        const res = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: combinedPrompt }] }],
          generationConfig: { maxOutputTokens: 256, temperature: 0.7 },
        });

        const text = res.response.text();
        const split = text.split(/\n\d+\./).map(s => s.trim()).filter(Boolean);

        results.push(...split);

        // 🔹 Store cache
        if (redis) await redis.setex(cacheKey, 3600, split.join("|||"));
      })
    )
  );

  return results;
}