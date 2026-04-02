# GrantFlow

GrantFlow combines a Chrome extension and a web platform to help nonprofits upload organizational documents, discover grants, and autofill grant applications more quickly.

## Included Apps

- `grant-helper-website`
  The main web app for login, document upload, profile extraction, grant search, and workspace features.
- `chrome-extension`
  The extension that connects to the platform, syncs organizational context, detects supported fields, and autofills safe values.

## Local Setup

### Website

```bash
cd grant-helper-website
npm install
npm run dev
```

### Backend

```bash
cd grant-helper-website
npm run dev:server
```

### Chrome Extension

Load the `chrome-extension` folder via `chrome://extensions` with Developer Mode enabled.

## Environment

Create `grant-helper-website/.env` with the needed values, for example:

```env
OPENAI_API_KEY=your_openai_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GRANT_API=your_grants_api_key
```
