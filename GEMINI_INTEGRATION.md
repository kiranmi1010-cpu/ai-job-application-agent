# Google Gemini AI Integration

## ✅ What Was Done

### 1. Installed `@google/generative-ai` Package
- Added to `package.json` dependencies
- Uses `gemini-2.0-flash` model for fast, cost-effective AI responses

### 2. Created Vercel Serverless Function (`api/gemini.ts`)
- Reads API key from `GEMINI_API_KEY` environment variable
- Handles 6 different AI actions:
  - `parse-resume` - AI-powered resume parsing
  - `match-jobs` - AI job matching with detailed reasons
  - `generate-cover-letter` - Professional cover letter generation
  - `generate-follow-up` - Follow-up email generation
  - `generate-thank-you` - Post-interview thank you emails
  - `analyze-job-fit` - Detailed job fit analysis

### 3. Created Frontend Gemini Client (`src/services/gemini.ts`)
- TypeScript-safe API client
- Calls `/api/gemini` endpoint
- Handles errors gracefully
- Type-safe responses

### 4. Updated Resume Parser (`src/services/resumeParser.ts`)
- **Primary**: Uses Gemini AI for intelligent resume parsing
- **Fallback**: Local regex-based parser when API unavailable
- Extracts: name, email, phone, skills, experience, education, summary

### 5. Updated Job Search (`src/services/jobSearch.ts`)
- **Primary**: Gemini AI calculates match scores with detailed reasons
- **Fallback**: Local algorithm (skills 40%, title 30%, experience 20%, location 10%)
- Returns: match score, reasons, missing skills, recommendation

### 6. Updated Email Service (`src/services/emailService.ts`)
- **Primary**: Gemini generates personalized, professional emails
- **Fallback**: Template-based generation
- Creates: cover letters, follow-ups, thank you emails

### 7. Updated UI Components
- **ResumeUpload**: Shows "Gemini AI" badge when AI parsing is used
- **ResumeUpload**: Shows Gemini connection status
- **JobScanner**: Displays "Gemini AI Analysis" with match reasons

### 8. Updated Database Schema
- Added `matchReasons` field to Job interface
- Added `recommendation` field (strong_apply/consider/skip)

### 9. Configuration Files
- `vercel.json` - Configures serverless functions and routing
- `tsconfig.api.json` - TypeScript config for API functions

---

## 🔧 Setup Instructions

### Step 1: Verify Environment Variable
Make sure `GEMINI_API_KEY` is set in your Vercel project:
```
Vercel Dashboard → Settings → Environment Variables → GEMINI_API_KEY
```

### Step 2: Deploy to Vercel
```bash
# Commit your changes
git add .
git commit -m "Add Google Gemini AI integration"

# Push to trigger deployment
git push
```

### Step 3: Verify Integration
After deployment:
1. Open your app
2. Go to "My Resume" tab
3. You should see: **"Google Gemini AI is active"** indicator
4. Upload a resume - it will be parsed by Gemini

---

## 🎯 How It Works

### Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React App     │────▶│  /api/gemini.ts  │────▶│  Gemini API     │
│   (Frontend)    │     │  (Serverless)    │     │  (Google Cloud) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                         │
        │                         │
        ▼                         ▼
┌─────────────────┐     ┌──────────────────┐
│  IndexedDB      │     │  GEMINI_API_KEY  │
│  (Local Store)  │     │  (Env Variable)  │
└─────────────────┘     └──────────────────┘
```

### Request Flow
1. User uploads resume in React app
2. Frontend calls `POST /api/gemini` with `{ action: 'parse-resume', data: { text } }`
3. Serverless function reads `GEMINI_API_KEY` from env
4. Function calls Gemini API with structured prompt
5. Gemini returns parsed JSON
6. Serverless function returns result to frontend
7. Frontend displays AI-parsed data

---

## 📊 Gemini Features

### Resume Parsing
- Extracts 100+ technical skills
- Identifies experience levels
- Parses education details
- Generates professional summary
- Much more accurate than regex-based parsing

### Job Matching
- Calculates match scores (0-100)
- Provides specific reasons for match
- Identifies missing skills
- Gives recommendations (strong_apply/consider/skip)
- Considers experience level alignment

### Email Generation
- Personalized cover letters for each job
- Highlights relevant skills and achievements
- Professional tone and structure
- Follow-up emails that are polite and effective
- Thank you emails after interviews

---

## 🔄 Fallback Behavior

If Gemini API is unavailable:
- **Resume Parsing**: Uses local regex-based parser
- **Job Matching**: Uses local algorithm (skills/title/experience/location)
- **Email Generation**: Uses template-based generation

The app always works, even without the API key!

---

## 💰 Cost & Limits

### Gemini API (Free Tier)
- **gemini-2.0-flash**: 15 requests per minute, 1,500 per day
- More than enough for personal job search
- No credit card required

### If You Need More
- Upgrade to paid tier for higher limits
- Consider caching responses to reduce API calls
- Batch job matching (already implemented)

---

## 🧪 Testing

### Test Resume Parsing
```bash
# In browser console after uploading resume
const resume = await dbHelpers.getResume();
console.log(resume);
```

### Test Job Matching
```bash
# In browser console
const jobs = await dbHelpers.getJobs();
console.log(jobs[0].matchReasons);
```

### Test API Directly
```bash
curl -X POST https://your-app.vercel.app/api/gemini \
  -H "Content-Type: application/json" \
  -d '{"action":"parse-resume","data":{"text":"John Doe\nSoftware Engineer\nSkills: React, TypeScript"}}'
```

---

## 🐛 Troubleshooting

### "GEMINI_API_KEY not configured"
- Check Vercel environment variables
- Redeploy after adding the variable
- Variable name must be exactly `GEMINI_API_KEY`

### "Failed to process request"
- Check Vercel function logs
- Verify API key is valid
- Check Gemini API quota

### Gemini badge not showing
- Check browser console for errors
- Verify `/api/gemini` endpoint is accessible
- Check CORS settings in `api/gemini.ts`

---

## 📝 API Reference

### Endpoint
```
POST /api/gemini
```

### Request Body
```json
{
  "action": "parse-resume" | "match-jobs" | "generate-cover-letter" | "generate-follow-up" | "generate-thank-you" | "analyze-job-fit",
  "data": {
    // Action-specific data
  }
}
```

### Response
```json
{
  "success": true,
  "data": {
    // Action-specific result
  }
}
```

---

## 🎉 You're All Set!

Your JobPilot AI app now uses Google Gemini for:
- ✅ Intelligent resume parsing
- ✅ AI-powered job matching
- ✅ Professional email generation
- ✅ Detailed job fit analysis

All powered by your `GEMINI_API_KEY` environment variable on Vercel!
