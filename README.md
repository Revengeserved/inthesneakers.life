# Inside the Sneakers

Production website for **Inside the Sneakers**.

## Live site

- Primary domain: `https://inthesneakers.life/`
- Source repo: `Revengeserved/inthesneakers.life`
- Current page type: single-page landing page
- Official tagline: **Rock Bottom Has a Basement**
- Current public links: Venmo plus two Medium story links

## Project boundary

This repo is only for the Inside the Sneakers public website and brand system.

It should include:

- Website homepage files
- Brand assets, logo, banner, and visual identity
- Fundraiser/support copy
- Medium/blog/social links and public storytelling copy
- Site analytics code and admin analytics UI
- Deployment notes for the website

It should **not** include:

- Madera / Modera apartment evidence
- VA/legal packets
- Lease disputes, resident ledgers, or legal correspondence
- Private case documents that belong in the legal project
- Crypto wallet scanning, recovery, or forensics tools
- Cash App links or Cash App donation copy

## What this repo contains

This site is intentionally focused:

- `index.html` — hero/tagline, support links, introduction/story excerpt, and featured Medium links
- `hero-redesign.css` — current homepage styling and responsive layout
- `Inthesneakers-1.jpeg` — hero/background image asset
- `analytics.html` — protected admin analytics dashboard UI
- `api/analytics.js` — protected Google Analytics Data API endpoint
- `vercel.json` — Vercel routing and security configuration
- `README.md` — project boundary and deployment notes

No legal evidence, VA packet files, generated analytics reports, crypto tooling, Cash App links, or other mixed-project files belong here.

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

Production domains:

- `inthesneakers.life`
- `www.inthesneakers.life`
