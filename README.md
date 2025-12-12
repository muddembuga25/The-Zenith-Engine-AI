
# Zenith Engine AI

An AI-powered content automation platform for WordPress, Social Media, and Video.

## 🚀 Quick Start

### 1. Database Setup (Supabase)
1. Create a new project at [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your dashboard.
3. Open `supabase/schema.sql` from this project, copy the content, and run it in the SQL Editor. This creates the necessary tables and security policies.

### 2. Environment Variables
Create a `.env` file in the root directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Google Gemini API
API_KEY=your-google-api-key

# Redis (for Background Workers)
REDIS_URL=redis://localhost:6379 
# Note: For production/docker, use redis://redis:6379

# Worker Configuration (Optional defaults)
CMS_CONCURRENCY=5
MEDIA_CONCURRENCY=1
```

### 3. Run Locally (Development)

**Option A: Docker (Recommended)**
Ensures Redis and all services run together.
```bash
docker-compose up --build
```

**Option B: Manual**
You must have a Redis instance running locally.
1. Install dependencies: `npm install`
2. Start the Worker (Terminal 1): `npm run start:worker`
3. Start the API Server (Terminal 2): `npm run start:server`
4. Start the Frontend (Terminal 3): `npm run dev`

## 🏗 Architecture

- **Frontend**: React + Vite + Tailwind CSS
- **Backend API**: Express + Node.js
- **Job Queue**: BullMQ + Redis
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini Pro & Flash, Imagen 3, Veo

## 🛠 Troubleshooting

- **"Configuration Missing" Error:** Ensure your `.env` file exists and `SUPABASE_URL`/`SUPABASE_ANON_KEY` are correct. Restart the server after changing env vars.
- **Login Fails:** Ensure you ran the `schema.sql` script in Supabase. The app needs the `profiles` table to store user data.
