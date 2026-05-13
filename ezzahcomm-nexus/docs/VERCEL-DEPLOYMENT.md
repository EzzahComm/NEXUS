# Vercel Deployment Guide - CPA Otene Website

## Prerequisites

- Vercel Account: https://vercel.com
- GitHub Account with the repository: https://github.com/EzzahComm/cpaotene
- Supabase Project: https://xdjmeteugjxoitknmzhz.supabase.co

## Step 1: Connect to Vercel

1. Go to https://vercel.com/ezzahcomm-kitabu-yetu
2. Click "Add New..." > "Project"
3. Select "Import Git Repository"
4. Connect your GitHub account and select: `EzzahComm/cpaotene`
5. Vercel will auto-detect Next.js and configure automatically

## Step 2: Set Environment Variables

In Vercel Dashboard > Settings > Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://xdjmeteugjxoitknmzhz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Your anon key from Supabase]
SUPABASE_SERVICE_ROLE_KEY=[Your service_role key from Supabase]
RESEND_API_KEY=[Your Resend API key - optional for emails]
```

## Step 3: Deploy

Once environment variables are set:

1. Click "Deploy"
2. Vercel will build and deploy automatically
3. Your site will be live at: `https://cpaotene.vercel.app` (or custom domain)

## Step 4: Configure Database (One-time)

1. Go to Supabase Dashboard > SQL Editor
2. Run the schema from: `/supabase/schema.sql`
3. This creates all tables for contacts, invoices, documents, etc.

## Continuous Deployment

- Push to `main` branch on GitHub
- Vercel automatically builds and deploys
- Preview deployments for pull requests

## Custom Domain Setup

1. Vercel Dashboard > Settings > Domains
2. Add your custom domain (e.g., cpaotene.co.ke)
3. Update DNS records as per Vercel instructions

## Monitoring

- View logs: Vercel Dashboard > Deployments > Logs
- Errors: Vercel Dashboard > Edge Logs
- Analytics: Vercel Dashboard > Analytics

## Rollback

If deployment has issues:
1. Vercel Dashboard > Deployments
2. Find previous working deployment
3. Click "Promote to Production"

## Environment-Specific Builds

- **Production**: Deploys from `main` branch
- **Preview**: Auto-created for pull requests
- **Development**: Local `npm run dev`
