# JobPilot AI - Setup Guide

## 🚀 Getting Started

JobPilot AI is now fully functional! Follow this guide to set up all the integrations and start using it.

## ✅ What's Working Now

1. **Resume Upload & Parsing**: Upload PDF/DOC/DOCX/TXT files and the AI will extract:
   - Name, email, phone
   - Technical skills
   - Work experience
   - Education

2. **Automatic Job Search**: Based on your resume, the AI will:
   - Extract key skills and experience
   - Search for matching jobs
   - Calculate match scores
   - Rank opportunities

3. **Persistent Storage**: All data is saved locally in your browser using IndexedDB

4. **Email Composition**: Generate professional cover letters and follow-up emails

## 🔧 Required Setup for Full Functionality

### 1. Job Search API (Optional but Recommended)

To search real job boards, you need a JSearch API key:

1. Go to [RapidAPI](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch)
2. Sign up for a free account (500 requests/month free)
3. Subscribe to the JSearch API
4. Copy your API key
5. Open `src/services/jobSearch.ts`
6. Replace `YOUR_RAPIDAPI_KEY` with your actual key:
   ```typescript
   const JSEARCH_API_KEY = 'your_actual_key_here';
   ```

**Without API key**: The app will generate realistic mock jobs based on your resume for demo purposes.

### 2. Gmail Integration (Optional)

To send emails directly from the app:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Gmail API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Add authorized origins: `http://localhost:3000` (for development)
   - Add authorized redirect URIs: `http://localhost:3000`
5. Copy your Client ID
6. Open `src/services/googleAuth.ts`
7. Replace `YOUR_GOOGLE_CLIENT_ID` with your actual client ID

**Without Gmail integration**: You can still compose emails and open them in Gmail or your default mail client.

### 3. Add Google API Script (For Gmail Integration)

If you set up Gmail integration, add this to `index.html` in the `<head>` section:

```html
<script src="https://apis.google.com/js/api.js"></script>
<script src="https://accounts.google.com/gsi/client"></script>
```

## 📱 How to Use

### Step 1: Upload Your Resume
1. Go to "My Resume" tab
2. Drag and drop your resume or click to upload
3. Wait for AI to parse your information
4. Review extracted skills, experience, and education

### Step 2: Review Matched Jobs
1. Go to "Job Scanner" tab
2. See all jobs automatically found based on your resume
3. Jobs are sorted by match score (highest first)
4. Click "View" to see job details

### Step 3: Apply to Jobs
1. Click "Approve & Apply" on jobs you're interested in
2. Go to "Approvals" tab
3. Review the AI-generated cover letter
4. Edit if needed
5. Click "Approve & Send" to:
   - Open in Gmail (if connected)
   - Open in default mail client
   - Copy to clipboard

### Step 4: Track Applications
1. Go to "Applications" tab
2. See all your submitted applications
3. Track status (submitted, interview, etc.)
4. Generate follow-up emails

### Step 5: Configure Settings
1. Go to "Settings" tab
2. Connect Gmail and Google accounts
3. Set job preferences:
   - Desired roles
   - Location preferences
   - Salary range
   - Job types
   - Companies to skip
4. Configure AI agent:
   - Auto-apply mode
   - Max daily applications
   - Minimum match score
   - Search frequency

## 🎯 Features

### Resume Parsing
- ✅ PDF text extraction
- ✅ Skill detection (100+ technologies)
- ✅ Experience parsing
- ✅ Education extraction
- ✅ Contact information detection

### Job Matching
- ✅ Skills-based matching (40% weight)
- ✅ Title/role matching (30% weight)
- ✅ Experience level matching (20% weight)
- ✅ Location matching (10% weight)
- ✅ Automatic ranking by match score

### Email Generation
- ✅ Professional cover letters
- ✅ Personalized for each job
- ✅ Follow-up emails
- ✅ Thank you emails after interviews
- ✅ Gmail integration
- ✅ Mail client fallback

### Data Persistence
- ✅ Local IndexedDB storage
- ✅ Resume data saved
- ✅ Jobs saved
- ✅ Applications tracked
- ✅ Settings persisted

## 🔒 Privacy & Security

- All data is stored locally in your browser
- No data is sent to external servers (except job search API if configured)
- Your resume never leaves your device
- API keys are stored in code (consider using environment variables for production)

## 🛠️ Development

### Run in Development Mode
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 📊 Data Storage

The app uses IndexedDB (via Dexie.js) with these tables:
- `resumes`: Stores parsed resume data
- `jobs`: Stores found job listings
- `applications`: Tracks your applications
- `settings`: Stores your preferences

## 🐛 Troubleshooting

### Resume won't parse
- Make sure it's a valid PDF, DOC, DOCX, or TXT file
- Check file size (max 10MB)
- Try converting to PDF if using Word documents

### No jobs found
- Check if you have a valid JSearch API key
- Without API key, mock jobs are generated
- Try uploading a more detailed resume

### Gmail integration not working
- Verify OAuth credentials are correct
- Check browser console for errors
- Make sure Gmail API is enabled in Google Cloud Console

## 🚀 Next Steps

1. Upload your real resume
2. Review the parsed information
3. Check out the matched jobs
4. Configure your preferences in Settings
5. Start applying to jobs!

## 💡 Tips for Best Results

1. **Use a clean, well-formatted resume**
   - Clear section headers (Experience, Skills, Education)
   - Standard fonts (Arial, Calibri, Times New Roman)
   - Avoid complex layouts or graphics

2. **Include relevant keywords**
   - List all your technical skills
   - Use industry-standard job titles
   - Include years of experience

3. **Keep it updated**
   - Re-upload when you gain new skills
   - Update work experience regularly
   - Refresh job search periodically

4. **Review AI suggestions**
   - Always review generated emails before sending
   - Personalize cover letters for each application
   - Check match scores and job requirements

## 📞 Support

For issues or questions:
- Check browser console for error messages
- Verify all API keys are correctly configured
- Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)

---

**Happy Job Hunting! 🎉**
