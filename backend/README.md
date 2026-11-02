# OpenForge backend

## Setup

Create `backend/.env` with `DATABASE_URL` and `SECRET_KEY`, install
`requirements.txt`, and run Alembic from the `backend` directory:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m alembic upgrade head
```

The existing initial migration creates all tables required for the current API.
No new migration is needed for category listing or application submissions.

## Initial data and admin bootstrap

Seed the initial categories at any time. The command is idempotent and skips
existing category names or slugs:

```powershell
.\venv\Scripts\python.exe -m scripts.seed_categories
```

Create the first admin by promoting an existing developer. Run this command
once on a trusted machine; it refuses to operate after an admin already exists.
The script asks for the account email and an interactive confirmation, and does
not accept or store a password or secret:

```powershell
.\venv\Scripts\python.exe -m scripts.promote_admin
```

There is deliberately no public admin registration endpoint. Public
registration always assigns the developer role.

## API

- `POST /auth/register`, `POST /auth/login`, and `GET /auth/me`
- `GET /api/categories` returns active categories.
- `POST /api/submissions` accepts an authenticated developer's submission.
- `GET /api/submissions/my` returns only the authenticated developer's
  submissions.
- `GET /api/admin/submissions/pending` lists pending submissions for admins.
- `POST /api/admin/submissions/{id}/approve` creates and publishes an
  application from a pending submission.
- `POST /api/admin/submissions/{id}/reject` rejects a pending submission and
  requires an `admin_comment`.

Admin routes require a bearer token for an active account with the `admin` role.
Review actions are limited to pending submissions; approvals and rejections
record the reviewing admin and timestamp.

The API's OpenAPI documentation is available at `/docs`.

## Tests

Run backend tests from this directory:

```powershell
.\venv\Scripts\python.exe -m pytest
```
