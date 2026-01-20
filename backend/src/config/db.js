import {neon} from "@neondatabase/serverless"
import "dotenv/config"

export const sql=neon(process.env.DATABASE_URL)

export async function initDB() {
    try {
       await sql `
            CREATE TABLE IF NOT EXISTS resumes (
                id SERIAL PRIMARY KEY,
                auth_user_id VARCHAR(255) NOT NULL,
                original_filename VARCHAR(255),
                file_type VARCHAR(50),
                uploaded_at TIMESTAMP DEFAULT now(),
                cleaned_text TEXT,
                job_description TEXT,
                status VARCHAR(50) DEFAULT 'pending'
        ) 
        `;
        
    } catch (error) {
        console.log("Error initialising Database")
        return process.exit(1)
    }
    
}