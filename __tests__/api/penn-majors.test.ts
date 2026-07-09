import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/penn-majors/route";
import { NextRequest } from "next/server";

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/penn-majors");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

describe("GET /api/penn-majors", () => {
  it("returns all majors when no schools param", async () => {
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(Array.isArray(body.majors)).toBe(true);
    expect(body.majors.length).toBeGreaterThan(50);
  });

  it("returns SEAS majors for schools=SEAS", async () => {
    const res = await GET(makeRequest({ schools: "SEAS" }));
    const body = await res.json();
    expect(body.majors).toContain("Computer Science, BSE");
    expect(body.majors).toContain("Bioengineering, BSE");
    expect(body.majors).not.toContain("Finance, BS");
    expect(body.majors).not.toContain("Economics, BA");
  });

  it("returns Wharton majors for schools=Wharton", async () => {
    const res = await GET(makeRequest({ schools: "Wharton" }));
    const body = await res.json();
    expect(body.majors).toContain("Finance, BS");
    expect(body.majors).toContain("Accounting, BS");
    expect(body.majors).not.toContain("Computer Science, BSE");
  });

  it("returns combined majors for two schools", async () => {
    const res = await GET(makeRequest({ schools: "SEAS,Wharton" }));
    const body = await res.json();
    expect(body.majors).toContain("Computer Science, BSE");
    expect(body.majors).toContain("Finance, BS");
    expect(body.majors).not.toContain("History, BA");
  });

  it("returns empty array for unknown school", async () => {
    const res = await GET(makeRequest({ schools: "FakeSchool" }));
    const body = await res.json();
    expect(body.majors).toEqual([]);
  });

  it("returns 200 status", async () => {
    const res = await GET(makeRequest({ schools: "SEAS" }));
    expect(res.status).toBe(200);
  });

  it("result is sorted alphabetically", async () => {
    const res = await GET(makeRequest({ schools: "CAS" }));
    const body = await res.json();
    expect(body.majors).toEqual([...body.majors].sort());
  });

  it("result has no duplicates", async () => {
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.majors.length).toBe(new Set(body.majors).size);
  });

  it("handles extra whitespace in schools param", async () => {
    const res = await GET(makeRequest({ schools: " SEAS , Wharton " }));
    const body = await res.json();
    expect(body.majors).toContain("Computer Science, BSE");
    expect(body.majors).toContain("Finance, BS");
  });

  it("all majors in response are non-empty strings", async () => {
    const res = await GET(makeRequest({ schools: "CAS" }));
    const body = await res.json();
    for (const m of body.majors) {
      expect(typeof m).toBe("string");
      expect(m.length).toBeGreaterThan(0);
    }
  });
});
