# SmartPantry

SmartPantry is a production-grade, full-stack kitchen intelligence application that tracks inventory, predicts food expiry, recommends recipes, and forecasts grocery spending using a linear regression model with seasonality.

It features a clean, Vercel-inspired SaaS aesthetic, PostgreSQL database support, and secure HttpOnly cookie-based JWT authentication.

```
smartpantry/
├── frontend/   React 18 + Vite + TypeScript + Tailwind CSS (UI Workspace)
├── backend/    Django 5 + REST Framework + JWT + PostgreSQL (API Server)
└── README.md   This file
```

---

## ✨ Advanced Features

### 1. Secure Cookie-based JWT Authentication 🛡️
* **Security Hardening**: JWT tokens (`access_token` and `refresh_token`) are issued by the Django backend and stored securely in the browser as **`HttpOnly` and `Secure` cookies** to protect against XSS attacks.
* **Auto-Signout**: The frontend tracks response status codes (e.g. 401 Unauthorized) and automatically logs the user out when session tokens expire.
* **Fallback Headers**: Client-side requests automatically handle credentials sync using `credentials: "include"`.

### 2. Smart Shopping List & Instant Transfer 🛒
* **Unified Inventory Loop**: Add missing ingredients directly from recipe pages to the shopping list with a single click.
* **Instant Pantry Transfer**: Checking an item on the shopping list triggers a 400ms strike-through animation, after which the item is automatically transferred to the pantry on the backend database and removed from the grocery list.
* **Category Auto-Grouping**: Grocery list items are auto-grouped by category (Produce, Protein, Dairy, Grains, etc.) with custom color tags.

### 3. Digital Pantry Twin Bento Tracker 🍱
* **Bento Grid Layout**: Organizes your ingredients into 5 visual category grids (Produce, Dairy, Proteins, Grains, Spices) stacked beside health metrics.
* **Circular Freshness Gauge**: An Apple-widget style circle gauge calculates the overall health and freshness of your pantry to prevent food waste.
* **High-Density Cards**: Spotify-style content cards that display the exact quantity, freshness status flags, and remaining shelf-life progress bars.
* **Custom SVG Illustrations**: Displays realistic, glossy vector art with gradients (Tomatoes, Spinach, Eggs, Yogurt, Rice, Olive Oil, etc.) for instant ingredient recognition.

### 4. Machine Learning Recipes & Spend Forecasts 📈
* **Taste Matching & Preferences**: Recipe suggestions are ranked out of 100 based on ingredient availability, expiring items, diets (vegetarian, vegan, pescatarian), and dislikes.
* **Grocery Spend Forecaster**: Implements a Holt-Winters-lite forecaster (linear trend + 4-week seasonality) that projects the next 4 weeks of spending based on your history and renders the trend in a smooth Area Chart with vertical "now" divider lines.
* **Waste-Risk KPI**: Analyzes the cost of pantry items near expiry to calculate the financial risk of food waste.

### 5. Multi-Currency Formatting 💱
* **Currency Picker**: Switch your workspace on the fly (INR, USD, EUR, GBP, JPY, AUD, CAD, AED).
* **Auto-Conversion**: Converts and formats all prices and charts dynamically using real exchange rates.

---

## 🛠 Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 18, Vite 5, TypeScript 5, Tailwind CSS 3, Recharts, Framer Motion |
| **Backend** | Python 3.10+, Django 5, Django REST Framework, SimpleJWT |
| **Database** | PostgreSQL (Production) / SQLite (Zero-config local fallback) |
| **Auth** | JWT Cookies (`HttpOnly`) with custom email user model |
| **ML Engine** | Pure-TypeScript Holt-Winters regression and recipe scoring |

---

## 🚀 Running Locally — Step by Step

### Prerequisites
* **Node.js 18+** and **npm**
* **Python 3.10+** and **pip**
* **PostgreSQL** (Optional, falls back to SQLite automatically if database variables are not set)

### 1. Start the Django Backend

```bash
cd smartpantry/backend/smartpantry

# Create & activate a virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r ../requirements.txt

# Run migrations
python manage.py migrate

# Create a superuser
python manage.py createsuperuser

# Start the API server
python manage.py runserver
```

The API is now running live at **http://127.0.0.1:8000**.

### 2. Start the Vite Frontend

```bash
cd smartpantry/frontend

# Install node modules
npm install

# Start Vite dev server
npm run dev
```

Open the local address printed in the terminal (default: **http://localhost:8081**).

---

## 🔌 API Reference

All routes are prefixed with `/api/`. Endpoints marked with `🔒` authenticate automatically via `HttpOnly` credentials cookies.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| **POST** | `/auth/register/` | — | Create account & set session cookies |
| **POST** | `/auth/login/` | — | Authenticate & set session cookies |
| **POST** | `/auth/logout/` | 🔒 | Delete auth cookies & clear session |
| **GET** | `/geolocate/` | — | Fetch server-side IP geolocation for grocery store lookup |
| **GET** | `/pantry/` | 🔒 | List user's pantry items |
| **POST** | `/pantry/` | 🔒 | Add a new pantry item |
| **DELETE**| `/pantry/{id}/` | 🔒 | Delete a pantry item |
| **GET** | `/recipes/` | 🔒 | List user's recipes |
| **POST** | `/recipes/` | 🔒 | Save a custom recipe |
| **DELETE**| `/recipes/{id}/` | 🔒 | Delete a recipe |
| **GET** | `/expenses/` | 🔒 | List weekly spend records |
| **POST** | `/expenses/` | 🔒 | Log a weekly expense |
| **GET** | `/preferences/` | 🔒 | Fetch user taste preferences |
| **PUT** | `/preferences/` | 🔒 | Update diet/cuisine/dislike settings |

---

## ⚙️ Configuration (.env)

**Backend Configuration**: `backend/smartpantry/smartpantry/.env`
Create a `.env` file in your Django project root to customize credentials:
```env
SECRET_KEY=your-production-secret-key
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
CORS_ALLOWED_ORIGINS=http://localhost:8081

# PostgreSQL Configuration (Optional - falls back to SQLite if blank)
DB_NAME=smartpantry
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=127.0.0.1
DB_PORT=5432
```

---

## 📄 License

MIT License — Copyright (c) 2026 Sharon-Sam14.

Built by Sharon-Sam14 for home cooks who hate wasting ingredients. See [LICENSE](LICENSE) for details.
