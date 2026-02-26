import fs from "fs"; //creating/ working with directories
import path from "path"; //working with path directories
import multer from "multer"; //handling file-uploads
import mammoth from "mammoth";
import OpenAI from "openai"; //AI-API doing the cleaning
import PDFDocument from "pdfkit";
import sql from "../config/db.js" //my created database
import pdfParseModule from "pdf-parse";

// import { createRequire } from "module";
// const require = createRequire(import.meta.url);

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); //OpenAI api instantiation

// Folders
const UPLOADS_FOLDER = path.join(process.cwd(), "uploads"); //variable for uploaded resumes folder
const CLEANED_FOLDER = path.join(process.cwd(), "cleaned"); //variable for cleaned resumes folder
if (!fs.existsSync(UPLOADS_FOLDER)) fs.mkdirSync(UPLOADS_FOLDER, { recursive: true }); //create the folder if it does not exist in local dir
if (!fs.existsSync(CLEANED_FOLDER)) fs.mkdirSync(CLEANED_FOLDER, { recursive: true }); //create the folder if it does not exist in local dir

// Multer setup
export const upload = multer({
  storage: multer.diskStorage({
    destination: (req, res, cb) =>{
      cb(null, "/uploads"); 
    },
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'); // make an acceptable file name
      cb(null, uniqueName); //accept file name
    },
  }),
  limits: {fileSize: 10*1024*1024},
  fileFilter: (req, file, cb) => { //only for pdfs, word docx/doc and images
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf" || file.mimetype==="application/doc" || file.mimetype==="application/docx") cb(null, true);
    else cb(new Error("Only images or PDFs allowed!"));
  },
});

// Helper to analyse/parse PDF uploaded in uploads folder
async function parsePDF(filePath) {
  try{
    const buffer = await fs.promises.readFile(filePath); //read the specific file
    const pdfData = await pdfParseModule(buffer);
    return pdfData.text || "";
  }catch(err){
    console.log(err);
    res.status(400).json({message:"Error parsing pdf!"})
  }

}

// AI Cleaner- receives prompt and cleans resume
async function aiCleanResume(text) {
  try{
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
  })
  return completion.choices[0].message.content;
  }catch(err){
    console.log(err);
    res.status(400).json({message: "AI service temporarily unavailable"});
  }

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

// GET all resumes by user id
export const getResumesByUser = async (req, res) => {
  try {
    const {user_id}=req.params;
    if (!user_id || isNaN(user_id)) return res.status(404).json({ message: "Invalid UserID" });
    const all_resumes=await sql`
    SELECT * FROM resumes WHERE auth_user_id=${user_id} ORDER BY uploaded_at DESC
    `

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
    `
    if (!resume || resume.length==0) return res.status(404).json({ message: "Resume not found" });
    res.status(200).json(resume[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST upload resume
export const uploadResume = async (req, res) => {
  try {
    const {user_id, description}=req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" }); // if no file is uploaded
    if(!user_id) return res.status(400).json({message: "UserID missing"}); //missing user id
    if(isNaN(user_id)) return res.status(400).json({message: "Invalid User Id"}); //non-integer user id

    const resume= await sql`
    INSERT INTO resumes(auth_user_id, file.originalname, job_description, status)
    VALUES (${user_id}, ${file}, ${description}, 'uploaded')
    RETURNING *
    `
    // const resume = {
    //   id: idCounter++,
    //   original_filename: file.originalname,
    //   filename: file.filename,
    //   status: "uploaded",
    //   uploaded_at: new Date().toISOString(),
    //   raw_text: null,
    //   cleaned_text: null,
    //   cleaned_pdf: null,
    // };
    if(!resume) return res.status(400).json({message: "Resume not uploaded. Record not created"})
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
    const resume = await sql`
    SELECT * FROM resumes WHERE id=${id}
    `
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
