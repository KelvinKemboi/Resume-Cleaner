import fs from "fs";
import path from "path";
import multer from "multer";
import mammoth from "mammoth";
import OpenAI from "openai";
import PDFDocument from "pdfkit";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// In-memory DB
let resumesDB = [];
let idCounter = 1;

// Folders
const UPLOADS_FOLDER = path.join(process.cwd(), "uploads");
const CLEANED_FOLDER = path.join(process.cwd(), "cleaned");
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });
if (!fs.existsSync(CLEANED_FOLDER)) fs.mkdirSync(CLEANED_FOLDER, { recursive: true });

// Multer setup
export const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_FOLDER),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
  }),
});

// Helper to parse PDF
async function parsePDF(filePath) {
  const buffer = fs.readFileSync(filePath);
  const pdfData = await pdfParseModule(buffer);
  return pdfData.text || "";
}

// AI Cleaner
async function aiCleanResume(text) {
  const prompt = `
Clean the following resume into a professional, ATS-optimized format.
Improve clarity, formatting, bullet points, and structure.
DO NOT add fake information.

Resume:
${text}
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: "You are an expert resume writer." },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });

  return completion.choices[0].message.content;
}

// Export to PDF
function exportToPDF(text, filename) {
  const pdfPath = path.join(CLEANED_FOLDER, filename);
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(pdfPath));
  text.split("\n").forEach((line) => doc.text(line, { lineGap: 3 }));
  doc.end();
  return pdfPath;
}

// GET all resumes
export const getResumesByUser = async (req, res) => {
  try {
    res.status(200).json(resumesDB);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET single resume
export const getResumeById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const resume = resumesDB.find((r) => r.id === id);
    if (!resume) return res.status(404).json({ message: "Resume not found" });
    res.status(200).json(resume);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST upload resume
export const uploadResume = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });

    const resume = {
      id: idCounter++,
      original_filename: file.originalname,
      filename: file.filename,
      status: "uploaded",
      uploaded_at: new Date().toISOString(),
      raw_text: null,
      cleaned_text: null,
      cleaned_pdf: null,
    };

    resumesDB.push(resume);
    res.status(201).json(resume);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST clean resume
export const cleanResume = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const resume = resumesDB.find((r) => r.id === id);
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    const filePath = path.join(UPLOADS_FOLDER, resume.filename);
    if (!fs.existsSync(filePath)) return res.status(400).json({ message: "Resume file not found" });

    let extractedText = "";

    if (resume.filename.toLowerCase().endsWith(".pdf")) {
      extractedText = await parsePDF(filePath);
    } else if (resume.filename.toLowerCase().endsWith(".docx") || resume.filename.toLowerCase().endsWith(".doc")) {
      const result = await mammoth.extractRawText({ path: filePath });
      extractedText = result.value || "";
    } else {
      return res.status(400).json({ message: "Unsupported file format" });
    }

    resume.raw_text = extractedText.trim();

    // AI cleaning
    const cleanedText = await aiCleanResume(extractedText);
    resume.cleaned_text = cleanedText;

    // Export PDF
    const cleanPdfName = `${resume.id}-cleaned.pdf`;
    resume.cleaned_pdf = exportToPDF(cleanedText, cleanPdfName);
    resume.status = "completed";

    res.status(200).json(resume);
  } catch (err) {
    console.error("CLEAN ERROR:", err);
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// DELETE resume
export const deleteResume = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = resumesDB.findIndex((r) => r.id === id);
    if (index === -1) return res.status(404).json({ message: "Resume not found" });

    const resume = resumesDB[index];

    if (fs.existsSync(path.join(UPLOADS_FOLDER, resume.filename))) fs.unlinkSync(path.join(UPLOADS_FOLDER, resume.filename));
    if (resume.cleaned_pdf && fs.existsSync(resume.cleaned_pdf)) fs.unlinkSync(resume.cleaned_pdf);

    resumesDB.splice(index, 1);
    res.status(200).json({ message: "Resume deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET cleaned PDF
export const exportCleanedPDF = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const resume = resumesDB.find((r) => r.id === id);
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    if (!resume.cleaned_pdf || !fs.existsSync(resume.cleaned_pdf))
      return res.status(400).json({ message: "PDF not found" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${path.basename(resume.cleaned_pdf)}`);
    fs.createReadStream(resume.cleaned_pdf).pipe(res);
  } catch (err) {
    console.error("EXPORT ERROR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
