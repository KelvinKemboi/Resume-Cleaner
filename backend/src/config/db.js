import { neon } from "@neondatabase/serverless"; //neon db connection
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

//file paths variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//db configuration
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

//helper function: clean and normalize to readable database url
function normalizeDatabaseUrl(value) {
  if (!value) return "";

  const trimmed = value.trim();
  const psqlMatch = trimmed.match(/^psql\s+['"](.+)['"]$/is);
  const extracted = psqlMatch ? psqlMatch[1] : trimmed;

  return extracted.replace(/^['"]|['"]$/g, "").replace(/\s+/g, "");
}

//data base url from neon's psql link
const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
const sql = databaseUrl ? neon(databaseUrl) : null;
let databaseAvailable = false;
export default sql;

//helper function if database is made and working
export function isDatabaseAvailable() {
  return databaseAvailable;
}

//initial database columns & sections
export async function initDB() {
  if (!sql) {
    throw new Error("DATABASE_URL is missing or invalid in backend/.env");
  }

  try {
    await sql`SELECT 1`;
    //create initial/first sql tables if they dont exists
    await sql`
      CREATE TABLE IF NOT EXISTS resumes (
        id SERIAL PRIMARY KEY,
        auth_user_id VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255),
        stored_filename VARCHAR(255),
        file_type VARCHAR(50),
        uploaded_at TIMESTAMP DEFAULT now(),
        raw_text TEXT,
        cleaned_text TEXT,
        cleaned_pdf VARCHAR(255),
        job_description TEXT,
        status VARCHAR(50) DEFAULT 'pending'
      )
    `;

    // make updates without changing struture- Keep older databases in sync with the fields the current app uses
    await sql`
      ALTER TABLE resumes
      ADD COLUMN IF NOT EXISTS auth_user_id VARCHAR(255)
    `;
    await sql`
      ALTER TABLE resumes
      ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255)
    `;
    await sql`
      ALTER TABLE resumes
      ADD COLUMN IF NOT EXISTS stored_filename VARCHAR(255)
    `;
    await sql`
      ALTER TABLE resumes
      ADD COLUMN IF NOT EXISTS raw_text TEXT
    `;
    await sql`
      ALTER TABLE resumes
      ADD COLUMN IF NOT EXISTS cleaned_pdf VARCHAR(255)
    `;
    await sql`
      ALTER TABLE resumes
      ADD COLUMN IF NOT EXISTS file_type VARCHAR(50)
    `;
    await sql`
      ALTER TABLE resumes
      ADD COLUMN IF NOT EXISTS job_description TEXT
    `;
    await sql`
      ALTER TABLE resumes
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'
    `;
    await sql`
      ALTER TABLE resumes
      ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP DEFAULT now()
    `;

    await sql`
      UPDATE resumes
      SET auth_user_id = 'demo-user'
      WHERE auth_user_id IS NULL
    `;

    await sql`
      ALTER TABLE resumes
      ALTER COLUMN auth_user_id SET NOT NULL
    `;

    databaseAvailable = true;
  } catch (error) {
    databaseAvailable = false;
    throw new Error(`Error initialising Neon database: ${error.message}`);
  }
}
