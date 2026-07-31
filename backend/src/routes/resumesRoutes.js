import express from "express";
import {
  getResumesByUser,
  getResumeById,
  handleUploadErrors,
  uploadResume,
  cleanResume,
  deleteResume,
  exportCleanedPDF,
} from "../controllers/controller.js"; //imports
import strictLimiter from "../middleware/strictLimiter.js";

const router = express.Router();

// GET all resumes
router.get("/", getResumesByUser);

// GET a single resume
router.get("/:id", getResumeById);

// POST upload resume
router.post("/", strictLimiter, handleUploadErrors, uploadResume);

// POST clean resume
router.post("/:id/clean", strictLimiter, cleanResume);

// GET cleaned PDF
router.get("/:id/export", exportCleanedPDF);

// DELETE resume
router.delete("/:id", deleteResume);

export default router;
