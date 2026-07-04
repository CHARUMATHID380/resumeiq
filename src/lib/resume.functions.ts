import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";

const AnalyzeInput = z.object({
  resumeId: z.string().uuid(),
  text: z.string().min(50).max(50_000),
  targetRole: z.string().max(200).optional(),
  jobDescription: z.string().max(20_000).optional(),
});

const PublicAnalyzeInput = z.object({
  text: z.string().min(50).max(50_000),
  targetRole: z.string().max(200).optional(),
  jobDescription: z.string().max(20_000).optional(),
});

async function runAnalysis(text: string, targetRole?: string, jobDescription?: string) {
  const key = process.env.AI_GATEWAY_KEY;
  if (!key) throw new Error("AI_GATEWAY_KEY not configured");
  const { createAiGatewayProvider } = await import("./ai-gateway.server");
  const gateway = createAiGatewayProvider(key);
  const parts: string[] = [];
  if (targetRole) parts.push(`TARGET ROLE: ${targetRole}`);
  if (jobDescription) parts.push(`JOB DESCRIPTION:\n${jobDescription}`);
  parts.push(`RESUME:\n${text}`);
  const userMsg = parts.join("\n\n");
  const currentDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const currentYear = new Date().getFullYear();
  const dateContext = `IMPORTANT CONTEXT: Today is ${currentDate}. Current year is ${currentYear}. Any resume dates in ${currentYear} or earlier are NOT future dates. Only flag dates after ${currentYear} as invalid.`;
  let result;
  try {
    result = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: `${dateContext}\n\n${SYSTEM_PROMPT}`,
      prompt: userMsg,
    });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes("429")) throw new Error("AI rate limit reached. Please wait a moment and try again.");
    if (msg.includes("402")) throw new Error("AI credits exhausted. Please add credits in your workspace.");
    throw new Error("AI analysis failed: " + msg);
  }
  let raw = result.text.trim();
  if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("AI returned invalid JSON");
    return JSON.parse(m[0]);
  }
}

export const analyzeResumePublic = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PublicAnalyzeInput.parse(data))
  .handler(async ({ data }) => {
    const parsed = await runAnalysis(data.text, data.targetRole, data.jobDescription);
    return { analysis: parsed };
  });

const SYSTEM_PROMPT = `You are an expert resume reviewer and ATS analyst with deep knowledge across all professional domains (tech, finance, healthcare, legal, marketing, design, operations, education, etc.).

Analyze the provided resume and respond ONLY with a single valid JSON object — no markdown, no code fences, no preamble. The JSON must match this shape exactly:

{
  "ats_score": <0-100 integer>,
  "detected_domain": "<short string e.g. Software Engineering, Finance, Healthcare>",
  "section_scores": {
    "contact": <0-100>, "summary": <0-100>, "experience": <0-100>,
    "skills": <0-100>, "education": <0-100>, "certifications": <0-100>,
    "keywords": <0-100>, "formatting": <0-100>, "grammar": <0-100>
  },
  "section_notes": {
    "contact": "<one-line verdict>", "summary": "<one-line>", "experience": "<one-line>",
    "skills": "<one-line>", "education": "<one-line>", "certifications": "<one-line>",
    "keywords": "<one-line>", "formatting": "<one-line>", "grammar": "<one-line>"
  },
  "keywords_found": [<up to 20 strings>],
  "keywords_missing": [<up to 20 strings relevant to detected_domain>],
  "suggestions": [
    { "section": "<name>", "issue": "<specific>", "why": "<why it matters for ATS>", "fix": "<actionable>", "priority": "CRITICAL"|"IMPORTANT"|"NICE_TO_HAVE" }
  ],
  "job_roles": [
    { "title": "<role>", "match_pct": <0-100>, "why": "<short>", "skill_gaps": [<strings>], "salary_range": "<approx range>" }
  ],
  "courses": [
    { "name": "<course>", "platform": "<Coursera|Udemy|edX|LinkedIn Learning|Google|YouTube|other>", "skill": "<skill addressed>", "duration": "<e.g. 4 weeks>", "level": "Beginner"|"Intermediate"|"Advanced", "url": "<https direct link>" }
  ],
  "weaknesses": [<3-7 strings: concrete, specific weaknesses in the resume that reduce its ATS score>],
  "jd_match": {
    "match_score": <0-100 integer overall fit vs the JOB DESCRIPTION; null if no JD provided>,
    "verdict": "<1-2 sentence overall assessment of fit>",
    "matched_skills": [<skills present in both resume and JD>],
    "missing_skills": [<required skills from JD missing in resume>],
    "matched_experience": [<experience/qualifications from JD the resume satisfies>],
    "experience_gaps": [<experience/qualifications from JD the resume does not satisfy>],
    "improvements": [<3-6 concrete edits to better align resume to the JD>]
  }
}

If no JOB DESCRIPTION is provided, set "jd_match" to null.
Provide 6-10 suggestions, 8 job_roles, 8 courses. Be specific and tailored to the resume's actual content and detected_domain.`;

export const analyzeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => AnalyzeInput.parse(data))
  .handler(async ({ data, context }) => {
    const parsed = await runAnalysis(data.text, data.targetRole, data.jobDescription);
    const { supabase, userId } = context;
    const { data: row, error } = await (supabase as any)
      .from("analyses")
      .insert({
        resume_id: data.resumeId,
        user_id: userId,
        ats_score: parsed.ats_score ?? null,
        section_scores: parsed.section_scores ?? null,
        keywords_found: parsed.keywords_found ?? [],
        keywords_missing: parsed.keywords_missing ?? [],
        suggestions: parsed.suggestions ?? [],
        job_roles: parsed.job_roles ?? [],
        courses: parsed.courses ?? [],
        rewritten_sections: { section_notes: parsed.section_notes ?? {}, detected_domain: parsed.detected_domain ?? null, weaknesses: parsed.weaknesses ?? [], jd_match: parsed.jd_match ?? null },
      })
      .select("id")
      .single();
    if (error) throw new Error("Failed to save analysis: " + error.message);
    return { analysisId: row.id as string };
  });
