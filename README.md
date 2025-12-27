# Vanta Dashboard - Vercel Deployment

This is the Vercel-compatible version of the Vanta Admin Dashboard.

## Files to Push to GitHub

```
your-repo/
├── dashboard.html
├── vercel.json
├── package.json (root level - optional, for reference)
├── api/
│   ├── index.js
│   └── package.json
└── README.md (this file)
```

## Setup Instructions

1. **Create a GitHub Repository** with these files
2. **Connect to Vercel**:
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repo
   - Add Environment Variables (.env):
     ```
     ADMIN_PASSWORD=your_admin_password
     JWT_SECRET=your_jwt_secret
     ```

3. **Deploy** - Vercel will automatically deploy

## For Discord Bot

The Discord bot should be hosted separately on:
- Railway.app
- Render.com
- Heroku
- Your own VPS

And set `APP_URL` to your Vercel domain in the bot's `.env`
