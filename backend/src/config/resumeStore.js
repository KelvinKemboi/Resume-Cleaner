import fs from "fs";
import path from "path";
import sql, { isDatabaseAvailable } from "./db.js";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "resumes.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf8");
}

function readLocalResumes() {
  ensureStore();
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function writeLocalResumes(resumes) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(resumes, null, 2), "utf8");
}

function sortNewestFirst(resumes) {
  return [...resumes].sort(
    (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
  );
}

function nextLocalId(resumes) {
  return resumes.reduce((max, resume) => Math.max(max, Number(resume.id) || 0), 0) + 1;
}

export async function listResumes(userId) {
  if (isDatabaseAvailable()) {
    if (userId) {
      return await sql`
        SELECT * FROM resumes WHERE auth_user_id = ${String(userId)} ORDER BY uploaded_at DESC
      `;
    }

    return await sql`
      SELECT * FROM resumes ORDER BY uploaded_at DESC
    `;
  }

  const resumes = readLocalResumes();
  const filtered = userId
    ? resumes.filter((resume) => resume.auth_user_id === String(userId))
    : resumes;
  return sortNewestFirst(filtered);
}

export async function getResume(id) {
  if (isDatabaseAvailable()) {
    const rows = await sql`
      SELECT * FROM resumes WHERE id = ${id}
    `;
    return rows[0] ?? null;
  }

  const resumes = readLocalResumes();
  return resumes.find((resume) => Number(resume.id) === Number(id)) ?? null;
}

export async function createResumeRecord({
  auth_user_id,
  original_filename,
  stored_filename,
  file_type,
  job_description,
}) {
  if (isDatabaseAvailable()) {
    const rows = await sql`
      INSERT INTO resumes (
        auth_user_id,
        original_filename,
        stored_filename,
        file_type,
        job_description,
        status
      )
      VALUES (
        ${String(auth_user_id)},
        ${original_filename},
        ${stored_filename},
        ${file_type},
        ${job_description},
        'uploaded'
      )
      RETURNING *
    `;
    return rows[0] ?? null;
  }

  const resumes = readLocalResumes();
  const record = {
    id: nextLocalId(resumes),
    auth_user_id: String(auth_user_id),
    original_filename,
    stored_filename,
    file_type,
    uploaded_at: new Date().toISOString(),
    raw_text: null,
    cleaned_text: null,
    cleaned_pdf: null,
    job_description,
    status: "uploaded",
  };
  resumes.push(record);
  writeLocalResumes(resumes);
  return record;
}

export async function updateResumeRecord(id, updates) {
  if (isDatabaseAvailable()) {
    const rows = await sql`
      UPDATE resumes
      SET
        raw_text = ${updates.raw_text ?? null},
        cleaned_text = ${updates.cleaned_text ?? null},
        cleaned_pdf = ${updates.cleaned_pdf ?? null},
        status = ${updates.status ?? "uploaded"}
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0] ?? null;
  }

  const resumes = readLocalResumes();
  const index = resumes.findIndex((resume) => Number(resume.id) === Number(id));
  if (index === -1) return null;

  resumes[index] = {
    ...resumes[index],
    ...updates,
  };
  writeLocalResumes(resumes);
  return resumes[index];
}

export async function deleteResumeRecord(id) {
  if (isDatabaseAvailable()) {
    await sql`
      DELETE FROM resumes WHERE id = ${id}
    `;
    return;
  }

  const resumes = readLocalResumes();
  const filtered = resumes.filter((resume) => Number(resume.id) !== Number(id));
  writeLocalResumes(filtered);
}
