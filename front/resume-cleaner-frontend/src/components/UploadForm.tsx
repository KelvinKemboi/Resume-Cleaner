"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { uploadResume, type Resume } from "../lib/api";
import { useToast } from "./ToastProvider";

// Parent passes this callback so the resume list can update after a successful upload.
type UploadFormProps = { onUploaded: (resume: Resume) => void };

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_JOB_DESCRIPTION_LENGTH = 2000;

function getExtension(name: string) {
  return name.slice(name.lastIndexOf(".")).toLowerCase();
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadForm({ onUploaded }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const fileInputId = useId();
  const jobFieldId = useId();

  const pickFile = (candidate: File | null) => {
    if (!candidate) return;
    const ext = getExtension(candidate.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      showToast("Only PDF or DOC/DOCX files are allowed.", "error");
      return;
    }
    setFile(candidate);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    pickFile(e.dataTransfer.files?.[0] ?? null);
  };

  const submit = async () => {
    if (!file) {
      showToast("Please select a file first.", "error");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const fd = new FormData();
      fd.append("resume", file);
      if (job.trim().length > 0) {
        fd.append("job_description", job.trim());
      }
      const uploaded = await uploadResume(fd, setUploadProgress);

      setFile(null);
      setJob("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      showToast("Resume uploaded successfully.", "success");
      onUploaded(uploaded);
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : "Failed to upload resume.", "error");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5 rounded-2xl border border-black/5 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-neutral-900/80">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Upload your resume</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">PDF, DOC, or DOCX - up to 10 MB.</p>
      </div>

      <div>
        <label htmlFor={fileInputId} className="sr-only">
          Choose a resume file
        </label>
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(",")}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="sr-only"
        />

        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
              : "border-black/15 hover:border-blue-400 dark:border-white/15 dark:hover:border-blue-400"
          }`}
        >
          {file ? (
            <>
              <FileText className="h-7 w-7 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{file.name}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500">{formatFileSize(file.size)}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Remove
              </button>
            </>
          ) : (
            <>
              <UploadCloud className="h-7 w-7 text-neutral-400" aria-hidden="true" />
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Drag & drop your resume, or click to browse
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500">.pdf, .doc, .docx</p>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor={jobFieldId} className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Target role (optional)
          </label>
          <span className="text-xs text-neutral-400">
            {job.length}/{MAX_JOB_DESCRIPTION_LENGTH}
          </span>
        </div>
        <textarea
          id={jobFieldId}
          rows={2}
          placeholder="e.g. Software Engineer role focused on backend systems at a fintech company"
          value={job}
          maxLength={MAX_JOB_DESCRIPTION_LENGTH}
          onChange={(e) => setJob(e.target.value)}
          className="resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-100"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          Used to prioritize relevant experience when cleaning - never to invent new experience.
        </p>
      </div>

      {loading && uploadProgress > 0 && (
        <div className="space-y-1" aria-live="polite">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-500">{uploadProgress}% uploaded</p>
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className={`flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          loading ? "cursor-not-allowed opacity-70" : ""
        }`}
      >
        <UploadCloud className="h-4 w-4" aria-hidden="true" />
        {loading ? "Uploading..." : "Upload Resume"}
      </button>
    </div>
  );
}
