# Inside the Sneakers

Production website for **Inside the Sneakers**.

## Live site

- Primary domain: `https://inthesneakers.life/`
- Source repo: `Revengeserved/inthesneakers.life`
- Current intended page type: expanded homepage / landing page hybrid
- Current public links: Venmo + Medium blog only
- Recent blog posts should appear in the homepage posts section when the Medium feed loads

## Project boundary

This repo is only for the Inside the Sneakers public website and brand system.

It should include:

- Website homepage files
- Brand assets, logo, banner, and visual identity
- Fundraiser/support copy
- Medium/blog/social links and public storytelling copy
- Deployment notes for the website

It should **not** include:

- Madera / Modera apartment evidence
- VA/legal packets
- Lease disputes, resident ledgers, or legal correspondence
- Private case documents that belong in the legal project
- Cash App links or Cash App donation copy

## What this repo should contain

This is intentionally focused:

- `index.html` — the homepage with hero, story, proof/timeline, latest posts, support, and Medium sections
- `hero-redesign.css` — the homepage styling with the Oakland Tribune-inspired palette
- `Inthesneakers-1.jpeg` — the hero/background image asset
- `vercel.json` — Vercel static-site routing/security config if Vercel is connected
- `README.md` — this launch note

No legal evidence, no VA packet files, no generated analytics reports, no Cash App links, and no confusing mixed-project files.

## Google Analytics

GA4 is installed directly in `index.html` with the production measurement ID:

- `G-MXG8LMSNDE`

The verified numeric GA4 Property ID used by the Google Analytics Data API is:

- `392399720`

Tracked events currently emitted by the homepage:

- `click_donate_venmo`
- `click_read_introduction`
- `click_continue_on_medium`
- `click_featured_housing_story`

The protected admin analytics endpoint requires:

- `ANALYTICS_API_TOKEN`
- `GOOGLE_SERVICE_ACCOUNT_JSON`

The numeric GA4 Property ID is intentionally fixed in `api/analytics.js` so the deployed API cannot drift between conflicting environment-variable values.

To verify client-side tracking: open Google Analytics → Realtime → visit the site → tap the buttons.

## Vercel setup target

Vercel should be connected to this GitHub repo:

- Framework preset: Other / Static
- Root directory: repo root
- Build command: blank
- Output directory: blank or `.`
- Production branch: `main`

## Domain DNS target for Vercel

In the domain provider, point:

| Type | Host | Value |
|---|---|---|
| A | @ | 76.76.21.21 |
| CNAME | www | cname.vercel-dns.com |

After DNS is changed, add `inthesneakers.life` and `www.inthesneakers.life` to the Vercel project domains.

## Current issue to verify

The repo is corrected to the expanded homepage with Venmo + Medium only, but the live domain may still be serving an older deployed/cached version. Verify the active hosting source before assuming the code edit failed.
