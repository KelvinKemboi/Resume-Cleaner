"use client";

import { useCallback, useEffect, useState } from "react";
import { FileStack, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import Navbar from "./Navbar";
import UploadForm from "./UploadForm";
import ResumeCard from "./ResumeCard";
import { getResumes, type Resume } from "../lib/api";

type LoadState = "loading" | "ready" | "error";

export default function Home() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  const fetchResumes = useCallback(async () => {
    setLoadState("loading");
    try {
      const data = await getResumes();
      setResumes(data);
      setLoadState("ready");
    } catch (err) {
      console.error(err);
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    // Deliberate fetch-on-mount, not a derived-state effect - the rule's
    // cascading-render concern doesn't apply to a one-time initial load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchResumes();
  }, [fetchResumes]);

  const addUploadedResume = (resume: Resume) => {
    setResumes((current) => [resume, ...current.filter((existing) => existing.id !== resume.id)]);
    setLoadState("ready");
  };

  const patchResume = (updated: Resume) => {
    setResumes((current) => current.map((r) => (r.id === updated.id ? updated : r)));
  };

  const removeResume = (id: number) => {
    setResumes((current) => current.filter((r) => r.id !== id));
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <section className="mb-10 text-center sm:mb-14">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
            Turn your resume into an ATS-ready standout
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-balance text-sm text-neutral-600 dark:text-neutral-400 sm:text-base">
            Upload a PDF or Word resume, optionally point it at a target role, and let AI rewrite it with cleaner
            structure and stronger phrasing - then export the result as a polished PDF.
          </p>
        </section>

        <UploadForm onUploaded={addUploadedResume} />

        <section className="mt-10 sm:mt-14">
          <div className="mb-4 flex items-center gap-2">
            <FileStack className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Your resumes
            </h2>
          </div>

          {loadState === "loading" && (
            <div className="space-y-4" aria-busy="true" aria-label="Loading your resumes">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl border border-black/5 bg-white/60 dark:border-white/10 dark:bg-neutral-900/60"
                />
              ))}
            </div>
          )}

          {loadState === "error" && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-500/20 bg-red-50 px-6 py-10 text-center dark:border-red-400/20 dark:bg-red-950/30">
              <TriangleAlert className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Couldn&apos;t load your resumes. Check that the backend is running and try again.
              </p>
              <button
                type="button"
                onClick={fetchResumes}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry
              </button>
            </div>
          )}

          {loadState === "ready" && resumes.length === 0 && (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white/40 px-6 py-12 text-center dark:border-white/10 dark:bg-neutral-900/40">
              <FileStack className="mx-auto h-8 w-8 text-neutral-400" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">No resumes yet</p>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
                Upload one above to get started.
              </p>
            </div>
          )}

          {loadState === "ready" && resumes.length > 0 && (
            <div className="space-y-4">
              {resumes.map((r) => (
                <ResumeCard key={r.id} resume={r} onCleaned={patchResume} onDeleted={removeResume} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-black/5 py-6 dark:border-white/10">
        <p className="mx-auto flex max-w-4xl items-center justify-center gap-1.5 px-4 text-center text-xs text-neutral-500 dark:text-neutral-500">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Your resumes are tied to this browser session only - not shared with other visitors.
        </p>
      </footer>
    </div>
  );
}
