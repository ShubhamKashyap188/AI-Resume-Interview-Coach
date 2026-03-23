# AGENTS.md

Project-level guide for contributors and coding agents working on **AI Resume + Interview Coach**.

## 1. Project Overview

This repository contains a full-stack app with:
- A Node.js + Express backend (`index.js`)
- A Next.js frontend (`frontend/`)

Primary user workflows:
- Upload resume (`.txt`, `.pdf`, `.docx`) and extract text
- Analyze resume for ATS/readability feedback
- Generate role-specific interview questions
- Evaluate mock interview answers with scoring and suggestions

## 2. Tech Stack

Backend:
- Node.js (ESM)
- Express 5
- Multer (memory upload)
- pdf-parse (`PDFParse`)
- mammoth (DOCX extraction)
- axios for OpenAI API calls

Frontend:
- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS v4
- TypeScript + ESLint

## 3. Repository Structure

- `index.js`: Express server and all API routes
- `.env`: Environment variables (must include `OPENAI_API_KEY`)
- `uploads/`: currently present but backend uses in-memory uploads only
- `frontend/app/page.tsx`: main UI and API integration logic
- `frontend/app/layout.tsx`: root layout + metadata
- `frontend/app/globals.css`: global styles + animations
- `frontend/next.config.ts`: Next config (`turbopack.root = process.cwd()`)

## 4. Environment and Ports

Required env vars (project root `.env`):
- `OPENAI_API_KEY` (required)
- `PORT` (optional, defaults to `4000`)

Frontend API base:
- Uses `NEXT_PUBLIC_API_URL` if set
- Falls back to `http://localhost:4000`

Default ports:
- Backend: `4000`
- Frontend: `3000`

## 5. Commands

From project root:
- `npm run dev`: backend in watch mode
- `npm run dev:frontend`: start frontend dev server
- `npm run dev:all`: run backend + frontend together (uses concurrently)
- `npm run start`: start backend production mode
- `npm run build:frontend`: production build for frontend

From `frontend/`:
- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run start`

## 6. Backend API Contract

`GET /health`
- Response: `{ ok: true, service: "ai-resume-interview-coach" }`

`POST /upload`
- Body: `multipart/form-data`, field name: `resume`
- Accepts: `.txt`, `.pdf`, `.docx`
- Max file size: 5 MB
- Response: `{ text: string }`

`POST /analyze`
- Body: `{ "text": string }`
- Response: `{ result: string }`

`POST /questions`
- Body: `{ "role": string }`
- Response: `{ questions: string }`

`POST /mock`
- Body: `{ "answer": string }`
- Response: `{ feedback: string }`

Error behavior:
- Validation errors: 400 with `{ error: message }`
- Multer size limit error mapped to readable message
- OpenAI API errors proxied by status/message where possible
- Fallback: 500 with `{ error: "Unexpected server error." }`

## 7. OpenAI Integration Rules

Current implementation:
- Endpoint: `POST https://api.openai.com/v1/chat/completions`
- Model: `gpt-4o-mini`
- Temperature: `0.3`
- Authorization via Bearer token from `OPENAI_API_KEY`

When modifying prompts:
- Keep output shape stable because frontend renders plain text/markdown blocks
- Preserve concise structured sections for easier readability
- Do not expose API key or raw request internals in responses

## 8. Frontend Behavior Rules

Main state model is in `frontend/app/page.tsx`.

Important conventions:
- Keep async loading states scoped per action.
- Resume flow must use separate flags:
  - `uploadLoading` for `/upload`
  - `analyzeLoading` for `/analyze`
- Keep `questionLoading` and `mockLoading` independent for their flows.
- Use `parseJsonResponse()` for uniform error handling.
- Preserve current endpoint mappings and payload keys:
  - `/upload` with `FormData` field `resume`
  - `/analyze` with `{ text }`
  - `/questions` with `{ role }`
  - `/mock` with `{ answer }`

UI conventions:
- Maintain current visual direction (warm gradient + card layout + rise animation)
- Keep typography choices defined in `globals.css`
- Avoid adding component libraries unless explicitly requested

## 9. File Handling and Limits

- Upload parsing is extension-based (`txt`, `pdf`, `docx`)
- PDF extraction uses `PDFParse` and calls `destroy()` on parser
- Empty extracted text should return a user-facing bad request error

If adding file types:
- Update both backend extraction logic and frontend `accept` attribute
- Update user-facing helper text in Resume Analyzer card

## 10. Quality Checklist for Changes

Before finishing a task that touches frontend/backend behavior:
1. Run `npm run lint` in `frontend/`
2. Run `npm run build` in `frontend/` (or `npm run build:frontend` from root)
3. Manually verify key flows:
   - Upload resume
   - Analyze text
   - Generate questions
   - Evaluate mock answer
4. Confirm error states still render in top alert block

## 11. Known Notes

- This workspace may not be initialized as a git repository in all environments.
- `uploads/` exists, but current upload strategy is in-memory (Multer memory storage).
- `npm run dev:all` currently runs `npm run start` for backend plus frontend dev server.

## 12. Change Policy for Agents

- Prefer minimal, focused edits.
- Do not change endpoint names or request/response keys without updating frontend accordingly.
- Keep backward compatibility for UI text outputs where possible.
- If making behavior changes, update this root `AGENTS.md` so future contributors have current guidance.
