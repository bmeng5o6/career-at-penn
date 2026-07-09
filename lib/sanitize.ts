export function sanitize(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export type ParsedBody = {
  name: string;
  school: string;
  major: string;
  clubs: string;
  class_year: string | null;
};

export function parseBody(body: Record<string, unknown>): ParsedBody {
  const name = sanitize(body.name, 100);
  const school = sanitize(body.school, 100);
  const major = sanitize(body.major, 200);
  const clubs = sanitize(body.clubs, 500);
  const rawYear = body.class_year;
  const class_year =
    typeof rawYear === "string" && /^\d{4}$/.test(rawYear.trim())
      ? rawYear.trim()
      : null;
  return { name, school, major, clubs, class_year };
}
