# ChainPilot — Supply Chain Management System

A full-stack Supply Chain Management System built with **MERN** (MongoDB, Express, React, Node.js), **Python ML** (Prophet / Scikit-learn), and **FastAPI** for ML communication.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      React Frontend                      │
│         (Dashboard / Products / Inventory /             │
│          Predictions / Calendar)                        │
└──────────────────┬──────────────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────────────┐
│               Node.js / Express Backend                  │
│   Auth · Products · Materials · Usage · Predictions     │
│                   Calendar Events                        │
└──────────┬────────────────────────┬─────────────────────┘
           │ Mongoose               │ HTTP (node-fetch)
┌──────────▼──────────┐  ┌─────────▼──────────────────────┐
│      MongoDB        │  │     FastAPI ML Service          │
│  (multi-user data)  │  │  Prophet + Sklearn forecasting  │
└─────────────────────┘  └────────────────────────────────┘
```

---

## 🚀 Quick Start (Docker — Recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Clone and configure
```bash
git clone <repo-url>
cd supply-chain
cp backend/.env.example backend/.env    # Edit JWT_SECRET
cp frontend/.env.example frontend/.env
```

### 2. Start everything
```bash
docker-compose up --build
```

### 3. Open the app
| Service    | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:3000      |
| Backend    | http://localhost:5000      |
| ML Service | http://localhost:8000      |
| MongoDB    | localhost:27017            |

---

## 🛠️ Manual Setup (Without Docker)

### MongoDB
Install MongoDB locally or use [MongoDB Atlas](https://www.mongodb.com/atlas).

### Backend (Node.js)
```bash
cd backend
npm install
# Edit .env — set MONGO_URI, JWT_SECRET, ML_SERVICE_URL
npm run dev        # Runs on :5000
```

### ML Service (Python / FastAPI)
```bash
cd ml-service
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (React)
```bash
cd frontend
npm install
# Edit .env — set REACT_APP_API_URL
npm start          # Runs on :3000
```

---

## 📦 Features

### 1. Products
- Add products with **bill of materials** (each material with qty-per-unit and unit)
- Materials are **auto-created** in inventory when a product is added
- Edit / delete products

### 2. Inventory Management
- View all materials from all products in one place
- Update **current stock**, **total storage capacity**, and **daily usage** per material
- Visual stock bar with color-coded status (Critical / Low / Good)
- Days-until-stockout calculator

### 3. Daily Usage Logging
- Log usage per material per day manually
- Duplicate-safe: re-logging the same day replaces the entry
- View recent entry history per material

### 4. CSV / XML Upload
- Upload historical usage data via `📁` button on any material
- Supported CSV format: `date,quantity` columns
- Supported XML format: `<entry><date>...<quantity>...` structure
- Old uploaded data is **automatically deleted and replaced** on each upload
- Triggers ML prediction refresh

### 5. ML Predictions (FastAPI + Prophet)
- **Prophet** (Facebook's time-series model) as primary predictor
- **Polynomial regression** (sklearn) as fallback
- Outputs:
  - Predicted daily usage
  - Estimated stockout date
  - Recommended resupply date (accounting for lead time)
  - Recommended order quantity
  - 90-day stock forecast chart
  - Confidence score and trend (increasing / decreasing / stable / volatile)
- Predictions are **deleted and re-generated** whenever new usage data is added
- Auto-creates **calendar event** for each resupply date

### 6. Calendar
- Monthly calendar view
- Event types: Resupply 🚚, Meeting 🤝, Product Launch 🚀, Maintenance 🔧, Custom 📌
- Add events by clicking any day
- Color picker per event
- Resupply events auto-populated from ML predictions
- Upcoming events sidebar
- Priority levels (High / Medium / Low)

### 7. Multi-User
- JWT authentication (register / login)
- All data is **user-scoped** — every query filters by `userId`
- Rate limiting (200 req/15min per IP)
- Passwords hashed with bcrypt

---

## 📁 Project Structure

```
supply-chain/
├── docker-compose.yml
├── sample_usage.csv          ← Test CSV for upload
├── sample_usage.xml          ← Test XML for upload
│
├── backend/                  ← Node.js / Express
│   ├── server.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Material.js
│   │   ├── UsageEntry.js
│   │   ├── Prediction.js
│   │   └── CalendarEvent.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── materials.js
│   │   ├── usage.js
│   │   ├── predictions.js
│   │   └── calendar.js
│   └── middleware/
│       └── auth.js
│
├── ml-service/               ← Python / FastAPI
│   ├── main.py
│   ├── requirements.txt
│   └── routers/
│       └── predict.py        ← Prophet + sklearn models
│
└── frontend/                 ← React
    └── src/
        ├── App.js
        ├── context/AuthContext.js
        ├── utils/api.js
        ├── pages/
        │   ├── LoginPage.js
        │   ├── RegisterPage.js
        │   ├── DashboardPage.js
        │   ├── ProductsPage.js
        │   ├── InventoryPage.js
        │   ├── PredictionsPage.js
        │   └── CalendarPage.js
        └── components/Layout/Layout.js
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| POST | `/api/products` | Create product + auto-add materials |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Soft delete |

### Materials
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/materials` | List all materials |
| PATCH | `/api/materials/:id/stock` | Update stock levels |

### Usage
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/usage` | Log daily usage |
| POST | `/api/usage/upload/:materialId` | Upload CSV/XML |
| GET | `/api/usage/:materialId` | Get usage history |

### Predictions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/predictions` | All predictions |
| POST | `/api/predictions/generate/:materialId` | Run ML prediction |

### Calendar
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calendar?year=&month=` | Events by month |
| POST | `/api/calendar` | Create event |
| PUT | `/api/calendar/:id` | Update event |
| DELETE | `/api/calendar/:id` | Delete event |

### ML Service (FastAPI)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/predict` | Generate prediction from usage data |
| GET | `/health` | Health check |

---

## 🔒 Environment Variables

### Backend `.env`
```
MONGO_URI=mongodb://...
JWT_SECRET=change_this_secret
JWT_EXPIRE=7d
ML_SERVICE_URL=http://localhost:8000
PORT=5000
```

### Frontend `.env`
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ML_URL=http://localhost:8000
```

---

## 🧪 Testing with Sample Data

1. Register an account
2. Create a product (e.g. "Widget A") with materials (e.g. "Steel Sheet" x 2 kg)
3. Go to **Inventory**, click 📊 to set stock levels
4. Click 📁 to upload `sample_usage.csv`
5. Go to **Predictions**, click **Generate Prediction**
6. Check **Calendar** — resupply date appears automatically

---

## 🚀 Production Notes

- Replace `JWT_SECRET` with a strong random string
- Set `MONGO_URI` to a secured MongoDB Atlas cluster
- Use HTTPS with a reverse proxy (Nginx/Caddy)
- Set `FRONTEND_URL` in backend for CORS
- Scale ML service independently (it's stateless)
