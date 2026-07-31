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

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
OPENAI_API_KEY=your_openai_key
PORT=5000
DATABASE_URL=your_neon_connection_string
COOKIE_SECRET=a_long_random_string
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
FRONTEND_URL=https://your-deployed-frontend.example.com
NODE_ENV=development
```

Notes:

- `COOKIE_SECRET` signs the anonymous session cookie that owns each resume (see Security below). Set it in every persistent environment - without it, a random secret is generated per process restart and every existing session is invalidated on each deploy/restart.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are optional. If they are missing, the app falls back to a local in-memory rate limiter instead of skipping rate limiting entirely.
- `NODE_ENV=production` is required for the session cookie to be sent correctly when the frontend and backend are on different domains (Secure + SameSite=None). Production deployments must be served over HTTPS.
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

All routes are scoped to the caller's anonymous session cookie (see Security below) - `GET /` always returns only the resumes owned by the current browser session, and `GET /:id`, `POST /:id/clean`, `GET /:id/export`, `DELETE /:id` return 404 for any resume that session doesn't own, even if the ID exists.

- `GET /` - List resumes owned by the current session
- `GET /:id` - Get one resume (must be owned by the current session)
- `POST /` - Upload a resume using multipart form data with field name `resume`
- `POST /:id/clean` - Clean a resume with OpenAI
- `GET /:id/export` - Download the cleaned PDF
- `DELETE /:id` - Delete a resume

Requests must include credentials (cookies) - browser clients need `fetch`/`axios` configured with `credentials: "include"` / `withCredentials: true`.

## Upload Request Shape

Use `multipart/form-data` with:

- `resume`: file
- `job_description`: optional string (used to tailor the AI cleaning pass toward a target role)

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

- **Resume ownership**: on first request, the backend sets a signed, `httpOnly`, `SameSite` session cookie (`rc_sid`) identifying "this browser." That cookie - never anything the client sends - determines which resumes a request can see, clean, export, or delete. There is no login; it's an anonymous per-browser identity, not a real account, so it doesn't follow you across browsers/devices and clearing cookies starts a fresh, empty session.
- **Upload validation**: files are restricted by extension + MIME type, and the actual file bytes are checked against the expected magic number (`%PDF-`, the DOCX zip header, or the legacy DOC header) after upload, before the file is trusted - a renamed `.exe` won't pass even if its extension and MIME type are spoofed. Max size 10 MB, one file per request.
- **Rate limiting**: general API traffic is limited (via Upstash if configured, otherwise an in-memory fallback so it's never fully open); upload and clean specifically have a tighter, always-on limit since they're the expensive/abusable operations.
- **Headers**: `helmet` sets standard hardening headers; CORS is restricted to an explicit origin allowlist (`localhost:3000`/`127.0.0.1:3000` plus `FRONTEND_URL`), not a wildcard.
- Rotate any API keys or database credentials that were exposed in development.
- Keep `.env` files out of version control.

