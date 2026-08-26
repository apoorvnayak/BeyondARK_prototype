# BeyondArk — Digital Platform for Authentic Local Experiences and Artisans

**Smart India Hackathon 2026 · Problem Statement 50 · Theme: Tourism · Team: BeyondArk**

```
beyondark/
├── backend/    Express + EJS + MongoDB app (all logic, routes, views, auth, DB)
└── frontend/   Static CSS/JS assets, deployable on their own to a CDN
```

## Why it's split this way

The app's pages are **server-rendered** (EJS) — Express builds the HTML, so the
actual page logic has to live with the backend, not in a separate SPA. What genuinely
*can* be deployed independently is the static, rarely-changing part: `style.css` and
`main.js`. Splitting on that line gives you two small, independently-deployable
pieces instead of one — with the frontend on a fast CDN and the backend free to
scale/restart on its own — while keeping local development a single `npm start`.

Dynamic, user-generated files (Aadhaar doc photos, experience images when Cloudinary
isn't configured) stay with the **backend**, since they're created at runtime, not
part of the static asset bundle.

## Quick start (local dev — one command, no separate deploy needed)

```bash
cd backend
npm install
cp .env.example .env      # set MONGO_URI at minimum, leave ASSET_BASE_URL blank
npm run seed               # optional demo data
npm start
```

Visit `http://localhost:3000`. With `ASSET_BASE_URL` left blank, the backend
automatically serves `../frontend/public` itself — so you get the full split
repo structure without needing two terminals or two deploys just to develop.

If you'd rather preview the frontend assets on their own (e.g. while styling):
```bash
cd frontend
npm install
npm start        # serves http://localhost:5173
```

## Deploying for real (two services)

1. **Frontend** → deploy the `frontend/` folder to Netlify, Vercel, or Cloudflare
   Pages as a static site (publish directory: `public`). You'll get a URL like
   `https://beyondark-frontend.netlify.app`.
2. **Backend** → deploy the `backend/` folder to Render, Railway, Fly.io, or
   similar as a Node web service. In its environment variables, set
   `ASSET_BASE_URL` to the frontend URL from step 1, plus `MONGO_URI` (Atlas),
   `SESSION_SECRET`, and whichever of Google OAuth / Mapbox / Cloudinary / SMTP
   keys you have — all are optional and degrade gracefully (see
   `backend/README.md`).

Each folder has its own `package.json` and `.env.example` so the two can be
pushed to separate git repos/services without one depending on the other's
build step.

## Full documentation
# BeyondArk — Digital Platform for Authentic Local Experiences and Artisans

**Smart India Hackathon 2026 · Problem Statement 50 · Theme: Tourism · Team: BeyondArk**

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

