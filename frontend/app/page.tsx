"use client";

import { FormEvent, useMemo, useState } from "react";

// Production-safe API URL: requires explicit env var, no localhost fallback
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

if (!API_BASE && typeof window !== "undefined" && process.env.NODE_ENV === "production") {
  console.error("ERROR: NEXT_PUBLIC_API_URL is not set. Backend API calls will fail.");
}

// Allow localhost only in development
const API_URL = API_BASE || (typeof window !== "undefined" && process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

type NullableFile = File | null;

export default function Home() {
  const [resumeFile, setResumeFile] = useState<NullableFile>(null);
  const [resumeText, setResumeText] = useState("");
  const [resumeAnalysis, setResumeAnalysis] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);

  const [targetRole, setTargetRole] = useState("");
  const [questionResult, setQuestionResult] = useState("");
  const [questionLoading, setQuestionLoading] = useState(false);

  const [mockAnswer, setMockAnswer] = useState("");
  const [mockFeedback, setMockFeedback] = useState("");
  const [mockLoading, setMockLoading] = useState(false);

  const [error, setError] = useState("");

  const hasExtractedText = useMemo(() => resumeText.trim().length > 0, [resumeText]);

  async function parseJsonResponse(response: Response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Request failed. Please try again.");
    }
    return data;
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!resumeFile) {
      setError("Please choose a resume file first.");
      return;
    }

    setError("");
    setUploadLoading(true);

    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);

      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await parseJsonResponse(response);
      setResumeText(data.text || "");
      setResumeAnalysis("");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleAnalyze() {
    if (!hasExtractedText) {
      setError("Upload a resume or paste resume text before analysis.");
      return;
    }

    setError("");
    setAnalyzeLoading(true);

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: resumeText }),
      });

      const data = await parseJsonResponse(response);
      setResumeAnalysis(data.result || "No analysis returned.");
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Analysis failed.");
    } finally {
      setAnalyzeLoading(false);
    }
  }

  async function handleGenerateQuestions(e: FormEvent) {
    e.preventDefault();

    if (!targetRole.trim()) {
      setError("Please enter a role for interview questions.");
      return;
    }

    setError("");
    setQuestionLoading(true);

    try {
      const response = await fetch(`${API_URL}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: targetRole }),
      });

      const data = await parseJsonResponse(response);
      setQuestionResult(data.questions || "No questions returned.");
    } catch (questionError) {
      setError(questionError instanceof Error ? questionError.message : "Question generation failed.");
    } finally {
      setQuestionLoading(false);
    }
  }

  async function handleMockFeedback(e: FormEvent) {
    e.preventDefault();

    if (!mockAnswer.trim()) {
      setError("Please add an interview answer before evaluating.");
      return;
    }

    setError("");
    setMockLoading(true);

    try {
      const response = await fetch(`${API_URL}/mock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answer: mockAnswer }),
      });

      const data = await parseJsonResponse(response);
      setMockFeedback(data.feedback || "No feedback returned.");
    } catch (feedbackError) {
      setError(feedbackError instanceof Error ? feedbackError.message : "Mock evaluation failed.");
    } finally {
      setMockLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7_0%,_#ffedd5_35%,_#f0fdfa_100%)] text-slate-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
        <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur-lg sm:p-10 animate-rise">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Career AI Copilot</p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">
            AI Resume + Interview Coach SaaS
          </h1>
          <p className="mt-4 max-w-3xl text-base text-slate-700 sm:text-lg">
            Upload your resume, get ATS-focused analysis, generate role-specific interview questions, and improve your answers with instant mock feedback.
          </p>
          {error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="animate-rise rounded-3xl border border-teal-100 bg-white p-6 shadow-lg [animation-delay:100ms] sm:p-8">
            <h2 className="text-2xl font-extrabold">1. Resume Analyzer</h2>
            <p className="mt-2 text-sm text-slate-600">Supports .txt, .pdf, and .docx files up to 5MB.</p>

            <form onSubmit={handleUpload} className="mt-5 space-y-4">
              <input
                type="file"
                accept=".txt,.pdf,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-teal-800"
              />
              <button
                type="submit"
                disabled={uploadLoading}
                className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {uploadLoading ? "Extracting..." : "Extract Resume Text"}
              </button>
            </form>

            <label htmlFor="resumeText" className="mt-5 block text-sm font-semibold text-slate-700">
              Resume Text
            </label>
            <textarea
              id="resumeText"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={8}
              placeholder="Resume text will appear here after upload. You can also edit/paste manually."
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none ring-teal-500 transition focus:ring"
            />

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzeLoading || !hasExtractedText}
              className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {analyzeLoading ? "Analyzing..." : "Analyze Resume"}
            </button>
          </article>

          <article className="animate-rise rounded-3xl border border-amber-100 bg-white p-6 shadow-lg [animation-delay:200ms] sm:p-8">
            <h2 className="text-2xl font-extrabold">Analysis Result</h2>
            <p className="mt-2 text-sm text-slate-600">Structured strengths, weaknesses, improvements, and ATS score.</p>
            <ResultBox content={resumeAnalysis} placeholder="Run resume analysis to see results here." />
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="animate-rise rounded-3xl border border-sky-100 bg-white p-6 shadow-lg [animation-delay:300ms] sm:p-8">
            <h2 className="text-2xl font-extrabold">2. Interview Questions</h2>
            <form onSubmit={handleGenerateQuestions} className="mt-4 space-y-4">
              <input
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="Example: Frontend Developer"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none ring-sky-500 transition focus:ring"
              />
              <button
                type="submit"
                disabled={questionLoading}
                className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {questionLoading ? "Generating..." : "Generate 10 Questions"}
              </button>
            </form>
          </article>

          <article className="animate-rise rounded-3xl border border-sky-100 bg-white p-6 shadow-lg [animation-delay:400ms] sm:p-8">
            <h2 className="text-2xl font-extrabold">Question Set</h2>
            <ResultBox content={questionResult} placeholder="Generated interview questions will appear here." />
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="animate-rise rounded-3xl border border-orange-100 bg-white p-6 shadow-lg [animation-delay:500ms] sm:p-8">
            <h2 className="text-2xl font-extrabold">3. Mock Interview Evaluator</h2>
            <form onSubmit={handleMockFeedback} className="mt-4 space-y-4">
              <textarea
                value={mockAnswer}
                onChange={(e) => setMockAnswer(e.target.value)}
                rows={8}
                placeholder="Paste your interview answer..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none ring-orange-500 transition focus:ring"
              />
              <button
                type="submit"
                disabled={mockLoading}
                className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {mockLoading ? "Evaluating..." : "Get Feedback"}
              </button>
            </form>
          </article>

          <article className="animate-rise rounded-3xl border border-orange-100 bg-white p-6 shadow-lg [animation-delay:600ms] sm:p-8">
            <h2 className="text-2xl font-extrabold">Feedback</h2>
            <ResultBox content={mockFeedback} placeholder="Mock interview score and feedback will appear here." />
          </article>
        </section>
      </main>
    </div>
  );
}

function ResultBox({ content, placeholder }: { content: string; placeholder: string }) {
  return (
    <div className="mt-4 min-h-48 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      {content ? (
        <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{content}</pre>
      ) : (
        <p className="text-sm text-slate-500">{placeholder}</p>
      )}
    </div>
  );
}
