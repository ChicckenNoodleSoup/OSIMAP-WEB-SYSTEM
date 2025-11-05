# OSIMAP Download Page

A beautiful, responsive landing page for the OSIMAP mobile app - built with Next.js for optimal performance and Vercel deployment.

![OSIMAP](public/osimap-logo.svg)

## 📱 Features

- **Hero Section**: Stunning introduction with 3D phone mockups
- **AI Copilot Section**: Showcase of real-time accident analysis
- **Voice Alerts**: Hands-free reporting with floating notifications
- **Researcher Profile**: Team and mission information
- **FAQ Section**: Collapsible questions and answers
- **Responsive Design**: Fully optimized for mobile, tablet, and desktop
- **Smooth Animations**: Modern transitions and effects
- **SEO Optimized**: Metadata and structured content

## 🚀 Getting Started

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open browser
# http://localhost:3000
```

### Build for Production

```bash
npm run build
npm start
```

## 📦 Project Structure

```
src/app/
├── page.js          # React component (all sections)
├── page.css         # Responsive styling
├── layout.tsx       # Next.js metadata and layout
└── globals.css      # Global styles

public/
├── osimap-logo.svg
├── map.png, welcome.png, stats.png, etc.
├── OSIMAP-vid.mov
└── osimap-latest.apk
```

## 🌐 Deploy to Vercel

### Quick Deployment (Recommended)

1. Visit [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **New Project**
3. Import `simonvreyes/crime-map-proto`
4. Set Root Directory to `osimap-download-page/`
5. Click **Deploy**

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Using Vercel CLI

```bash
npm install -g vercel
vercel --prod
```

## ⚙️ Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org) with Turbopack
- **React**: 19 with Hooks
- **Styling**: Pure CSS with animations
- **Deployment**: Vercel (serverless platform)
- **Version Control**: Git + GitHub

## 📝 Responsive Breakpoints

- **Mobile Portrait**: 480px and below
- **Mobile Landscape**: 768px and below  
- **Tablet**: 1024px and below
- **Desktop**: 1200px and above

## 🎨 Design System

- **Primary Color**: `#0085FF` (Bright Blue)
- **Accent Colors**: `#f8ff33` (Yellow), `#95ff44` (Green)
- **Background**: Dark to blue gradient
- **Typography**: System fonts with antialiasing

## 📈 Performance

- ✅ Fully static - zero dynamic rendering
- ✅ Auto-optimized images
- ✅ CSS-in-JS with no runtime overhead
- ✅ Mobile-first approach
- ✅ SEO-friendly metadata

## 🔄 Updates & Maintenance

Edit `src/app/page.js` to modify content or functionality.
Edit `src/app/page.css` to change styling.

Changes will hot-reload in development mode.

## 📄 License

This project is part of OSIMAP and follows the repository's license.

---

**Ready to go live? Deploy to Vercel with one click! 🚀**

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step deployment guide.
