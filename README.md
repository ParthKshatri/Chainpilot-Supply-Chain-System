# ChainPilot — Supply Chain Management System

A full-stack Supply Chain Management System built with **React**, **Django REST Framework**, **FastAPI**, and **MongoDB**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Recharts, Tabler Icons |
| Backend | Django 4.2 + Django REST Framework |
| Database | MongoDB (via PyMongo) |
| ML Service | FastAPI + SARIMA, XGBoost, Holt-Winters, Linear Regression |
| Auth | JWT (djangorestframework-simplejwt) |

---

## Features

- **Products** — Add products with a full bill of materials
- **Inventory** — Track stock levels, storage capacity and daily usage per material
- **Usage Logging** — Log daily usage manually or upload CSV/XML files
- **ML Predictions** — Multi-model pipeline (SARIMA, XGBoost, Holt-Winters, Linear) with weighted ensemble forecasting
- **Model Comparison** — See MAPE, MAE, RMSE, confidence scores for every model side by side
- **Calendar** — Visual resupply schedule with auto-generated ML events plus manual event creation
- **Multi-user** — Each user has isolated data, JWT-secured endpoints

---

## Project Structure

```
supply-chain/
├── django-backend/          # Django + DRF API (port 8001)
│   ├── config/              # Settings, URLs, WSGI
│   └── scm/
│       ├── db.py            # PyMongo connection helper
│       ├── authentication.py# Custom JWT auth for MongoDB users
│       ├── views/           # Auth, Products, Materials, Usage, Predictions, Calendar
│       └── urls/            # URL patterns per feature
│
├── ml-service/              # FastAPI ML service (port 8000)
│   ├── pipeline.py          # Multi-model comparison pipeline
│   ├── models/              # SARIMA, XGBoost, Holt-Winters, Linear
│   └── routers/             # /predict endpoint
│
├── frontend/                # React app (port 3000)
│   └── src/
│       ├── pages/           # Dashboard, Products, Inventory, Predictions, Calendar
│       ├── context/         # Auth context
│       └── utils/api.js     # Axios API client
│
├── sample_usage.csv         # Sample data for testing predictions
├── sample_usage.xml         # Sample data (XML format)
└── docker-compose.yml       # Docker setup (optional)
```

---

## Local Setup (Manual)

### Prerequisites
- Python 3.12
- Node.js 20
- MongoDB (running locally on port 27017)

### Terminal 1 — MongoDB
```bash
net start MongoDB
```

### Terminal 2 — Django Backend
```bash
cd django-backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8001
```

### Terminal 3 — ML Service
```bash
cd ml-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Terminal 4 — Frontend
```bash
cd frontend
npm install
npm start
```

Open **http://localhost:3000**

---

## Environment Variables

Create a `.env` file in `django-backend/`:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
MONGO_URI=mongodb://localhost:27017/supply_chain
MONGO_DB_NAME=supply_chain
ML_SERVICE_URL=http://localhost:8000
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

Create a `.env` file in `frontend/`:

```env
REACT_APP_API_URL=http://localhost:8001/api
REACT_APP_ML_URL=http://localhost:8000
```

---

## ML Pipeline

The prediction system runs 4 models in parallel and selects the best by lowest MAPE:

| Model | Min Data Points | Best For |
|---|---|---|
| Linear Baseline | 3 | Always available, guaranteed fallback |
| Holt-Winters | 10 | Smooth trends with weekly seasonality |
| SARIMA | 14 | Auto-tuned seasonal patterns |
| XGBoost | 20 | Non-linear patterns, lag features |

When 2+ models succeed, a **weighted ensemble** blends the top 3 by inverse-MAPE weights for higher accuracy.

---

## How to Generate Predictions

1. Add a product with materials on the **Products** page
2. Go to **Inventory** → upload `sample_usage.csv` on any material
3. Go to **Predictions** → click **Generate Prediction**
4. View the 90-day stock forecast chart and model comparison table
5. Resupply date auto-appears on the **Calendar**

---

## Docker Setup (Optional)

```bash
docker compose up --build
```

Services start on ports 3000 (frontend), 8001 (backend), 8000 (ML), 27017 (MongoDB).
