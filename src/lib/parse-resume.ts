// Client-side resume text extraction. PDF, DOCX, TXT supported.
// Runs in the browser to avoid Cloudflare Worker compat issues.

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PDF_PAGES = 10;
export const ALLOWED_EXTS = [".pdf", ".docx", ".txt"] as const;

export function validateResumeFile(file: File): void {
  const name = file.name.toLowerCase();
  if (!ALLOWED_EXTS.some((ext) => name.endsWith(ext))) {
    throw new Error("Unsupported file type. Upload a PDF, DOCX, or TXT.");
  }
  if (file.size === 0) {
    throw new Error("That file is empty.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_FILE_BYTES / 1024 / 1024} MB.`,
    );
  }
}

export async function extractResumeText(file: File): Promise<string> {
  validateResumeFile(file);
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt")) {
    return await file.text();
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth/mammoth.browser");
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return value;
  }
  if (name.endsWith(".pdf")) {
    const pdfjs: any = await import("pdfjs-dist");
    const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Error(
        `PDF has ${pdf.numPages} pages. Max ${MAX_PDF_PAGES} pages for resume analysis.`,
      );
    }
    let text = "";
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      text += content.items.map((it: any) => it.str).join(" ") + "\n\n";
    }
    return text;
  }
  if (name.endsWith(".doc")) {
    throw new Error("Legacy .doc not supported — please convert to .docx or PDF.");
  }
  throw new Error("Unsupported file type. Use PDF, DOCX, or TXT.");
}
