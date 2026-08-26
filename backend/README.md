# BeyondArk — Backend

> Part of the split repo — see the [top-level README](../README.md) for how this
> folder relates to `../frontend`. This document covers the backend in depth.

A working prototype of the platform described in the team's idea submission: tourists
discover **verified** local artisans and community-led experiences, book a date & time,
and pay a **transparent, upfront price** — while artisans get a simple onboarding,
identity verification, and listing flow.

This codebase follows the exact tech stack and process workflow from the team's SIH
submission slides (`SIH_2026.pptx`, slides 2–3).

## Tech stack (as specified in the submission)

| Layer | Tech |
|---|---|
| Frontend | HTML, CSS, JavaScript, EJS |
| Backend | Node.js, Express.js, REST-style routes |
| Database | MongoDB + Mongoose |
| Auth & Security | Passport.js (Google OAuth + local), express-session, connect-mongo, nodemailer |
| Services | Mapbox (map feature), Cloudinary (image storage) |

## The pipeline this app implements

This mirrors the process-workflow diagram from slide 3 exactly:

```
START → Google OAuth Login → Profile Creation → Select Role
                                                     │
                     ┌───────────────────────────────┴───────────────────────────────┐
                     ▼                                                                 ▼
                 TOURIST                                                           PROVIDER
  Discover → View → Read story → Request Date & Time                Fill Details → Aadhaar Verification → Admin Review
                     │                                                     │                      │
              Provider Review Request                              Reject → Re-submit      Accept → Verified
              │                    │                                                              │
           Reject               Accept ───────────────┐                                  Create Experience
              │                                        │                                          │
      Suggest Date & Time                              │                                    Admin Review
              │                                        │                                    │          │
       Tourist Reject/Accept                           │                                 Reject      Accept
              │                                        │                                    │            │
       Accept ─────────────────────────────────────────┤                               (edit &        Publish
                                                          ▼                              re-submit)
                                                 Booking Confirmed
                                                          │
                                                  Attend Experience
                                                          │
                                                  Ratings & Reviews
```

Every one of these steps has a matching route, view, and MongoDB status field —
see **Where each pipeline step lives in the code** below.

## Getting started

### 1. Prerequisites
- Node.js 18+
- MongoDB running locally (`mongod`) **or** a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### 2. Install & configure
```bash
cd backend
npm install
cp .env.example .env
```
Open `.env` and at minimum set `MONGO_URI` and `SESSION_SECRET`. Everything else
(Google OAuth, Mapbox, Cloudinary, SMTP, `ASSET_BASE_URL`) is **optional for local
dev** — the app degrades gracefully when a key is missing (see table below).

### 3. (Optional but recommended) Seed demo data
```bash
npm run seed
```
This creates an admin, three artisans (two verified, one pending review), two
tourists, two published experiences, and two bookings mid-flow — enough to click
through the entire pipeline immediately. All seeded accounts use the password
`password123`. Credentials are printed at the end of the seed script.

### 4. Run it
```bash
npm start        # or: npm run dev  (with nodemon)
```
Visit `http://localhost:3000`.

## Demo walkthrough (after seeding)

1. **As a tourist** — log in as `arjun@beyondark.local`. Browse `/tourist`, open the
   Blue Pottery Workshop, and check the pending "provider_countered" booking under
   *My Bookings* to accept/decline the artisan's suggested time.
2. **As a provider** — log in as `meera@beyondark.local` (already verified). Go to
   `/provider` to accept or counter-offer the pending booking request, or create a
   new experience.
3. **As an unverified provider** — log in as `rakesh@beyondark.local` to see the
   "verification in progress" state.
4. **As admin** — log in as `admin@beyondark.local` and go to `/admin` to verify
   Rakesh's identity and publish his pending "Pithora Ritual Painting Session".

## Where each pipeline step lives in the code

| Diagram step | Route(s) | Model field |
|---|---|---|
| Google OAuth Login / Profile Creation | `routes/auth.js` (`/auth/google`, `/signup`, `/login`) | `User` |
| Select Role | `routes/auth.js` (`/select-role`) | `User.role` |
| Discover / View / Read story | `routes/tourist.js` (`GET /tourist`, `/tourist/experience/:id`) | `Experience` |
| Request Date & Time | `routes/tourist.js` (`POST /tourist/experience/:id/book`) | `Booking.requestedDate/Time`, status `requested` |
| Provider Review Request (Accept) | `routes/provider.js` (`POST /provider/bookings/:id/accept`) | status → `confirmed` |
| Provider Review Request (Reject) → Suggest Date & Time | `routes/provider.js` (`POST /provider/bookings/:id/counter`) | status → `provider_countered` |
| Tourist Reject/Accept the counter-offer | `routes/tourist.js` (`/accept-counter`, `/reject-counter`) | status → `confirmed` / `cancelled` |
| Booking Confirmed → Attend Experience | `routes/tourist.js` (`POST /tourist/bookings/:id/attend`) | status → `completed` |
| Ratings & Reviews | `routes/tourist.js` (`POST /tourist/bookings/:id/review`) | status → `reviewed`, `Booking.rating/reviewComment` |
| Fill Details → Aadhaar Verification | `routes/provider.js` (`GET/POST /provider/onboarding`) | `User.providerProfile.*` |
| Admin Review (provider) → Verified / Re-submit | `routes/admin.js` (`/providers/:id/verify`, `/reject`) | `verificationStatus` |
| Create Experience | `routes/provider.js` (`/provider/experiences/new`, `POST /provider/experiences`) | `Experience`, status `pending_review` |
| Admin Review (experience) → Publish | `routes/admin.js` (`/experiences/:id/publish`, `/reject`) | `Experience.status` |

## Graceful fallbacks (so the prototype runs without every API key)

| Feature | With key configured | Without key |
|---|---|---|
| Google OAuth | One-click Google login | Email/password login (fully functional) still shown |
| Cloudinary | Images uploaded to your Cloudinary account | Falls back to local disk storage under `public/uploads/` |
| Mapbox | Interactive map on the experience page | A friendly placeholder message instead of a blank map |
| SMTP (nodemailer) | Real emails sent for bookings/verification updates | Emails are logged to the server console instead |
| `ASSET_BASE_URL` | CSS/JS loaded from your deployed `../frontend` (Netlify/Vercel/CDN) | Backend auto-serves `../frontend/public` itself, if that folder exists locally |

⚠️ **Local-disk uploads don't survive redeploys on most hosts** (Render free tier,
Heroku, etc. use an ephemeral filesystem). Fine for local dev; set the Cloudinary
keys before deploying the backend anywhere real.

## Honest scope notes (read before a judge asks)

- **Aadhaar verification is simulated for the prototype.** Real Aadhaar e-KYC requires
  UIDAI-licensed AUA/KUA integration, which isn't accessible for a hackathon build. The
  app collects the last 4 digits of the Aadhaar number plus a photo of the ID document,
  and an **admin manually reviews and approves it** — the same trust outcome, without
  claiming a live UIDAI integration that isn't actually there. Swapping in a real
  e-KYC provider later only touches `routes/provider.js` and the `User.providerProfile`
  fields, not the rest of the app.
- **"Attend Experience" is tourist-marked** rather than automatically detected by date,
  to keep the demo clickable without waiting for a real date to pass.
- Multilingual support currently covers Hindi translations for experience title/story
  (stored on the `Experience` model) plus a site-wide EN/हिं toggle — a good foundation
  to extend to more languages and more fields.

## Project structure

```
backend/
├── server.js               # Express app entry point (also wires up ../frontend for local dev)
├── config/                  # db, passport, cloudinary, mailer, seed script
├── models/                  # User, Experience, Booking (Mongoose)
├── middleware/               # auth guards, upload handling
├── routes/                   # index, auth, tourist, provider, admin
├── views/                     # EJS templates (layout + partials + role folders)
└── public/uploads/             # local fallback storage for uploaded images only
                                  (css/js live in ../frontend/public — see top-level README)
```
