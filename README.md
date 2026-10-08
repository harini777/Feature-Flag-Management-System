# 🚩 FeatureFlow — Feature Flag Management & Release Control System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.139.2-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D.svg?style=flat&logo=redis&logoColor=white)](https://redis.io)
[![Pytest](https://img.shields.io/badge/Pytest-9.1-0A9EDC.svg?style=flat&logo=pytest&logoColor=white)](https://pytest.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A production-grade, high-performance feature flag management platform that decouples software deployment from feature release. Safely test in production, roll out features gradually, execute targeted user experiments, and trigger instant kill switches without redeploying code.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup (FastAPI + PostgreSQL + Redis)](#backend-setup)
  - [Frontend Setup (React)](#frontend-setup)
  - [Environment Variables](#environment-variables)
- [API Reference](#-api-reference)
  - [Flag Evaluation API](#flag-evaluation-api)
  - [Core REST Endpoints](#core-rest-endpoints)
- [Evaluation Engine & Targeting Rules](#-evaluation-engine--targeting-rules)
- [Running Tests](#-running-tests)
- [Contributing & License](#-contributing--license)

---

## 🌟 Overview

Releasing code directly to 100% of users introduces high blast-radius risks. **FeatureFlow** empowers engineering and product teams to:
- **Decouple Deployments from Releases**: Ship code anytime; turn features on when ready.
- **Canary & Percentage Rollouts**: Roll out features to 5%, 25%, 50%, or 100% of traffic using deterministic MurmurHash/SHA-256 bucketing.
- **Targeted Segmentation**: Serve features specifically to internal testers, VIP tiers, beta groups, or geographical regions.
- **Sub-Millisecond Evaluation**: Cache flag states in Redis with deterministic hashing and automated TTL cache invalidation.
- **Audit Trails & Governance**: Track who changed what, when, and maintain full flag version history for rollback safety.

---

## 🚀 Key Features

| Feature | Description |
|---|---|
| **Boolean & Percentage Flags** | Toggle features on/off instantly or ramp up percentage rollouts dynamically. |
| **Advanced Targeting Engine** | Evaluate rules based on `user_id`, `group_name`, and custom attributes (`country`, `subscription_tier`, `role`, etc.). |
| **Comprehensive Operator Library** | Supports `=`, `!=`, `contains`, `starts_with`, `ends_with`, `in`, and `not_in`. |
| **Multi-Environment Support** | Isolated flags, rules, and states across `Development`, `Staging`, and `Production`. |
| **Sub-Millisecond In-Memory Cache** | Low-latency flag evaluation backed by Redis with automated cache invalidation on rule updates. |
| **Real-Time Evaluation Analytics** | Track evaluation frequency, cache hit/miss rates, and daily trends with Recharts visualizations. |
| **Audit Logs & Version History** | Complete change logs capturing previous state, new state, user ID, and timestamp with `FlagVersion` records. |
| **Modern React Dashboard** | Responsive UI with dark-accent aesthetics, live filtering, and modal builders. |

---

## 🏛 System Architecture

```mermaid
flowchart TD
    ClientApp[Client Applications / SDKs] -->|POST /evaluate| API[FastAPI Gateway]
    BrowserUser[Engineering & Product Dashboard] -->|Admin CRUD| WebUI[React Frontend]
    WebUI -->|REST API| API

    subgraph Evaluation & Control Layer
        API --> Engine[Evaluation Engine]
        Engine -->|1. Check Cache| Redis[(Redis Cache)]
        Engine -->|2. Fallback Query| DB[(PostgreSQL DB)]
        Engine -->|3. Record Analytics| Redis
    end

    subgraph Data Persistence
        DB --> Flags[Flags & Versions]
        DB --> Rules[Targeting Rules]
        DB --> Envs[Environments]
        DB --> Audits[Audit Logs]
    end
```

### Evaluation Lifecycle

1. **Client Request**: Client queries `POST /evaluate` passing `flag_key`, `environment_name`, and optional `user_context`.
2. **Cache Lookup**: Evaluator hashes `(env:flag:user_id)` into a Redis key. If present, returns immediately (`< 1ms`).
3. **Engine Evaluation**:
   - Validates environment and flag status.
   - If flag is disabled, returns `False`.
   - Iterates targeting rules (user ID match, group match, custom attributes, percentage rollout hashing).
4. **Cache Write & Analytics**: Caches result in Redis with a 300s TTL and increments evaluation analytics counters.

---

## 🛠 Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.13)
- **ORM & Database**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/) + [PostgreSQL](https://www.postgresql.org/)
- **Migrations**: [Alembic](https://alembic.sqlalchemy.org/)
- **Caching & Analytics**: [Redis](https://redis.io/)
- **Validation**: [Pydantic v2](https://docs.pydantic.dev/)
- **ASGI Server**: [Uvicorn](https://www.uvicorn.org/)
- **Testing**: [Pytest 9](https://docs.pytest.org/) with `unittest.mock`

### Frontend
- **Framework**: [React 18](https://reactjs.org/) (Create React App)
- **Routing**: React Router v6
- **Data Visualization**: [Recharts](https://recharts.org/)
- **Styling**: Vanilla CSS (Responsive Design System)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📂 Project Structure

```bash
Feature-Flag-Management-System/
├── app/
│   ├── api/
│   │   └── flag_routes.py          # FastAPI route handlers (CRUD, eval, analytics)
│   ├── cache/
│   │   └── redis_client.py         # Redis connection pool & helpers
│   ├── database/
│   │   ├── config.py               # Database URL resolution with dotenv
│   │   ├── session.py              # SQLAlchemy engine & session factory
│   │   └── base.py                 # Declarative Base
│   ├── models/                     # SQLAlchemy ORM models
│   │   ├── flag.py                 # Feature flag model
│   │   ├── flag_version.py         # Version history tracking
│   │   ├── targeting_rule.py       # Segment & rollout rules
│   │   ├── environment.py          # Dev / Staging / Production
│   │   ├── audit_log.py            # Audit records
│   │   └── user_group_membership.py
│   ├── schemas/                    # Pydantic request/response schemas
│   └── services/
│       ├── evaluation_engine.py    # Rule matching, hashing & cache logic
│       └── rollout_service.py      # Rollout hashing helpers
├── frontend/
│   ├── public/                     # Static assets & HTML template
│   └── src/
│       ├── components/             # Reusable UI modals & rule builders
│       ├── context/                # Global React contexts (Notifications)
│       └── pages/                  # Dashboard, Flags, Targeting, Analytics, Logs
├── tests/
│   └── test_engine.py              # Pytest unit tests for evaluation engine
├── alembic/                        # Database migration scripts
├── .env.example                    # Environment variable template
├── requirements.txt                # Python dependencies
└── pytest.ini                      # Pytest configuration
```

---

## 🏁 Getting Started

### Prerequisites

Ensure the following are installed on your machine:
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **PostgreSQL 14+**
- **Redis Server**

---

### Backend Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/harini777/Feature-Flag-Management-System.git
   cd Feature-Flag-Management-System
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up Environment Variables**:
   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```ini
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/feature_flag_db
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_DB=0
   ```

5. **Run Database Migrations**:
   ```bash
   alembic upgrade head
   ```

6. **Start the FastAPI Backend**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *The API will be available at `http://localhost:8000`. Interactive Swagger docs are at `http://localhost:8000/docs`.*

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install npm packages**:
   ```bash
   npm install
   ```

3. **Start the React development server**:
   ```bash
   npm start
   ```
   *The dashboard will open automatically at `http://localhost:3000`.*

---

## 📡 API Reference

### Flag Evaluation API

#### `POST /evaluate`
Evaluates whether a feature flag should be enabled for a given context.

**Request Body:**
```json
{
  "flag_key": "new_checkout_flow",
  "environment_name": "production",
  "user_context": {
    "user_id": 1042,
    "country": "US",
    "subscription": "premium",
    "groups": ["beta_testers"]
  }
}
```

**Response (`200 OK`):**
```json
{
  "flag_key": "new_checkout_flow",
  "enabled": true,
  "reason": "Targeting rule matched: country = US",
  "cached": false
}
```

---

### Core REST Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/flags` | List all feature flags (supports `?environment_id=`) |
| `POST` | `/flags` | Create a new feature flag |
| `PUT` | `/flags/{id}` | Update flag state (records `FlagVersion` + `AuditLog`) |
| `DELETE` | `/flags/{id}` | Delete a flag and cascade associated rules |
| `GET` | `/flags/{id}/versions` | Retrieve version history for a flag |
| `GET` | `/targeting-rules` | List all targeting rules |
| `POST` | `/targeting-rules` | Create a targeting rule (user ID, group, rollout %, attribute) |
| `PUT` | `/targeting-rules/{id}` | Update an existing targeting rule |
| `DELETE` | `/targeting-rules/{id}` | Delete a targeting rule |
| `GET` | `/environments` | List all environments (Development, Staging, Production) |
| `POST` | `/environments` | Create an environment |
| `GET` | `/audit-logs` | Retrieve recent audit logs |
| `GET` | `/evaluation-analytics` | Get real-time Redis-backed flag evaluation metrics |

---

## 🎯 Evaluation Engine & Targeting Rules

The engine evaluates rules in sequential priority:

1. **Environment & Global State Check**: If the flag is disabled globally in the requested environment, it immediately returns `False`.
2. **User ID Targeting**: Direct whitelist or blacklist checks against `user_context["user_id"]`.
3. **User Group Membership**: Matches against user groups in `user_context["groups"]` or stored database memberships.
4. **Custom Attribute Rules**: Evaluates arbitrary metadata against operators:
   - `=` / `equals`: Exact match
   - `!=` / `not_equals`: Inverted match
   - `contains`: Substring match
   - `starts_with`: Prefix match
   - `ends_with`: Suffix match
   - `in`: Multi-value inclusion
5. **Percentage Rollout**: Computes a deterministic integer hash (`0-99`) from `(flag_key + str(user_id))`. If `hash_value < rollout_percentage`, the feature is enabled.

---

## 🧪 Running Tests

The test suite provides comprehensive unit coverage for the evaluation engine, targeting rules, caching, and percentage rollouts.

Run the test suite with `pytest`:

```bash
# Run all tests
pytest tests/ -v

# Run with coverage report
pytest --cov=app tests/
```

**Test Suite Coverage Summary:**
- Operator matching (`=`, `!=`, `contains`, `starts_with`, `ends_with`, `in`, `not_in`)
- Missing environment / flag handling
- Disabled flag short-circuiting
- User ID whitelisting & blacklisting
- Contextual group & DB group evaluation
- Generic attribute targeting
- Deterministic percentage rollout gating (0%, 50%, 100%)
- Redis cache hit & cache bypass validation

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
