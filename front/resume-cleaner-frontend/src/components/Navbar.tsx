import { FileCheck2, ShieldCheck } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-neutral-950/70">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <FileCheck2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-base font-semibold leading-none text-neutral-900 dark:text-neutral-50">
              Resume Cleaner
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">AI-polished, ATS-ready resumes</p>
          </div>
        </div>
        <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-950/50 dark:text-emerald-300 sm:flex">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Private to your session
        </div>
      </div>
    </header>
  );
}
