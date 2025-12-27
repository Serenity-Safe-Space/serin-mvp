# Serin - Vercel Deployment Guide

## ✅ Pre-Deployment Checklist

- [x] `vercel.json` created for SPA routing
- [x] Build process tested locally (`npm run build` works)
- [x] Environment variables ready to configure

## 🚀 Deployment Steps

### 1. Vercel Setup

1. **Connect Repository:**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "Add New" → "Project"
   - Import your GitHub repository

2. **Build Configuration:**
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### 2. Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables and add:

```env
# Get these values from your Supabase project settings
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key

# IMPORTANT: API keys should NOT have the VITE_ prefix!
# Server-side only - these stay secure and are never exposed to the browser
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
```

**Important:**
- Set Environment to **Production**, **Preview**, and **Development**
- Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` should have the `VITE_` prefix (these are safe for client-side)
- `GEMINI_API_KEY` and `OPENAI_API_KEY` must NOT have the `VITE_` prefix to keep them secure on the server

### 3. Supabase Configuration Updates

Once your Vercel domain is assigned (e.g., `your-app.vercel.app`):

1. **Update Authentication Settings:**
   - Go to Supabase Dashboard → Authentication → Settings
   - Change **Site URL** from `http://localhost:5173` to `https://your-app.vercel.app`
   - Add to **Redirect URLs**: `https://your-app.vercel.app/**`

2. **Email Template Updates:**
   - Authentication → Email Templates
   - Update any custom templates to use your production domain

### 4. Deploy

1. **Automatic Deployment:**
   - Push your code to GitHub
   - Vercel will automatically deploy
   - Check deployment logs for any issues

2. **Manual Deployment:**
   - In Vercel dashboard, click "Deploy"
   - Monitor build process

## 🧪 Post-Deployment Testing

### Test Authentication Flow:
1. **Sign Up Process:**
   - Visit your Vercel domain
   - Try creating a new account
   - Check for email confirmation (should come from your domain)
   - Confirm email and test sign-in

2. **Existing User Sign In:**
   - Test with previously created accounts
   - Verify session persistence

3. **Navigation:**
   - Test all routes (`/`, `/chat`)
   - Ensure React Router works with Vercel routing

### Test Features:
- ✅ Profile popup shows user email
- ✅ Sign out functionality works
- ✅ Chat page loads (if Gemini API key is set)
- ✅ Authentication persists on page refresh

## 🔧 Troubleshooting

### Common Issues:

1. **404 on page refresh:**
   - Ensure `vercel.json` is properly configured
   - Check that all routes redirect to `/index.html`

2. **Environment variables not working:**
   - Verify all variables are prefixed with `VITE_`
   - Check they're set for the correct environment (Production)
   - Redeploy after adding variables

3. **Authentication not working:**
   - Verify Supabase Site URL matches your Vercel domain
   - Check redirect URLs include your domain
   - Ensure publishable key is correct

4. **Email confirmation links broken:**
   - Update Supabase Site URL to production domain
   - Test email confirmation flow with production emails

## 📊 Performance Notes

- **Build size:** ~382KB (gzipped: ~114KB)
- **Dependencies:** React, Supabase, Gemini AI
- **Static assets:** Optimized by Vite
- **CDN:** Automatically handled by Vercel

## 🔄 Updates and Redeployment

For future changes:
1. Push to GitHub main branch
2. Vercel automatically redeploys
3. Test authentication flow after each deployment
4. Monitor Vercel deployment logs for issues

Your Serin app is now ready for production deployment! 🎉