# OSIMAP Download Page - Deployment Guide

This is a standalone Next.js project for the OSIMAP download landing page, ready to be deployed to Vercel.

## 🚀 Deploy to Vercel

### Option 1: Direct from GitHub (Recommended)

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Click "New Project"** or **"Add New"** → **"Project"**
3. **Import your GitHub repository**: `simonvreyes/crime-map-proto`
4. **Select the Root Directory**: Set to `osimap-download-page/`
5. **Environment Variables**: None needed (app is fully static)
6. **Click "Deploy"**

Vercel will automatically:
- Detect Next.js configuration
- Build the project
- Deploy to a live URL
- Set up automatic deployments on git push

### Option 2: Using Vercel CLI

```bash
# Install Vercel CLI globally (if not already installed)
npm install -g vercel

# Navigate to the project directory
cd osimap-download-page

# Deploy
vercel

# For production deployment
vercel --prod
```

## 📋 Pre-deployment Checklist

- ✅ All public assets copied (images, videos, APK)
- ✅ Component and styles migrated to Next.js
- ✅ Mobile responsive design verified
- ✅ Hamburger menu and FAQ functionality tested
- ✅ Repository pushed to GitHub

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open in browser
# http://localhost:3000
```

## 📦 Build for Production

```bash
npm run build
npm start
```

## 🎯 What's Included

- **React Component** (`src/app/page.js`): Full OSIMAP landing page with all sections
- **CSS Styles** (`src/app/page.css`): Responsive design with animations and effects
- **Public Assets**: Logo, screenshots, video, APK file
- **Next.js Configuration**: Optimized for fast loading and SEO

## 🌐 Site Structure

- **Hero Section**: Eye-catching introduction with app mockups
- **AI Copilot Section**: Features and AI-powered safety system
- **Voice Alerts**: Hands-free reporting with notifications
- **About Section**: Information about the research team
- **FAQ Section**: Collapsible Q&A about the app
- **Footer**: Social links and copyright info

## 📝 Custom Domain

After deployment to Vercel, you can:

1. Go to Project Settings in Vercel
2. Navigate to **Domains**
3. Add your custom domain
4. Update DNS records as instructed

## ✨ Performance

This site is pre-optimized with:
- Next.js static generation for instant load times
- Optimized images (use Next.js `Image` component if adding more)
- CSS-in-JS with no runtime overhead
- Mobile-first responsive design

## 🆘 Troubleshooting

**Large file warning?**
- The APK file is large (~100MB). Consider hosting it on a separate CDN if needed.

**Styling not loading?**
- Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
- Rebuild locally: `npm run build`

**Images not showing?**
- Verify all files are in the `public/` folder
- Check file names match exactly (case-sensitive)

---

**Ready to deploy? Connect to Vercel and get your OSIMAP landing page live! 🚀**
