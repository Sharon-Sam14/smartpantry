# SmartPantry Frontend

This is the client-side single page application (SPA) for SmartPantry, built with React 18, Vite, TypeScript, and Tailwind CSS.

## 🛠 Features & Client Design

* **Kinfolk Editorial UI**: Premium Fraunces serif and Figtree typography, rounded warm cards, high-contrast HSL color system (terracotta, gold, espresso), and ambient lighting glow effects.
* **Cookie-attached API requests**: Built with `credentials: "include"` inside [api.ts](src/lib/api.ts) to automatically send HttpOnly JWT tokens on every network call.
* **Auto-Signout Handler**: Captures `401 Unauthorized` responses from the Django backend to clear the client session and redirect to login.
* **ML Integration**: Computes recipe availability matching and forecasts spending on the client via [ml.ts](src/lib/ml.ts) using linear regression models.
* **React Store Provider**: Handles centralized global state for auth checks, pantry inventory, matching recipes, custom currencies, and shopping list persistence using local storage mappings.

## 📁 Workspace Structure

```
src/
├── components/
│   ├── ui/               shadcn Primitive UI elements
│   ├── layout/           AppHeader, AppShell, RequireAuth wrapper
│   ├── DigitalPantryTwin.tsx   High-density bento grid food tracker
│   └── CurrencyPicker.tsx
├── pages/
│   ├── Landing.tsx       Clean SaaS landing page
│   ├── Auth.tsx          Auth forms (login & sign-up)
│   ├── Dashboard.tsx     Gauge score, stats cards, and expiring items
│   ├── Pantry.tsx        High-density pantry stock list
│   ├── Recipes.tsx       Vercel-style recipe suggestions
│   ├── Insights.tsx      Grocery spend forecast area chart
│   └── NotFound.tsx
├── lib/
│   ├── api.ts            Typed client for Django REST API
│   ├── store.tsx         Central state provider
│   ├── ml.ts             ML recipe ranking & forecast math
│   └── theme.tsx         Light/dark mode controller
└── data/
    └── seed.ts           Mock datasets for recipes and history
```

## 🚀 Running the Client

Make sure Node.js 18+ is installed.

```bash
# Install dependencies
npm install

# Start Vite dev server (runs on http://localhost:8081)
npm run dev

# Run TypeScript compilation checks
npx tsc --noEmit

# Build production bundle
npm run build
```

## ⚙️ Configuration

The base URL of the API is defined in [api.ts](src/lib/api.ts):
```ts
export const API_BASE = "http://127.0.0.1:8000/api";
```
Ensure this matches the port and address where the Django backend is running.
