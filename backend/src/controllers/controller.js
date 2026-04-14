import fs from "fs"; //creating/ working with directories
import path from "path"; //working with path directories
import multer from "multer"; //handling file-uploads
import mammoth from "mammoth";
import OpenAI from "openai"; //AI-API doing the cleaning
import PDFDocument from "pdfkit";
import { PDFParse } from "pdf-parse"; //parsing the pdf
import {
  createResumeRecord,
  deleteResumeRecord,
  getResume,
  listResumes,
  updateResumeRecord,
} from "../config/resumeStore.js";

const openAiApiKey = process.env.OPENAI_API_KEY?.trim(); //openai api variable
const client = openAiApiKey ? new OpenAI({ apiKey: openAiApiKey }) : null; //OpenAI api instantiation

// Folders
const UPLOADS_FOLDER = path.join(process.cwd(), "uploads"); //variable for uploaded resumes folder
const CLEANED_FOLDER = path.join(process.cwd(), "cleaned"); //variable for cleaned resumes folder
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER, { recursive: true }); //create the folder if it does not exist in local dir
if (!fs.existsSync(CLEANED_FOLDER)) fs.mkdirSync(CLEANED_FOLDER, { recursive: true }); //create the folder if it does not exist in local dir

// Multer setup - handles file uploads 
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
  limits: { fileSize: 10 * 1024 * 1024 }, //max file size
  fileFilter: (req, file, cb) => { //only for pdfs, word docx/doc and images
    const isSupported = //supported docs- pdfs, word docs, xml files
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
  if (!client || !openAiApiKey) { //error handling
    throw new Error("OPENAI_API_KEY is missing or invalid in backend/.env");
  }

  try {
    //user prompt- detailed- pass the resume text
    const prompt = `
Clean the following resume into a professional, ATS-optimized format.
Improve clarity, formatting, bullet points, and structure.
DO NOT add fake information.

Resume:
${text}
`;
    //then run  both through the ai api
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are an expert resume writer." }, //cleaner prompt
        { role: "user", content: prompt }, //user prompt
      ],
      temperature: 0.5, //changes not too creative nor bland
    });

    return completion.choices[0]?.message?.content?.trim() || ""; 
  } catch (err) {
    console.log(err);
    throw new Error("AI service temporarily unavailable");
  }
}

// Export to PDF- from the cleaned folder
function exportToPDF(text, filename) {
  const pdfPath = path.join(CLEANED_FOLDER, filename); //absolute path generation
  const doc = new PDFDocument(); //document to be exported
  doc.pipe(fs.createWriteStream(pdfPath));
  text.split("\n").forEach((line) => doc.text(line, { lineGap: 3 })); //convert to readable pdf
  doc.end();
  return pdfPath;
}

// GET all resumes by user id
export const getResumesByUser = async (req, res) => {
  try {
    const { user_id } = req.query; 
    const all_resumes = await listResumes(user_id);
    res.status(200).json(all_resumes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET single resume by resume id
export const getResumeById = async (req, res) => {
  try {
    const id = parseInt(req.params.id); //per id
    if (!id) return res.status(404).json({ message: "Invalid ID" });
    const resume = await getResume(id);
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
    const { user_id = "demo-user", job_description = "" } = req.body; //dummy id- will implement user auth later
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" }); // if no file is uploaded

    const resume = await createResumeRecord({ //to be recorded on the data base
      auth_user_id: user_id,
      original_filename: file.originalname,
      stored_filename: file.filename,
      file_type: file.mimetype,
      job_description,
    });
    if (!resume) return res.status(400).json({ message: "Resume not uploaded. Record not created" });
    console.log(resume);
    res.status(201).json(resume);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Error Uploading file" });
  }
};

// POST clean resume- send to api
export const cleanResume = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const resume = await getResume(id);
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    const filePath = path.join(UPLOADS_FOLDER, resume.stored_filename);
    if (!fs.existsSync(filePath)) return res.status(400).json({ message: "Resume file not found" });

    let extractedText = ""; //stored cleaned contents

    if (resume.stored_filename.toLowerCase().endsWith(".pdf")) {
      extractedText = await parsePDF(filePath); //parse if pdf
    } else if (resume.stored_filename.toLowerCase().endsWith(".docx") || resume.stored_filename.toLowerCase().endsWith(".doc")) {
      const result = await mammoth.extractRawText({ path: filePath }); //mamoth for docx
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

    const updated = await updateResumeRecord(id, {
      raw_text: rawText,
      cleaned_text: cleanedText,
      cleaned_pdf: cleanedPdfPath,
      status: "completed",
    });

    res.status(200).json(updated);
  } catch (err) {
    console.error("CLEAN ERROR:", err);
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// DELETE resume
export const deleteResume = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const resume = await getResume(id);
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    if (resume.stored_filename && fs.existsSync(path.join(UPLOADS_FOLDER, resume.stored_filename))) {
      fs.unlinkSync(path.join(UPLOADS_FOLDER, resume.stored_filename));
    }
    if (resume.cleaned_pdf && fs.existsSync(resume.cleaned_pdf)) fs.unlinkSync(resume.cleaned_pdf);

    await deleteResumeRecord(id);
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
    const resume = await getResume(id); //get resume
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
