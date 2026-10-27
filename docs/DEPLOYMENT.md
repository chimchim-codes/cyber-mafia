# CYBER MAFIA — Vercel & Supabase Production Deployment Guide

## 1. Hosting Architecture
CYBER MAFIA is architected exclusively for **Vercel** and **Supabase**:
- **Vercel**: Static React + Vite frontend hosting and Serverless API functions under `/api/*`.
- **Supabase**: PostgreSQL database, Realtime pub/sub subscriptions, and Row Level Security.

No always-running Express or Socket.IO server process is required in production.

---

## 2. Supabase Setup
1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard and run the schema file:
   [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql).
3. Note your project credentials from **Project Settings** ➔ **API**:
   - `Project URL`
   - `anon` Public Key
   - `service_role` Secret Key

---

## 3. Vercel Deployment

### 3.1 Via Vercel Web Dashboard (Git Integration)
1. Push your repository to GitHub.
2. In Vercel, click **Add New Project** and import the repository.
3. Configure the Build & Development Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (Leave as root)
   - **Build Command**: `npm --prefix client run build`
   - **Output Directory**: `client/dist`
4. Add the following **Environment Variables** in Vercel:
   | Variable | Value | Scope |
   | :--- | :--- | :--- |
   | `SUPABASE_URL` | `https://your-project-id.supabase.co` | Serverless API |
   | `SUPABASE_ANON_KEY` | `your-anon-public-key` | Serverless API |
   | `SUPABASE_SERVICE_ROLE_KEY` | `your-service-role-secret-key` | Serverless API (**Never prefix with VITE_**) |
   | `ADMIN_SECRET_KEY` | `your-secure-admin-passphrase` | Serverless API |
   | `VITE_SUPABASE_URL` | `https://your-project-id.supabase.co` | Frontend Client |
   | `VITE_SUPABASE_ANON_KEY` | `your-anon-public-key` | Frontend Client |
5. Click **Deploy**.

### 3.2 Via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

---

## 4. Local Development

To run the application locally with full serverless routing simulation:
```bash
# 1. Install dependencies
npm install
npm --prefix client install

# 2. Build client assets
npm run build

# 3. Run automated tests
npm test

# 4. Start local development server (serves API and client fallback)
npm start
```
The server will be available at `http://localhost:3001`.

---

## 5. Free-Tier Usage & Quota Guidelines

### 5.1 Supabase Free Plan Limits
- **Active Connections**: Free-tier PostgreSQL supports up to 60 direct connections. Serverless functions use transaction pooling (`port 6543`) to avoid exhausting the connection pool.
- **Realtime Quota**: Up to 200 concurrent connected clients and 2 million messages/month. This is more than sufficient for a campus CTF or collegiate hackathon with 10–50 teams.
- **Database Egress**: 5 GB bandwidth/month.

### 5.2 Vercel Free (Hobby) Plan Limits
- **Serverless Execution Timeout**: 10 seconds default on Hobby plan. All CYBER MAFIA endpoints execute in < 25ms.
- **Fast Data Transfer**: 100 GB/month.

### 5.3 Collegiate & Tournament Best Practices
- Advise squad leads to bookmark their room URL.
- If squads close their browser tab, they simply rejoin their assigned squad ID (`C01` to `C15`) to seamlessly restore all validated progress.
- Match timings, pause states, and leaderboard rankings persist across all client disconnections and serverless function cold starts.
