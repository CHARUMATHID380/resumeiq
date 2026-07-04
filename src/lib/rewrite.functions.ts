import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";

const RewriteInput = z.object({
  sectionName: z.string().min(1).max(80),
  sectionText: z.string().min(5).max(8000),
  action: z.enum(["improve", "quantify", "tailor", "concise", "ats"]),
  targetRole: z.string().max(200).optional(),
});

const SaveVersionInput = z.object({
  sourceResumeId: z.string().uuid(),
  fullText: z.string().min(20).max(60_000),
  label: z.string().max(120).optional(),
});

const ACTION_INSTRUCTIONS: Record<string, string> = {
  improve:
    "Rewrite to be more impactful. Use strong action verbs, the STAR pattern (situation/task/action/result) when relevant, and remove fluff. Preserve all factual claims and the writer's voice.",
  quantify:
    "Rewrite each bullet/sentence to include realistic metrics, scope, and impact (numbers, %, $, time saved, team size, throughput). Only fabricate ranges that are clearly placeholders if no metric exists — wrap them in [brackets] so the user can fill in.",
  tailor:
    "Rewrite to be tailored to the TARGET ROLE provided. Mirror its language and add domain-relevant keywords. Do not invent experience the candidate doesn't already have.",
  concise: "Tighten the writing. Shorter bullets, no redundancy, plain professional tone. Cut 20–35% of words.",
  ats:
    "Rewrite optimized for ATS parsing: clear standard section vocabulary, no tables/columns/emoji/symbols, simple bullets, industry-standard keywords woven naturally.",
};

export const rewriteSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => RewriteInput.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.AI_GATEWAY_KEY;
    if (!key) throw new Error("AI_GATEWAY_KEY not configured");
    const { createAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createAiGatewayProvider(key);

    const system = `You are an elite resume writer. Rewrite the user's resume section per the instruction.

Rules:
- Output ONLY the rewritten section text. No preamble, no explanations, no markdown fences, no headings unless the input had one.
- Preserve overall structure: if the input is bullet points, output bullet points (use "- " or "• "). If prose, output prose.
- Keep names, dates, companies, schools, and technologies factually unchanged.
- Plain text only. No HTML.
- Do not exceed ~25% more length than the original.`;

    const userMsg = [
      `INSTRUCTION: ${ACTION_INSTRUCTIONS[data.action]}`,
      data.targetRole ? `TARGET ROLE: ${data.targetRole}` : null,
      `SECTION NAME: ${data.sectionName}`,
      `ORIGINAL:\n${data.sectionText}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    let result;
    try {
      result = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        prompt: userMsg,
      });
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("429")) throw new Error("AI rate limit reached. Please wait a moment and try again.");
      if (msg.includes("402")) throw new Error("AI credits exhausted. Please add credits in your workspace.");
      throw new Error("AI rewrite failed: " + msg);
    }

    let out = result.text.trim();
    if (out.startsWith("```")) out = out.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
    return { rewritten: out };
  });

export const saveResumeVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SaveVersionInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const sb = supabase as any;
    const { data: source, error: srcErr } = await sb
      .from("resumes")
      .select("filename,version_number")
      .eq("id", data.sourceResumeId)
      .single();
    if (srcErr) throw new Error("Source resume not found");

    const { data: maxRow } = await sb
      .from("resumes")
      .select("version_number")
      .eq("user_id", userId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (maxRow?.version_number ?? source.version_number ?? 0) + 1;

    const { data: row, error } = await sb
      .from("resumes")
      .insert({
        user_id: userId,
        filename: source.filename,
        extracted_text: data.fullText,
        label: data.label || `Edited v${nextVersion}`,
        version_number: nextVersion,
      })
      .select("id")
      .single();
    if (error) throw new Error("Failed to save new version: " + error.message);
    return { resumeId: row.id as string, versionNumber: nextVersion };
  });
