"use client";

import { useState } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, Download, Loader2, Sparkles, Trash2 } from "lucide-react";
import { cleanResume, deleteResume, exportResume, type Resume } from "../lib/api";
import { useToast } from "./ToastProvider";
import ConfirmDialog from "./ConfirmDialog";

type Props = {
  resume: Resume;
  onCleaned: (resume: Resume) => void;
  onDeleted: (id: number) => void;
};

const STATUS_STYLES: Record<string, string> = {
  completed:
    "bg-emerald-50 text-emerald-700 border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-400/20",
  uploaded:
    "bg-blue-50 text-blue-700 border-blue-500/30 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-400/20",
  pending:
    "bg-amber-50 text-amber-700 border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-400/20",
};

function statusStyle(status: string) {
  return (
    STATUS_STYLES[status] ??
    "bg-neutral-100 text-neutral-600 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700"
  );
}

export default function ResumeCard({ resume, onCleaned, onDeleted }: Props) {
  const [loadingClean, setLoadingClean] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { showToast } = useToast();
  const cleanedText = resume.cleaned_text;

  const handleClean = async () => {
    setLoadingClean(true);
    try {
      const updated = await cleanResume(resume.id);
      onCleaned(updated);
      showToast("Resume cleaned successfully.", "success");
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : "Failed to clean resume.", "error");
    } finally {
      setLoadingClean(false);
    }
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    setLoadingDelete(true);
    try {
      await deleteResume(resume.id);
      onDeleted(resume.id);
      showToast("Resume deleted.", "success");
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : "Failed to delete resume.", "error");
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <div className="rounded-2xl border border-black/5 bg-white/80 p-5 shadow-sm backdrop-blur transition hover:shadow-md dark:border-white/10 dark:bg-neutral-900/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">{resume.original_filename}</h3>
          <span
            className={`mt-1.5 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusStyle(
              resume.status
            )}`}
          >
            {resume.status}
          </span>
        </div>
      </div>

      {cleanedText && (
        <Accordion.Root type="single" collapsible className="mt-3">
          <Accordion.Item value="cleaned-text">
            <Accordion.Header>
              <Accordion.Trigger className="group flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                <ChevronDown
                  className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
                Show cleaned text
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="overflow-hidden data-[state=open]:animate-[fadeIn_0.15s_ease-out]">
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-black/5 bg-neutral-50 p-3 text-sm text-neutral-700 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-300">
                {cleanedText}
              </pre>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
      )}

      <div className="mt-4 flex flex-wrap gap-2.5">
        {!cleanedText && (
          <button
            type="button"
            onClick={handleClean}
            disabled={loadingClean}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loadingClean ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            {loadingClean ? "Cleaning..." : "Clean"}
          </button>
        )}

        {cleanedText && (
          <button
            type="button"
            onClick={() => exportResume(resume.id)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download PDF
          </button>
        )}

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={loadingDelete}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-70 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          {loadingDelete ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          )}
          {loadingDelete ? "Deleting..." : "Delete"}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this resume?"
        description={`"${resume.original_filename}" and its cleaned version (if any) will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
