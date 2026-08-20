import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { address, city, zip } = await request.json();

    const query = [address, zip, city, "Croatia"]
      .filter(Boolean)
      .join(", ");

    if (!query) {
      return NextResponse.json(
        { error: "Adresse fehlt." },
        { status: 400 }
      );
    }

    const url =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({
        q: query,
        format: "json",
        limit: "1"
      });

    const response = await fetch(url, {
      headers: {
        "User-Agent": "MojMestar/1.0"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Geocoding fehlgeschlagen.");
    }

    const results = await response.json();

    if (!results.length) {
      return NextResponse.json(
        { error: "Adresse nicht gefunden." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      latitude: Number(results[0].lat),
      longitude: Number(results[0].lon)
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unbekannter Fehler." },
      { status: 500 }
    );
  }
}
