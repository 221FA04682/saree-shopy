# Deployment Guide

## Frontend on Vercel

Project settings:

- Root Directory: `saree-shop`
- Framework Preset: `Other`
- Build Command: `npm run build`
- Output Directory: `dist/saree-shop/browser`

This frontend uses `'/api'` in production, so Vercel should proxy API requests to Render.

Add this rewrite in the Vercel dashboard after you know your Render URL:

- Source: `/api/(.*)`
- Destination: `https://your-render-service.onrender.com/api/$1`

If you use image uploads, also add:

- Source: `/uploads/(.*)`
- Destination: `https://your-render-service.onrender.com/uploads/$1`

## Backend on Render

Deploy the `vastra-backend` folder as a Node web service, or use the included `render.yaml`.

Render settings:

- Root Directory: `vastra-backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Set these environment variables in Render:

- `MONGO_URI`: your MongoDB Atlas connection string
- `JWT_SECRET`: a long random secret
- `CLIENT_URL`: your Vercel frontend URL, for example `https://your-app.vercel.app`
- `SERVER_URL`: your Render backend URL, for example `https://your-render-service.onrender.com`
- `NODE_ENV`: `production`
- `ADMIN_EMAIL`: email for the first admin account
- `ADMIN_PASSWORD`: password for the first admin account
- `ADMIN_NAME`: optional admin display name
- `ADMIN_PHONE`: optional admin phone number

If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set, the backend will auto-create that admin user on startup if it does not already exist.

During local development, you can still keep:

- `CLIENT_URL=http://localhost:4200`
- `SERVER_URL=http://localhost:5000`

## Important Note About Uploads

This backend stores uploaded images on the local filesystem under `uploads/`. On Render, local files are ephemeral unless you attach persistent storage. That means uploaded images can disappear after redeploys or restarts.

For production, the safer long-term option is moving uploads to cloud storage like Cloudinary, S3, or Supabase Storage.
