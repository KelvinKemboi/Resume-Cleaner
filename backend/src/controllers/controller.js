import fs from "fs"; //creating/ working with directories
import path from "path"; //working with path directories
import multer from "multer"; //handling file-uploads
import mammoth from "mammoth";
import OpenAI from "openai"; //AI-API doing the cleaning
import PDFDocument from "pdfkit";
import sql from "../config/db.js"; // database
import { PDFParse } from "pdf-parse";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); //OpenAI api instantiation

// Folders
const UPLOADS_FOLDER = path.join(process.cwd(), "uploads"); //variable for uploaded resumes folder
const CLEANED_FOLDER = path.join(process.cwd(), "cleaned"); //variable for cleaned resumes folder
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER, { recursive: true }); //create the folder if it does not exist in local dir
if (!fs.existsSync(CLEANED_FOLDER)) fs.mkdirSync(CLEANED_FOLDER, { recursive: true }); //create the folder if it does not exist in local dir

// Multer setup
export const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOADS_FOLDER);
    },
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_"); // make an acceptable file name
      cb(null, uniqueName); //accept file name
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => { //only for pdfs, word docx/doc and images
    const isSupported =
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/msword" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (isSupported) cb(null, true);
    else cb(new Error("Only PDF or Word documents are allowed."));
  },
});

// Helper to analyse/parse PDF uploaded in uploads folder
async function parsePDF(filePath) {
  try {
    const buffer = await fs.promises.readFile(filePath); //read the specific file
    const parser = new PDFParse({ data: buffer });
    const pdfData = await parser.getText();
    await parser.destroy();
    if (!pdfData.text?.trim()) throw new Error("Resume is empty"); //shows this if blank document is being parsed.
    return pdfData.text; //returns raw parsed text or "" if empty
  } catch (err) {
    console.log(err);
    throw new Error("Error parsing PDF");
  }
}

// AI Cleaner- receives prompt and cleans resume
async function aiCleanResume(text) {
  try {
    //user prompt
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
        { role: "system", content: "You are an expert resume writer." }, //cleaner prompt
        { role: "user", content: prompt }, //user prompt
      ],
      temperature: 0.5, //not too creative nor bland
    });

    return completion.choices[0]?.message?.content?.trim() || "";
  } catch (err) {
    console.log(err);
    throw new Error("AI service temporarily unavailable");
  }
}

// Export to PDF- from the cleaned folder
function exportToPDF(text, filename) {
  const pdfPath = path.join(CLEANED_FOLDER, filename);
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(pdfPath));
  text.split("\n").forEach((line) => doc.text(line, { lineGap: 3 }));
  doc.end();
  return pdfPath;
}

// GET all resumes by user id
export const getResumesByUser = async (req, res) => {
  try {
    const { user_id } = req.query;
    let all_resumes;

    if (user_id) {
      all_resumes = await sql`
        SELECT * FROM resumes WHERE auth_user_id = ${String(user_id)} ORDER BY uploaded_at DESC
      `;
    } else {
      all_resumes = await sql`
        SELECT * FROM resumes ORDER BY uploaded_at DESC
      `;
    }
    res.status(200).json(all_resumes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET single resume by resume id
export const getResumeById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(404).json({ message: "Invalid ID" });
    const resume = await sql`
      SELECT * FROM resumes WHERE id=${id}
    `;
    if (!resume || resume.length == 0) return res.status(404).json({ message: "Resume not found" });
    res.status(200).json(resume[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST upload resume
export const uploadResume = async (req, res) => {
  try {
    const { user_id = "demo-user", job_description = "" } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" }); // if no file is uploaded

    const resume = await sql`
      INSERT INTO resumes (
        auth_user_id,
        original_filename,
        stored_filename,
        file_type,
        job_description,
        status
      )
      VALUES (
        ${String(user_id)},
        ${file.originalname},
        ${file.filename},
        ${file.mimetype},
        ${job_description},
        'uploaded'
      )
      RETURNING *
    `;
    if (!resume || resume.length === 0) return res.status(400).json({ message: "Resume not uploaded. Record not created" });
    console.log(resume);
    res.status(201).json(resume[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error Uploading file" });
  }
};

// POST clean resume
export const cleanResume = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await sql`
      SELECT * FROM resumes WHERE id=${id}
    `;
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Resume not found" });
    const resume = rows[0];

    const filePath = path.join(UPLOADS_FOLDER, resume.stored_filename);
    if (!fs.existsSync(filePath)) return res.status(400).json({ message: "Resume file not found" });

    let extractedText = "";

    if (resume.stored_filename.toLowerCase().endsWith(".pdf")) {
      extractedText = await parsePDF(filePath);
    } else if (resume.stored_filename.toLowerCase().endsWith(".docx") || resume.stored_filename.toLowerCase().endsWith(".doc")) {
      const result = await mammoth.extractRawText({ path: filePath });
      extractedText = result.value || "";
    } else {
      return res.status(400).json({ message: "Unsupported file format" });
    }

    const rawText = extractedText.trim();

    // AI cleaning
    const cleanedText = await aiCleanResume(extractedText);

    // Export PDF
    const cleanPdfName = `${resume.id}-cleaned.pdf`;
    const cleanedPdfPath = exportToPDF(cleanedText, cleanPdfName);

    const updated = await sql`
      UPDATE resumes
      SET
        raw_text = ${rawText},
        cleaned_text = ${cleanedText},
        cleaned_pdf = ${cleanedPdfPath},
        status = 'completed'
      WHERE id = ${id}
      RETURNING *
    `;

    res.status(200).json(updated[0]);
  } catch (err) {
    console.error("CLEAN ERROR:", err);
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// DELETE resume
export const deleteResume = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await sql`
      SELECT * FROM resumes WHERE id = ${id}
    `;
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Resume not found" });
    const resume = rows[0];

    if (resume.stored_filename && fs.existsSync(path.join(UPLOADS_FOLDER, resume.stored_filename))) {
      fs.unlinkSync(path.join(UPLOADS_FOLDER, resume.stored_filename));
    }
    if (resume.cleaned_pdf && fs.existsSync(resume.cleaned_pdf)) fs.unlinkSync(resume.cleaned_pdf);

    await sql`
      DELETE FROM resumes WHERE id = ${id}
    `;
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
    const rows = await sql`
      SELECT * FROM resumes WHERE id = ${id}
    `;
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Resume not found" });
    const resume = rows[0];

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
