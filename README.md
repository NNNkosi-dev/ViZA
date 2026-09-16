![ViZA Dashboard](ViZA screenshot.png)

# ViZA — Visible South Africa 🇿🇦

> *A national data intelligence platform that makes South Africa's challenges visible — so they can be solved.*

**ViZA** is a portfolio project and proof-of-concept for a real change initiative proposed for the AFRIKA KOMMT! 2026–2028 fellowship programme. It demonstrates what a national data intelligence layer could look like for South Africa — connecting siloed government data sources and surfacing insights in real time.

---

## 🔍 What it does

| Feature | Description |
|---|---|
| **Service Delivery Dashboard** | Tracks household access to electricity, water, sanitation & refuse removal by province |
| **Youth Unemployment Monitor** | Visualises unemployment rates for ages 15–24 and 25–34, plus NEET rates |
| **Government Indicators** | Matric pass rates, school dropout rates, clinic access distances, crime index |
| **Anomaly Detection** | Auto-flags provinces that fall significantly below national averages |
| **Citizen Flag System** | Citizens can report incorrect data — every submission is logged in a public audit trail |
| **Province Filter** | All panels update dynamically when a province is selected |

---

## 🛠 Tech Stack

- **Backend:** Python · FastAPI · Pydantic
- **Frontend:** Vanilla HTML/CSS/JavaScript · Chart.js
- **Data:** Stats SA · DBE · DHIS · SAPS (real data where available, simulated to fill gaps)

---

## 🚀 Run locally

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/viza.git
cd viza

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Start the server
cd backend
uvicorn main:app --reload

# 4. Open your browser
# Go to http://localhost:8000
```

---

## 📁 Project structure

```
viza/
├── backend/
│   ├── main.py              # FastAPI app & all API routes
│   ├── requirements.txt
│   └── data/
│       ├── service_delivery.json
│       ├── unemployment.json
│       ├── indicators.json
│       └── flags.json       # Citizen-submitted flags (auto-created)
└── frontend/
    ├── index.html
    ├── style.css
    └── app.js
```

---

## 🌍 The bigger idea

ViZA is inspired by Estonia's X-Road — the platform that enabled 100% digital government services — but goes further by adding an AI-powered intelligence layer designed specifically for the complexity of a developing nation.

South Africa is one of the most data-rich countries on the African continent. The problem isn't a lack of data — it's that the data sits in disconnected silos, invisible to the people who need it most. ViZA's mission is to change that.

**Designed from inception to replicate across Africa.** South Africa is the proof of concept.

---

## 👩🏾‍💻 Author

**Nompumelelo N. Nkosi**  
Aspiring Software Developer · Southern Labs Institute of Technology  
[LinkedIn](https://linkedin.com/in/nompumelelonkosi/)

---

*Data sources: Statistics South Africa (Stats SA), Department of Basic Education (DBE), District Health Information System (DHIS), South African Police Service (SAPS). Some data points simulated to fill gaps where official open data is unavailable.*
