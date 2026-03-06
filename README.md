# Pixelplus Website Performance Tool

A web-based reporting platform for Pixelplus that collects website performance data from Google Analytics 4 and Google Search Console, stores it in PostgreSQL, and presents it in a clear client-friendly dashboard.

## Features

- Daily GA4 data fetch
- Daily Google Search Console data fetch
- Monthly report generation
- Client dashboard
- Automated email notifications with Mailgun

## Tech stack

- Node.js
- PostgreSQL
- Google Analytics Data API
- Google Search Console API
- Mailgun

## Project structure

- `app/` web application
- `scripts/` data fetch and report generation scripts
- `database/` schema and migrations
- `docs/` technical documentation
- `.github/workflows/` automation workflows
