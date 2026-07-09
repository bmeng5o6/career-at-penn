import { describe, it, expect } from "vitest";
import { getMajorsForSchools, MAJORS_BY_SCHOOL } from "@/lib/majors";

describe("getMajorsForSchools", () => {
  it("returns all majors sorted when given empty array", () => {
    const result = getMajorsForSchools([]);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toEqual([...result].sort());
  });

  it("returns no duplicates when given empty array", () => {
    const result = getMajorsForSchools([]);
    expect(result.length).toBe(new Set(result).size);
  });

  it("returns only SEAS majors for ['SEAS']", () => {
    const result = getMajorsForSchools(["SEAS"]);
    expect(result).toEqual(expect.arrayContaining(MAJORS_BY_SCHOOL.SEAS));
    // should not include CAS-only majors
    expect(result).not.toContain("History, BA");
    expect(result).not.toContain("Philosophy, BA");
  });

  it("returns only Wharton majors for ['Wharton']", () => {
    const result = getMajorsForSchools(["Wharton"]);
    expect(result).toContain("Finance, BS");
    expect(result).toContain("Accounting, BS");
    expect(result).not.toContain("Computer Science, BSE");
  });

  it("returns only CAS majors for ['CAS']", () => {
    const result = getMajorsForSchools(["CAS"]);
    expect(result).toContain("Economics, BA");
    expect(result).toContain("Neuroscience, BA");
    expect(result).not.toContain("Finance, BS");
  });

  it("returns only Nursing majors for ['Nursing']", () => {
    const result = getMajorsForSchools(["Nursing"]);
    expect(result).toEqual(["Nursing, BSN", "Nutrition Science, BSN"]);
  });

  it("returns union of majors for two schools, sorted", () => {
    const result = getMajorsForSchools(["SEAS", "Wharton"]);
    expect(result).toContain("Computer Science, BSE");
    expect(result).toContain("Finance, BS");
    expect(result).not.toContain("History, BA");
    expect(result).toEqual([...result].sort());
  });

  it("returns all majors for all four schools", () => {
    const result = getMajorsForSchools(["SEAS", "Wharton", "CAS", "Nursing"]);
    const all = getMajorsForSchools([]);
    expect(result).toEqual(all);
  });

  it("returns empty array for an unknown school", () => {
    const result = getMajorsForSchools(["FakeSchool"]);
    expect(result).toEqual([]);
  });

  it("ignores unknown school when mixed with known school", () => {
    const result = getMajorsForSchools(["SEAS", "FakeSchool"]);
    expect(result).toEqual(getMajorsForSchools(["SEAS"]));
  });

  it("returns no duplicates when two schools overlap (Nursing shares Nutrition Science with CAS)", () => {
    const result = getMajorsForSchools(["CAS", "Nursing"]);
    expect(result.filter((m) => m === "Nutrition Science, BSN").length).toBe(1);
    expect(result.length).toBe(new Set(result).size);
  });

  it("result is always sorted alphabetically", () => {
    for (const school of Object.keys(MAJORS_BY_SCHOOL)) {
      const result = getMajorsForSchools([school]);
      expect(result).toEqual([...result].sort());
    }
  });

  it("all items in result are non-empty strings", () => {
    const result = getMajorsForSchools([]);
    for (const m of result) {
      expect(typeof m).toBe("string");
      expect(m.length).toBeGreaterThan(0);
    }
  });
});
