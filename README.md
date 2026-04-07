# FoodBridge

FoodBridge is a full-stack MERN application for intelligent food waste management. It connects restaurants with NGOs, animal husbandry owners, and industrial units using safety-based auto-classification, expiry-aware routing, and waste analytics.

## Structure

```text
backend/   Express + MongoDB API + Socket.IO
frontend/  React + Tailwind + Vite client
```

## Quick Start

1. Create `.env` in `backend/` using the variables described below.
2. Install dependencies:
   - `cd backend && npm install`
   - `cd frontend && npm install`
3. Start MongoDB locally.
4. Run:
   - `cd backend && npm run dev`
   - `cd frontend && npm run dev`

## Backend Environment

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/foodbridge
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
GOOGLE_MAPS_API_KEY=your_google_maps_key
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

## Features

- JWT auth with role-based access
- Food listing auto-classification by safety score
- Auto-downgrade cron job
- Nearby recipient notification routing
- Restaurant waste analytics and prototype prediction engine
- Role-based dashboards with countdown timers and live notifications

