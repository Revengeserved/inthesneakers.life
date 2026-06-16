# Inside the Sneakers

Production website for **Inside the Sneakers**.

## Live site

- Primary domain: `https://inthesneakers.life/`
- Source repo: `Revengeserved/inthesneakers.life`
- Production host: Vercel

## What this repo should contain

This is intentionally simple:

- `index.html` — the homepage
- `hero-redesign.css` — the homepage styling
- `Inthesneakers-1.jpeg` — the hero image
- `vercel.json` — Vercel static-site routing/security config
- `README.md` — this launch note

No extra pages, no old sections, no generated analytics reports, and no confusing GitHub Pages setup files.

## Google Analytics

GA4 is installed directly in `index.html` with measurement ID:

- `G-XNFNVGXCFL`

Tracked events:

- `click_donate_venmo`
- `click_donate_cashapp`
- `click_read_story_medium`

To verify: open Google Analytics → Realtime → visit the site → tap the buttons.

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
