# Resume Cleaner

AI Resume Cleaner is a full-stack app for uploading resumes, cleaning them into a more professional format with OpenAI, and exporting the cleaned version as a PDF.

## Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: Express, Node.js, Multer, Mammoth, PDFKit
- Database: Neon Postgres
- Rate limiting: Upstash Redis
- AI: OpenAI API

## Project Structure

```text
Resume Cleaner/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── server.js
│   └── .env
└── front/
    └── resume-cleaner-frontend/
        ├── src/
        │   ├── app/
        │   ├── components/
        │   └── lib/
        └── package.json
```

## Features

- Upload `.pdf`, `.doc`, and `.docx` resumes
- Store resume metadata in Postgres
- Extract text from PDF and Word files
- Clean resume content with OpenAI
- Export cleaned resumes as PDF
- Delete uploaded resumes

## Environment Variables

Create `backend/.env` with:

```env
OPENAI_API_KEY=your_openai_key
PORT=5000
DATABASE_URL=your_neon_connection_string
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
NODE_ENV=development
```

Notes:

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are optional. If they are missing, rate limiting is skipped.
- Do not commit real secrets.

For the frontend, set:

`front/resume-cleaner-frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Installation

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd front/resume-cleaner-frontend
npm install
```

## Running the App

### Start backend

```bash
cd backend
npm run dev
```

Backend runs on `http://localhost:5000`.

### Start frontend

```bash
cd front/resume-cleaner-frontend
npm run dev
```

Frontend runs on `http://localhost:3000`.

## API Routes

Base URL: `http://localhost:5000/api/resumes`

- `GET /` - List resumes
- `GET /:id` - Get one resume
- `POST /` - Upload a resume using multipart form data with field name `resume`
- `POST /:id/clean` - Clean a resume with OpenAI
- `GET /:id/export` - Download the cleaned PDF
- `DELETE /:id` - Delete a resume

## Upload Request Shape

Use `multipart/form-data` with:

- `resume`: file
- `user_id`: optional string
- `job_description`: optional string

## Database

The backend initializes the `resumes` table on startup and attempts to add missing columns for older schemas.

Main fields include:

- `id`
- `auth_user_id`
- `original_filename`
- `stored_filename`
- `file_type`
- `uploaded_at`
- `raw_text`
- `cleaned_text`
- `cleaned_pdf`
- `job_description`
- `status`

## Known Issues

- If the backend shows a Neon connection error, the app cannot upload or load resumes until `DATABASE_URL` is valid and reachable.
- If frontend styles appear plain, restart the Next.js dev server after CSS or Tailwind config changes.
- ESLint/build behavior may vary depending on local Windows execution policy and environment.

## Security

- Rotate any API keys or database credentials that were exposed in development.
- Keep `.env` files out of version control.

