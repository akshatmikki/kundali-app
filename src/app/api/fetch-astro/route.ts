import { NextResponse } from "next/server";
import { fetchAllAstroData } from "@/server/fetchallastrodata";

export async function POST(req: Request) {
  const userData = await req.json();
  const data = await fetchAllAstroData(userData);
  return NextResponse.json(data);
}
