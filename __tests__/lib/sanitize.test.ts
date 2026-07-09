import { describe, it, expect } from "vitest";
import { sanitize, parseBody } from "@/lib/sanitize";

describe("sanitize", () => {
  it("returns the string unchanged when within max length", () => {
    expect(sanitize("hello", 100)).toBe("hello");
  });

  it("trims leading and trailing whitespace", () => {
    expect(sanitize("  hello  ", 100)).toBe("hello");
    expect(sanitize("\t\nhello\n", 100)).toBe("hello");
  });

  it("truncates to maxLength after trimming", () => {
    expect(sanitize("abcde", 3)).toBe("abc");
  });

  it("truncates a string that would be within limit before trim", () => {
    expect(sanitize("  abc  ", 3)).toBe("abc");
  });

  it("returns empty string for empty input", () => {
    expect(sanitize("", 100)).toBe("");
    expect(sanitize("   ", 100)).toBe("");
  });

  it("returns empty string for null", () => {
    expect(sanitize(null, 100)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(sanitize(undefined, 100)).toBe("");
  });

  it("returns empty string for number input", () => {
    expect(sanitize(42, 100)).toBe("");
  });

  it("returns empty string for array input", () => {
    expect(sanitize(["hello"], 100)).toBe("");
  });

  it("returns empty string for object input", () => {
    expect(sanitize({ name: "hello" }, 100)).toBe("");
  });

  it("returns empty string for boolean input", () => {
    expect(sanitize(true, 100)).toBe("");
  });

  it("preserves internal whitespace", () => {
    expect(sanitize("hello world", 100)).toBe("hello world");
  });

  it("handles maxLength of 0", () => {
    expect(sanitize("hello", 0)).toBe("");
  });

  it("handles special characters safely", () => {
    const xss = "<script>alert('xss')</script>";
    expect(sanitize(xss, 200)).toBe(xss); // stored as raw string, not rendered as HTML
  });
});

describe("parseBody", () => {
  it("parses a complete valid body", () => {
    const result = parseBody({
      name: "Jane Smith",
      school: "SEAS",
      major: "Computer Science, BSE",
      clubs: "Penn Labs",
      class_year: "2027",
    });
    expect(result).toEqual({
      name: "Jane Smith",
      school: "SEAS",
      major: "Computer Science, BSE",
      clubs: "Penn Labs",
      class_year: "2027",
    });
  });

  it("trims all string fields", () => {
    const result = parseBody({
      name: "  Jane  ",
      school: "  SEAS  ",
      major: "  CS  ",
      clubs: "  Penn Labs  ",
      class_year: "2027",
    });
    expect(result.name).toBe("Jane");
    expect(result.school).toBe("SEAS");
    expect(result.major).toBe("CS");
    expect(result.clubs).toBe("Penn Labs");
  });

  it("accepts a valid 4-digit class year", () => {
    expect(parseBody({ class_year: "2025" }).class_year).toBe("2025");
    expect(parseBody({ class_year: "2030" }).class_year).toBe("2030");
  });

  it("rejects a 2-digit year", () => {
    expect(parseBody({ class_year: "25" }).class_year).toBeNull();
  });

  it("rejects a non-numeric year string", () => {
    expect(parseBody({ class_year: "abcd" }).class_year).toBeNull();
  });

  it("rejects a year with extra characters", () => {
    expect(parseBody({ class_year: "2027x" }).class_year).toBeNull();
    expect(parseBody({ class_year: "20 27" }).class_year).toBeNull();
  });

  it("rejects number type for class_year", () => {
    expect(parseBody({ class_year: 2027 }).class_year).toBeNull();
  });

  it("rejects null class_year", () => {
    expect(parseBody({ class_year: null }).class_year).toBeNull();
  });

  it("returns empty strings for missing fields", () => {
    const result = parseBody({});
    expect(result.name).toBe("");
    expect(result.school).toBe("");
    expect(result.major).toBe("");
    expect(result.clubs).toBe("");
    expect(result.class_year).toBeNull();
  });

  it("truncates name at 100 characters", () => {
    const long = "a".repeat(150);
    expect(parseBody({ name: long }).name).toHaveLength(100);
  });

  it("truncates school at 100 characters", () => {
    const long = "b".repeat(200);
    expect(parseBody({ school: long }).school).toHaveLength(100);
  });

  it("truncates clubs at 500 characters", () => {
    const long = "c".repeat(600);
    expect(parseBody({ clubs: long }).clubs).toHaveLength(500);
  });

  it("truncates major at 200 characters", () => {
    const long = "m".repeat(300);
    expect(parseBody({ major: long }).major).toHaveLength(200);
  });

  it("handles non-string non-null values for string fields", () => {
    const result = parseBody({ name: 42, school: true, major: [], clubs: {} });
    expect(result.name).toBe("");
    expect(result.school).toBe("");
    expect(result.major).toBe("");
    expect(result.clubs).toBe("");
  });
});
