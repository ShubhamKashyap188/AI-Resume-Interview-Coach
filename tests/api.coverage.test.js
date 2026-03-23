import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

const axios = (await import("axios")).default;
const app = (await import("../index.js")).default;

describe("API coverage suite", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-api-key";
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
      return;
    }

    process.env.OPENAI_API_KEY = originalKey;
  });

  it("GET /health returns service health payload", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      service: "ai-resume-interview-coach",
    });
  });

  it("POST /upload returns 400 when file is missing", async () => {
    const response = await request(app).post("/upload");

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("No file uploaded");
  });

  it("POST /upload rejects unsupported file types", async () => {
    const response = await request(app)
      .post("/upload")
      .attach("resume", Buffer.from("fake"), "resume.png");

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Unsupported file type");
  });

  it("POST /upload extracts text from txt files", async () => {
    const response = await request(app)
      .post("/upload")
      .attach("resume", Buffer.from("Senior Engineer\nNode.js\nReact"), "resume.txt");

    expect(response.status).toBe(200);
    expect(response.body.text).toContain("Senior Engineer");
  });

  it("POST /analyze validates required text", async () => {
    const response = await request(app).post("/analyze").send({ text: "" });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'text' is required");
  });

  it("POST /analyze returns model analysis", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        choices: [
          {
            message: {
              content: "1) Strengths\n- Clear impact\n4) ATS Score: 83/100",
            },
          },
        ],
      },
    });

    const response = await request(app)
      .post("/analyze")
      .send({ text: "Experienced frontend engineer with React and accessibility expertise." });

    expect(response.status).toBe(200);
    expect(response.body.result).toContain("ATS Score");
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it("POST /questions validates required role", async () => {
    const response = await request(app).post("/questions").send({ role: "   " });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'role' is required");
  });

  it("POST /questions returns generated list", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: "1. Question one\n2. Question two" } }],
      },
    });

    const response = await request(app)
      .post("/questions")
      .send({ role: "Frontend Developer" });

    expect(response.status).toBe(200);
    expect(response.body.questions).toContain("1.");
  });

  it("POST /mock validates required answer", async () => {
    const response = await request(app).post("/mock").send({ answer: "" });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("'answer' is required");
  });

  it("POST /mock returns interview feedback", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: "Score: 8/10\n- Strong structure" } }],
      },
    });

    const response = await request(app)
      .post("/mock")
      .send({ answer: "I used STAR to explain how I improved page load speed." });

    expect(response.status).toBe(200);
    expect(response.body.feedback).toContain("Score");
  });
});
