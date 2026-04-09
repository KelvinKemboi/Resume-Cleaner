import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const sql = neon(process.env.DATABASE_URL);
export default sql;

export async function initDB() {
  try {
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

    // Keep older databases in sync with the fields the current app uses.
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
  } catch (error) {
    console.error("Error initialising database:", error);
    throw error;
  }
}
