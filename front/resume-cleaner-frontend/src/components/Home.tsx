"use client";

import { useEffect, useState } from "react";
import UploadForm from "./UploadForm";
import ResumeCard from "./ResumeCard";
import { getResumes, type Resume } from "../lib/api";

export default function Home() {
  const [resumes, setResumes] = useState<Resume[]>([]); //usestate for resumes

  //helper function to fetch resumes
  const fetchResumes = async () => {
    const data = await getResumes();
    setResumes(data);
  };
  //fetch resumes from backend
  useEffect(() => {
    fetchResumes();
  }, []);

  const addUploadedResume = (resume: Resume) => {
    setResumes((current) => [
      resume,
      ...current.filter((existing) => existing.id !== resume.id),
    ]);
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">AI Resume Cleaner</h1>
      <UploadForm onUploaded={addUploadedResume} />
      <div className="mt-4">
        {resumes.map((r) => (
          <ResumeCard key={r.id} resume={r} onUpdated={fetchResumes} />
        ))}
      </div>
    </div>
  );
}
