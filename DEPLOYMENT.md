# Deployment Guide

## Vercel Deployment (Recommended for Full-Stack)

This project includes `vercel.json` configuration to deploy both the Node.js backend and Next.js frontend to Vercel.

### Setup Steps:

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/ai-resume-coach.git
   git push -u origin main
   ```

2. **Create Vercel Project**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Click "Import"

3. **Set Environment Variables**
   - In Vercel project settings → Environment Variables
   - Add: `OPENAI_API_KEY` = your OpenAI API key
   - Add: `PDFJS_DISABLE_CANVAS` = `true` (already in vercel.json, but ensure it's set)

4. **Deploy**
   - Vercel automatically deploys on every push to main
   - Your backend will be available at: `https://your-project.vercel.app`
   - Your frontend will be served from the same domain

### How It Works:

- `vercel.json` routes `/api/*` requests to the Node.js backend (`index.js`)
- All other routes are handled by the Next.js frontend
- Canvas rendering is disabled to avoid pdf-parse issues on serverless

### Troubleshooting:

**Canvas Error on Vercel?**
- Ensure `PDFJS_DISABLE_CANVAS=true` is set in Environment Variables
- The vercel.json already sets this, but Vercel env vars take precedence

**API calls failing in frontend?**
- The frontend automatically uses the same domain for API calls
- No need to set `NEXT_PUBLIC_API_URL` for Vercel deployment

**Large PDF files slow?**
- PDF parsing on serverless is slower than locally
- Consider a max file size or async job queue for production

---

## Alternative: Separate Deployments

If you prefer separate deployments:

### Backend on Render:
1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Create Web Service, connect repo
4. Set `OPENAI_API_KEY` in Environment Variables
5. Deploy

### Frontend on Vercel:
1. Create separate frontend repo or subdirectory
2. Deploy to Vercel as usual
3. Set `NEXT_PUBLIC_API_URL` to your Render backend URL

---

## Local Development

Keep using:
```bash
npm run dev:all
```

This runs both backend (4000) and frontend (3000) locally in watch mode.
