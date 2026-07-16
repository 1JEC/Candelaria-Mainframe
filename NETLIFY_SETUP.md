# Netlify Deployment Setup Guide

## Quick Start (5 minutes)

### Step 1: Connect Repository to Netlify

1. Go to [Netlify](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Select **GitHub** and authorize
4. Select the repository: `Candelaria-Mainframe`
5. Click **Deploy site**

> Netlify will attempt to deploy but fail because environment variables are missing. This is expected.

### Step 2: Configure Environment Variables

1. In Netlify dashboard, go to: **Site settings** → **Build & deploy** → **Environment**
2. Click **"Edit variables"**
3. Add the following environment variables:

#### Minimum Required (MVP Mode - Works without Database)
```
NEXTAUTH_SECRET = (generate below)
NEXTAUTH_URL = https://your-site.netlify.app
NODE_ENV = production
```

#### Full Production Setup (with Database)
```
DATABASE_URL = postgresql://user:password@host/database
NEXTAUTH_SECRET = your-secret-key
NEXTAUTH_URL = https://your-site.netlify.app
RESEND_API_KEY = re_xxxxx
NODE_ENV = production
NEXT_PUBLIC_BRAND_NAME = Candelaria Agency
```

### Step 3: Generate NEXTAUTH_SECRET

Run this command in your terminal:
```bash
openssl rand -base64 32
```

Copy the output and paste it into the `NEXTAUTH_SECRET` variable on Netlify.

### Step 4: Trigger Rebuild

1. Netlify dashboard → **Deploys**
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Wait for build to complete

✅ Your site should now be live!

---

## Environment Variables Explained

### Authentication
- **NEXTAUTH_SECRET**: Secure key for JWT signing. Generate with `openssl rand -base64 32`
- **NEXTAUTH_URL**: Your production URL (e.g., `https://mainframe-hq.netlify.app`)

### Database
- **DATABASE_URL**: PostgreSQL connection string
  - **Option 1**: Vercel Postgres (recommended)
  - **Option 2**: AWS RDS
  - **Option 3**: DigitalOcean Managed Postgres
  - **Option 4**: Supabase
  - **Option 5**: PlanetScale MySQL

### Email & Notifications
- **RESEND_API_KEY**: Resend API key for transactional emails
  - Get it from: https://resend.com

### AI & Integrations
- **ANTHROPIC_API_KEY**: Claude API key (optional, for AI features)
- **META_APP_ID** / **META_APP_SECRET**: Facebook/Instagram integration
- **X_API_KEY**: Twitter/X API key

---

## Common Issues & Solutions

### Build Failed - Exit Code 2

**Cause**: Missing `NEXTAUTH_SECRET` or `DATABASE_URL`

**Solution**: 
1. Add `NEXTAUTH_SECRET` to environment variables (required)
2. For MVP mode, DATABASE_URL is optional
3. Trigger rebuild after adding variables

### "Cannot find module" Errors

**Cause**: Dependencies not installed properly on Netlify

**Solution**:
1. Clear Netlify cache: **Deploys** → **Trigger deploy** with `--clear-cache`
2. Or: **Build & deploy** → **Build image** → Select latest Ubuntu version

### Database Connection Fails

**Cause**: DATABASE_URL format incorrect or database unreachable

**Solution**:
1. Verify connection string format: `postgresql://user:password@host:port/db`
2. Check database accepts connections from Netlify IPs
3. Test connection locally: `psql $DATABASE_URL -c "SELECT 1"`

### Site Loads But Dashboard is Empty

**Cause**: Missing database connection (expected for MVP)

**Solution**: This is normal for MVP mode. The dashboard will show demo data.

---

## Database Setup (Optional but Recommended)

### Using Vercel Postgres (Recommended)

1. Create account at [Vercel](https://vercel.com)
2. Create Postgres database
3. Copy connection string
4. Add to Netlify as `DATABASE_URL`
5. Run migrations: `npm run db:push`

### Using DigitalOcean Managed Databases

1. Create Postgres cluster on DigitalOcean
2. Get connection string from dashboard
3. Add to Netlify as `DATABASE_URL`
4. Allow Netlify IPs in firewall rules
5. Run migrations: `npm run db:push`

---

## Monitoring & Maintenance

### Enable Netlify Analytics
- Netlify dashboard → **Analytics** → Enable
- Track pageviews, performance metrics

### Enable Netlify Functions Logging
- Deploy logs visible in: **Deploys** → Click deploy → **Deploy log**
- Application logs: **Functions** → Select function → View logs

### Set Up Error Tracking (Optional)
- Integrate with [Sentry](https://sentry.io) for error monitoring
- Add `SENTRY_DSN` to environment variables

---

## Production Checklist

- [ ] Environment variables configured on Netlify
- [ ] NEXTAUTH_SECRET generated and set
- [ ] NEXTAUTH_URL matches your production domain
- [ ] Database configured (if using)
- [ ] Build succeeds without errors
- [ ] Dashboard loads and renders correctly
- [ ] Login works with demo credentials
- [ ] Monitor first 24 hours for errors

---

## Rollback

If deployment fails:

1. Netlify dashboard → **Deploys**
2. Find previous successful deploy
3. Click **...** → **Publish deploy**

This reverts to the last working version instantly.

---

## Support

- Netlify Docs: https://docs.netlify.com
- Next.js Deployment: https://nextjs.org/docs/deployment
- NextAuth Docs: https://next-auth.js.org

For issues specific to this project, check:
- Local build: `npm run build`
- Dev server: `npm run dev`
- Git logs: `git log --oneline`
