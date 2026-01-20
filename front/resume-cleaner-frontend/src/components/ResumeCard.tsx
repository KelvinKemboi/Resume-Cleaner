"use client";

import { useState } from "react";
import { cleanResume, deleteResume } from "../lib/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

type Resume = {
  id: number;
  original_filename: string;
  status: string;
  cleaned_text?: string | null;
};

type Props = {
  resume: Resume;
  onUpdated: () => void;
};

export default function ResumeCard({ resume, onUpdated }: Props) {
  const [loadingClean, setLoadingClean] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [cleanedText, setCleanedText] = useState(resume.cleaned_text || null);

  const handleClean = async () => {
    setLoadingClean(true);
    try {
      const updated = await cleanResume(resume.id);
      setCleanedText(updated.cleaned_text);
      onUpdated();
    } catch {
      alert("Failed to clean resume");
    } finally {
      setLoadingClean(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this resume?")) return;
    setLoadingDelete(true);
    try {
      await deleteResume(resume.id);
      onUpdated();
    } catch {
      alert("Failed to delete resume");
    } finally {
      setLoadingDelete(false);
    }
  };

  const handleExportPDF = () => {
    if (!resume.cleaned_text) return;
    window.open(`${BACKEND_URL}/resumes/${resume.id}/export`, "_blank");
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-5 mb-6 border border-gray-200 hover:shadow-xl transition">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg text-gray-800">{resume.original_filename}</h3>
          <p className="text-xs text-gray-500 mt-1">{resume.status}</p>
        </div>
      </div>

      {cleanedText && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-blue-600 text-sm font-medium hover:underline"
          >
            {expanded ? "Hide cleaned text" : "Show cleaned text"}
          </button>

          {expanded && (
            <pre className="mt-2 max-h-64 overflow-auto bg-gray-50 p-3 rounded-lg text-sm text-gray-700 whitespace-pre-wrap border border-gray-200">
              {cleanedText}
            </pre>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-4">
        {!cleanedText && (
          <button
            onClick={handleClean}
            disabled={loadingClean}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition"
          >
            {loadingClean ? "Cleaning..." : "Clean"}
          </button>
        )}

        {cleanedText && (
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
          >
            Download PDF
          </button>
        )}

        <button
          onClick={handleDelete}
          disabled={loadingDelete}
          className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed transition"
        >
          {loadingDelete ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
