import sql, { isDatabaseAvailable } from "./db.js"; //import sql db from db.js

//helper function to check if data base is avaible
function assertDatabaseAvailable() {
  if (!isDatabaseAvailable()) {
    throw new Error("Neon database is not available. Check backend/.env DATABASE_URL.");
  }
}

//list stored resumes
export async function listResumes(userId) {
  assertDatabaseAvailable(); 

  //fetch all resumes/data by id
  if (userId) {
    return await sql`
      SELECT * FROM resumes WHERE auth_user_id = ${String(userId)} ORDER BY uploaded_at DESC 
    `;
  }

  return await sql`
    SELECT * FROM resumes ORDER BY uploaded_at DESC
  `;
}

//get specific resume by user id
export async function getResume(id) {
  assertDatabaseAvailable();

  const rows = await sql`
    SELECT * FROM resumes WHERE id = ${id}
  `;
  return rows[0] ?? null; //return first resume that fits the id description
}

//create resume and store in db
export async function createResumeRecord({
  auth_user_id,
  original_filename,
  stored_filename,
  file_type,
  job_description,
}) {
  assertDatabaseAvailable();

  //sql columsn plus value insertions
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

//update resume
export async function updateResumeRecord(id, updates) {
  assertDatabaseAvailable();

  //get specific resume sections by id and update
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
  return rows[0] ?? null; //return first resume
}

//delete resume
export async function deleteResumeRecord(id) {
  assertDatabaseAvailable();

  await sql`
    DELETE FROM resumes WHERE id = ${id}
  `;
}
