import express from "express";
import {
  upload,
  getResumesByUser,
  getResumeById,
  uploadResume,
  cleanResume,
  deleteResume,
  exportCleanedPDF, 
} from "../controllers/controller.js";

const router = express.Router();

// GET all resumes
router.get("/", getResumesByUser);

// GET a single resume
router.get("/:id", getResumeById);

// POST upload resume
router.post("/", upload.single("resume"), uploadResume);

// POST clean resume
router.post("/:id/clean", cleanResume);

// GET cleaned PDF
router.get("/:id/export", exportCleanedPDF);

// DELETE resume
router.delete("/:id", deleteResume);

export default router;
