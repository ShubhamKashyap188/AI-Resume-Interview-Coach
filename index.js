// Disable canvas and suppress warnings BEFORE any imports
process.env.PDFJS_DISABLE_CANVAS = "true";
process.env.PDF_USE_NATIVE_MODULE = "false";
process.env.PDF_USE_WORKER = "false";

// Suppress ALL warnings/errors that contain canvas, polyfill, or worker references
const originalWarn = console.warn;
const originalError = console.error;
const originalLog = console.log;

const isIgnorableMessage = (message) => {
  const msg = String(message || "");
  return msg.includes("Cannot load") || msg.includes("Cannot polyfill") || 
         msg.includes("Worker") || msg.includes("canvas") || 
         msg.includes("DOMMatrix") || msg.includes("ImageData") ||
         msg.includes("NAPI") || msg.includes("napi-rs");
};

console.warn = function(...args) {
  if (isIgnorableMessage(args[0])) return;
  originalWarn.apply(console, args);
};

console.error = function(...args) {
  if (isIgnorableMessage(args[0])) return;
  originalError.apply(console, args);
};

// Also suppress from logs to catch any other canvas-related output
console.log = function(...args) {
  if (isIgnorableMessage(args[0])) return;
  originalLog.apply(console, args);
};

import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import axios from "axios";
import cors from "cors";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json({ limit: "5mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

function requireApiKey() {
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    const error = new Error("OPENAI_API_KEY is not configured.");
    error.status = 500;
    throw error;
  }

  return key;
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

async function extractResumeText(file) {
  if (!file) {
    throw badRequest("No file uploaded. Use form-data with field name 'resume'.");
  }

  const originalName = file.originalname || "";
  const ext = originalName.includes(".")
    ? originalName.split(".").pop().toLowerCase()
    : "";

  if (ext === "txt") {
    return file.buffer.toString("utf-8");
  }

  if (ext === "pdf") {
    try {
      const parser = new PDFParse({ data: file.buffer });
      const result = await parser.getText();
      await parser.destroy();
      return result.text || "";
    } catch (err) {
      throw badRequest("Failed to extract text from PDF. Please ensure the file is readable.");
    }
  }

  if (ext === "docx") {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    return parsed.value || "";
  }

  throw badRequest("Unsupported file type. Upload .txt, .pdf, or .docx files.");
}

async function callOpenAI(systemPrompt, userPrompt) {
  const apiKey = requireApiKey();

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 45000,
    }
  );

  return response?.data?.choices?.[0]?.message?.content?.trim() || "";
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ai-resume-interview-coach" });
});

app.post("/upload", upload.single("resume"), async (req, res, next) => {
  try {
    const text = normalizeText(await extractResumeText(req.file));

    if (!text) {
      throw badRequest(
        "Could not extract text from file. Please upload a readable .txt, .pdf, or .docx resume."
      );
    }

    res.json({ text });
  } catch (error) {
    next(error);
  }
});

app.post("/analyze", async (req, res, next) => {
  try {
    const text = normalizeText(req.body?.text);

    if (!text) {
      throw badRequest("'text' is required for resume analysis.");
    }

    const result = await callOpenAI(
      [
        "You are an expert resume reviewer and ATS evaluator.",
        "Return concise markdown with sections:",
        "1) Strengths (bullets)",
        "2) Weaknesses (bullets)",
        "3) Improvements (bullets)",
        "4) ATS Score (single line: X/100)",
      ].join("\n"),
      text
    );

    res.json({ result });
  } catch (error) {
    next(error);
  }
});

app.post("/questions", async (req, res, next) => {
  try {
    const role = normalizeText(req.body?.role);

    if (!role) {
      throw badRequest("'role' is required to generate interview questions.");
    }

    const questions = await callOpenAI(
      [
        "You are a senior interviewer.",
        "Generate exactly 10 interview questions.",
        "Split across: fundamentals, practical scenarios, and behavioral questions.",
        "Return as a numbered list only.",
      ].join("\n"),
      `Target role: ${role}`
    );

    res.json({ questions });
  } catch (error) {
    next(error);
  }
});

app.post("/mock", async (req, res, next) => {
  try {
    const answer = normalizeText(req.body?.answer);

    if (!answer) {
      throw badRequest("'answer' is required for mock interview feedback.");
    }

    const feedback = await callOpenAI(
      [
        "You are an interview coach.",
        "Evaluate the candidate answer and return concise markdown with:",
        "1) Score: X/10",
        "2) What went well (bullets)",
        "3) What to improve (bullets)",
        "4) Better sample answer (short)",
      ].join("\n"),
      answer
    );

    res.json({ feedback });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      error:
        error.code === "LIMIT_FILE_SIZE"
          ? "File too large. Max size is 5MB."
          : error.message,
    });
  }

  if (error.response?.status) {
    return res.status(error.response.status).json({
      error: error.response.data?.error?.message || "OpenAI API request failed.",
    });
  }

  const status = error.status || 500;
  return res.status(status).json({
    error: error.message || "Unexpected server error.",
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
