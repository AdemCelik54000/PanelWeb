# Clauddepo – Mobile Portfolio Image Uploader

This project is a **mobile-friendly web application** designed to simplify portfolio management for professionals. It allows users to upload, organize, and manage images in a structured way, with support for multiple clients (tenants) and work scheduling features.

Built with **Netlify Functions** (in `netlify/functions`) + a Vite frontend.

## What the App Does

- **Image Upload & Management**: Easily upload images to Cloudinary, list them, reorder, and delete as needed. Perfect for portfolios, galleries, or client presentations.
- **Multi-Tenant Support**: Add and manage multiple clients/tenants, each with their own secure folder and settings.
- **Work Schedule (Emploi du Temps)**: View and edit working hours and schedules for each tenant, including per-day start/end times.
- **Mobile-Optimized**: Designed for mobile devices with a responsive PWA (Progressive Web App) interface.
- **Secure Authentication**: JWT-based login with hashed passwords for tenant access.

## Testing Locally (with Environment Variables)

1) Install dependencies

- `npm install`

2) Create a `.env` file from the example

- Copy `.env.example` → `.env`
- Fill with **TEST keys** (Supabase + Cloudinary) to avoid using production credits.

Required environment variables for functions:
- `AUTH_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_UPLOAD_PRESET`

3) Run local Netlify dev (proxy + functions)

- `npm run dev:netlify`

Or (recommended single command):
- `npm run local`
	- runs `npm install` if needed
	- creates `.env` from `.env.example` if missing
	- starts `netlify dev`

URLs:
- App + functions: `http://localhost:8888/`
- The app serves `/upload.html` and calls `/.netlify/functions/*` just like in production.

## Important Notes

- Locally, **Cloudinary upload** now uses `cloud_name` + `upload_preset` returned by `/.netlify/functions/sign-upload`, so you can switch accounts by changing variables in `.env`.
- Never commit secrets to the repo (`.env` is ignored by git).

## Feature Flags (in `tenants` table)

Two boolean columns allow enabling/disabling features in the panel:

- `image`: enables/disables image-related features (upload, listing, deletion, reordering)
- `emploi_du_temps`: enables/disables work schedule display and editing

Migration SQL: `supabase/migrations/20260122_add_tenants_feature_flags.sql`
