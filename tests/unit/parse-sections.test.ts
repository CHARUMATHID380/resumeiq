import { describe, it, expect } from "vitest";
import { diffWords } from "diff";

// The editor route inlines its helpers, so we re-declare the pure ones here
// to keep the test independent of the React module (which would pull in
// TanStack Router / TipTap during unit tests). If you refactor the editor
// to export these from a shared module, import them instead.

const HEADER_PATTERNS = [
  /^(professional\s+)?summary$/i,
  /^objective$/i,
  /^(work\s+)?experience$/i,
  /^employment(\s+history)?$/i,
  /^education$/i,
  /^skills$/i,
  /^technical\s+skills$/i,
  /^projects$/i,
  /^certifications?$/i,
  /^awards?$/i,
  /^publications?$/i,
  /^volunteer(\s+experience)?$/i,
  /^languages?$/i,
  /^interests?$/i,
  /^references?$/i,
  /^contact(\s+information)?$/i,
];

function isHeader(rawLine: string) {
  const line = rawLine.trim().replace(/[:\-]+$/, "");
  if (!line || line.length > 60) return false;
  if (HEADER_PATTERNS.some((p) => p.test(line))) return true;
  const letters = line.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 3 && letters === letters.toUpperCase() && line.split(/\s+/).length <= 5) return true;
  return false;
}

type Section = { id: string; name: string; body: string };

function parseSections(text: string): Section[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const sections: Section[] = [];
  let current: Section = { id: "header", name: "Header / Contact", body: "" };
  for (const line of lines) {
    if (isHeader(line)) {
      if (current.body.trim()) sections.push({ ...current, body: current.body.trim() });
      const name = line.trim().replace(/[:\-]+$/, "");
      current = { id: name.toLowerCase().replace(/\s+/g, "-") + "-" + sections.length, name, body: "" };
    } else {
      current.body += line + "\n";
    }
  }
  if (current.body.trim()) sections.push({ ...current, body: current.body.trim() });
  if (sections.length === 0) sections.push({ id: "full", name: "Resume", body: text.trim() });
  return sections;
}

const SAMPLE = `Jane Doe
jane@example.com | 555-1212

SUMMARY
Product engineer with 8 years building B2B SaaS.

Experience
Acme Corp — Senior Engineer (2020-Present)
- Shipped billing system handling $40M ARR
- Led migration to TanStack Start

Education
MIT — BSc Computer Science, 2016

Skills:
TypeScript, React, PostgreSQL`;

describe("parseSections", () => {
  it("splits a typical resume into Header + Summary + Experience + Education + Skills", () => {
    const out = parseSections(SAMPLE);
    const names = out.map((s) => s.name.toLowerCase());
    expect(names[0]).toMatch(/header/i);
    expect(names).toEqual(
      expect.arrayContaining(["summary", "experience", "education", "skills"]),
    );
  });

  it("keeps body content for each section", () => {
    const out = parseSections(SAMPLE);
    const exp = out.find((s) => /experience/i.test(s.name));
    expect(exp?.body).toContain("Acme Corp");
    expect(exp?.body).toContain("$40M ARR");
  });

  it("returns a single Header/Contact section when no headers match", () => {
    const out = parseSections("just one paragraph of text with no headers at all.");
    expect(out).toHaveLength(1);
    expect(out[0].name).toMatch(/header/i);
    expect(out[0].body).toContain("just one paragraph");
  });

  it("returns the hard fallback Resume section only for empty input", () => {
    const out = parseSections("");
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("Resume");
  });

  it("treats short ALL-CAPS lines as headers", () => {
    const out = parseSections("PROJECTS\n- Built thing\n- Built other thing");
    expect(out.some((s) => s.name === "PROJECTS")).toBe(true);
  });

  it("ignores long lines even if uppercase", () => {
    const longUpper = "THIS IS A VERY LONG SENTENCE THAT SHOULD NOT BE TREATED AS A HEADER BECAUSE IT IS WAY TOO LONG";
    const out = parseSections(longUpper + "\nbody");
    expect(out[0].name).toBe("Header / Contact");
  });

  it("produces unique ids per section", () => {
    const out = parseSections(SAMPLE);
    const ids = out.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("diffWords (accept/reject diff rendering)", () => {
  it("marks added words and removed words", () => {
    const parts = diffWords("Led a team", "Led a small focused team");
    const added = parts.filter((p) => p.added).map((p) => p.value.trim()).join(" ");
    const removed = parts.filter((p) => p.removed).map((p) => p.value.trim()).join(" ");
    expect(added).toMatch(/small/);
    expect(added).toMatch(/focused/);
    expect(removed).toBe("");
  });

  it("identical strings produce zero adds/removes", () => {
    const parts = diffWords("same text here", "same text here");
    expect(parts.some((p) => p.added)).toBe(false);
    expect(parts.some((p) => p.removed)).toBe(false);
  });
});
