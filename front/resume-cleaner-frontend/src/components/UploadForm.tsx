"use client";

import { useState } from "react";
import { uploadResume } from "../lib/api";

type UploadFormProps = { onUploaded: () => void };

export default function UploadForm({ onUploaded }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async () => {
    if (!file) {
      setError("Please select a file.");
      return;
    }

    const allowedExtensions = [".pdf", ".doc", ".docx"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      setError("Only PDF or DOC/DOCX files are allowed.");
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("resume", file);
      
      // optional job field
      if (job.trim().length > 0) {
        fd.append("job_description", job);
      }
      await uploadResume(fd);

      setFile(null);
      setJob("");
      setSuccess("Resume uploaded successfully!");
      onUploaded();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to upload resume."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white shadow-md rounded-lg p-6 space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 text-center">Upload Resume</h2>

      <div className="flex flex-col space-y-2">
        <label className="text-gray-600 font-medium">Choose a file</label>
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {file && <p className="text-sm text-gray-700">Selected: {file.name}</p>}
      </div>

      <div className="flex flex-col space-y-2">
        <label className="text-gray-600 font-medium">Job description (optional)</label>
        <input
          type="text"
          placeholder="e.g., Software Engineer at XYZ"
          value={job}
          onChange={e => setJob(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-red-600 font-medium">{error}</p>}
      {success && <p className="text-green-600 font-medium">{success}</p>}

      <button
        onClick={submit}
        disabled={loading}
        className={`w-full py-2 px-4 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
          loading ? "opacity-70 cursor-not-allowed" : ""
        }`}
      >
        {loading ? "Uploading..." : "Upload Resume"}
      </button>
    </div>
  );
}
