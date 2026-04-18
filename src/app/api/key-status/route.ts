import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "API key required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.opusmax.pro/api/key-status?key=${key}`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to check key status" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Key status check error:", error);
    return NextResponse.json(
      { error: "Failed to connect to OpusMax" },
      { status: 500 }
    );
  }
}