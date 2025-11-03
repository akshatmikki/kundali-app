// app/server/readAstroFile.ts
"use server";
import { readFile } from "fs/promises";
import path from "path";

export async function readAstroJSON(fileName: string) {
  const filePath = path.join(process.cwd(), "data", fileName);
  const data = await readFile(filePath, "utf-8");
  return JSON.parse(data);
}
