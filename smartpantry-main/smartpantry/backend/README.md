# SmartPantry Backend

This is the API server for SmartPantry, built with Django 5, Django REST Framework, and PostgreSQL database integration.

## 🛡️ Secure HttpOnly Cookie JWT Auth

The backend uses a customized JSON Web Token authentication system:
* **`JWTCookieAuthentication`**: A custom auth class defined in `api/authentication.py` that intercepts incoming request cookies to read the `access_token` JWT. This acts as a seamless fallback if the client is unable to pass the standard `Authorization: Bearer` header.
* **HttpOnly Session Cookies**: The `login` and `register` endpoints set the tokens in cookies marked `HttpOnly` and `Secure`, protecting them from client-side script inspection (mitigating XSS).
* **Logout Cookie Clearance**: The `/api/auth/logout/` view clears the session cookies from the client automatically.

## 📁 Workspace Structure

```
backend/
├── requirements.txt           Dependencies (psycopg2, REST Framework, JWT)
└── smartpantry/
    ├── manage.py
    ├── api/                   Core API modules (Auth, CRUD views, Geolocation proxy)
    │   ├── authentication.py  JWTCookieAuthentication middleware
    │   ├── models.py          Database entities: CustomUser, Pantry, Recipe, Expense, Preferences
    │   ├── serializers.py     JSON schema serialization
    │   ├── views.py           Sign-in, registration, and CRUD viewsets
    │   └── urls.py            API route configurations
    └── smartpantry_project/   Project configurations (settings, database parsing)
```

## 🚀 Running the API Server

Make sure Python 3.10+ and pip are installed.

```bash
cd backend/smartpantry

# Create virtual environment
python -m venv .venv
# Activate:
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r ../requirements.txt

# Run migrations
python manage.py migrate

# Create admin credentials
python manage.py createsuperuser

# Start the server (runs on http://127.0.0.1:8000)
python manage.py runserver
```

## ⚙️ Configuration & Database Setup

The backend connects dynamically to database servers based on environment variables loaded from `.env`:
* **SQLite Fallback**: If no environment variables are configured, the API uses a local SQLite database (`db.sqlite3`) for zero-setup ease.
* **PostgreSQL Integration**: Map the connection variables inside `.env`:
  ```env
  DB_NAME=smartpantry
  DB_USER=postgres
  DB_PASSWORD=your_db_password
  DB_HOST=127.0.0.1
  DB_PORT=5432
  ```
  Ensure a database with the name `DB_NAME` is created on your host before running `python manage.py migrate`.
