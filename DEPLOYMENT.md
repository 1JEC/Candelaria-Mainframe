# Deployment Guide — Mainframe HQ to Netlify

## Overview
The Mainframe HQ portal is now ready for production deployment on Netlify with a premium dashboard design.

## What's Ready

✅ **Production Build** - Fully optimized Next.js build  
✅ **Premium UI** - Professional sidebar navigation and dashboard  
✅ **Database Integration** - Postgres via Vercel  
✅ **Authentication** - NextAuth v4 with JWT  
✅ **API Routes** - All endpoints configured  
✅ **Netlify Config** - `netlify.toml` created  

## Quick Start — Deploy to Netlify

### Step 1: Push to GitHub
```bash
cd /Users/jcandelaria/mainframe-hq

# Initialize git if not already done
git init
git add .
git commit -m "Deploy premium Mainframe HQ portal to production"
git remote add origin https://github.com/yourusername/mainframe-hq
git branch -M main
git push -u origin main
```

### Step 2: Connect to Netlify
1. Go to [Netlify](https://netlify.com)
2. Click **"New site from Git"**
3. Connect your GitHub repository
4. Select the `mainframe-hq` repo

### Step 3: Configure Environment Variables
In the Netlify dashboard, go to **Site settings → Build & deploy → Environment**

Add these variables:
```
NEXTAUTH_SECRET = your-secret-key-here
NEXTAUTH_URL = https://your-site.netlify.app
DATABASE_URL = your-postgres-connection-string
RESEND_API_KEY = your-resend-key
```

### Step 4: Deploy
The site will automatically deploy when you push to the `main` branch.

## Environment Setup

### Required Environment Variables
```env
NEXTAUTH_SECRET="production-secret-key" # Generate with: openssl rand -base64 32
NEXTAUTH_URL="https://your-domain.netlify.app"
DATABASE_URL="postgresql://user:password@host/dbname"
RESEND_API_KEY="re_xxxxx"
```

### Generate NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```

## Custom Domain Setup

1. In Netlify dashboard: **Site settings → Domain management**
2. Click **"Add domain"**
3. Enter your domain (e.g., `mainframe.yourdomain.com`)
4. Follow DNS configuration instructions

## Build Info

- **Framework**: Next.js 15
- **Node Version**: 18+ (recommended 20)
- **Build Command**: `npm run build`
- **Dev Command**: `npm run dev`
- **Output Directory**: `.next`

## Production Features

### Performance
- ✅ Optimized bundle size (103 kB shared)
- ✅ Static page generation where possible
- ✅ API route caching configured
- ✅ Image optimization enabled

### Security
- ✅ CSRF protection via NextAuth
- ✅ Secure session handling (JWT)
- ✅ Environment variables never exposed
- ✅ API routes protected by auth middleware

### Monitoring
Add these in Netlify dashboard for production monitoring:
- Build notifications
- Error tracking (Sentry integration available)
- Analytics

## Database Connection

For production database:

### Option 1: Vercel Postgres (Recommended)
```bash
npm install @vercel/postgres
```
Connection string will be provided in Vercel dashboard.

### Option 2: Third-party Postgres
- Amazon RDS
- DigitalOcean Managed Databases
- Supabase
- Any PostgreSQL host

Add connection string to `.env.production`:
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
```

## Pre-deployment Checklist

- [ ] All environment variables configured
- [ ] Database connection tested
- [ ] Authentication secrets generated
- [ ] `.env.local` is in `.gitignore`
- [ ] Build completes without errors: `npm run build`
- [ ] All tests pass: `npm test`
- [ ] Production URL configured in `NEXTAUTH_URL`

## Troubleshooting

### Build Fails
1. Check Node version: `node --version` (18+ required)
2. Verify all dependencies: `npm install`
3. Clear cache: `rm -rf .next node_modules`
4. Rebuild: `npm run build`

### Database Connection Issues
1. Test connection: `psql $DATABASE_URL`
2. Verify `DATABASE_URL` format includes `?sslmode=require` for remote DBs
3. Check Netlify function timeout (30s default)

### Authentication Not Working
1. Verify `NEXTAUTH_SECRET` is set
2. Verify `NEXTAUTH_URL` matches production domain
3. Check `/api/auth/signin` responds with 200

## Support Resources

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Netlify Build Configuration](https://docs.netlify.com/build-info/overview/)
- [NextAuth Documentation](https://next-auth.js.org/deployment)

## Status

- 🟢 Production build: **READY**
- 🟢 Premium UI: **READY**
- 🟢 Authentication: **READY**
- 🟢 API endpoints: **READY**
- 🟠 Database: **REQUIRES SETUP**
- 🟠 Environment vars: **REQUIRES SETUP**

---

**Ready to deploy?** Follow the "Quick Start" section above!
