"""
ViZA — Visible South Africa
FastAPI Backend · Mock Portfolio Project
Author: Nompumelelo N. Nkosi
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from datetime import datetime
import json, os, uuid

app = FastAPI(
    title="ViZA API",
    description="Visible South Africa — National Data Intelligence Platform (Mock)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/", include_in_schema=False)
def root():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def load(filename):
    with open(os.path.join(DATA_DIR, filename)) as f:
        return json.load(f)

def save_flags(flags):
    with open(os.path.join(DATA_DIR, "flags.json"), "w") as f:
        json.dump({"flags": flags}, f, indent=2)

class FlagRequest(BaseModel):
    province: str
    category: str
    indicator: str
    reported_value: float
    citizen_note: str
    contact: str = "Anonymous"

@app.get("/api/summary")
def get_summary():
    sd = load("service_delivery.json")
    un = load("unemployment.json")
    ind = load("indicators.json")
    return {
        "timestamp": datetime.now().isoformat(),
        "service_delivery": sd["national_average"],
        "unemployment": un["national_average"],
        "indicators": ind["national_average"],
        "provinces_monitored": len(sd["provinces"]),
        "data_sources": 4
    }

@app.get("/api/service-delivery")
def get_service_delivery(province: str = None):
    data = load("service_delivery.json")
    if province:
        match = next((p for p in data["provinces"] if p["code"] == province or p["name"] == province), None)
        if not match:
            raise HTTPException(404, detail=f"Province '{province}' not found.")
        return {"metadata": data["metadata"], "national_average": data["national_average"], "province": match}
    return data

@app.get("/api/unemployment")
def get_unemployment(province: str = None):
    data = load("unemployment.json")
    if province:
        match = next((p for p in data["provinces"] if p["code"] == province or p["name"] == province), None)
        if not match:
            raise HTTPException(404, detail=f"Province '{province}' not found.")
        return {"metadata": data["metadata"], "national_average": data["national_average"], "province": match}
    return data

@app.get("/api/indicators")
def get_indicators(province: str = None):
    data = load("indicators.json")
    if province:
        match = next((p for p in data["provinces"] if p["code"] == province or p["name"] == province), None)
        if not match:
            raise HTTPException(404, detail=f"Province '{province}' not found.")
        return {"metadata": data["metadata"], "national_average": data["national_average"], "province": match}
    return data

@app.get("/api/provinces")
def get_provinces():
    data = load("service_delivery.json")
    return [{"name": p["name"], "code": p["code"], "population": p["population"]} for p in data["provinces"]]

@app.get("/api/anomalies")
def get_anomalies():
    sd = load("service_delivery.json")
    un = load("unemployment.json")
    ind = load("indicators.json")
    sd_avg = sd["national_average"]
    un_avg = un["national_average"]
    ind_avg = ind["national_average"]
    THRESHOLD = 8
    anomalies = []

    for p in sd["provinces"]:
        issues = []
        for key, label in [("electricity","Electricity Access"),("water","Water Access"),("sanitation","Sanitation")]:
            if sd_avg[key] - p[key] > THRESHOLD:
                issues.append({"indicator": label, "value": p[key], "national": sd_avg[key], "gap": round(sd_avg[key] - p[key], 1)})
        if issues:
            anomalies.append({"province": p["name"], "code": p["code"], "issues": issues})

    for p in un["provinces"]:
        if p["youth_15_24"] - un_avg["youth_15_24"] > THRESHOLD:
            issue = {"indicator": "Youth Unemployment (15-24)", "value": p["youth_15_24"], "national": un_avg["youth_15_24"], "gap": round(p["youth_15_24"] - un_avg["youth_15_24"], 1)}
            existing = next((a for a in anomalies if a["code"] == p["code"]), None)
            if existing: existing["issues"].append(issue)
            else: anomalies.append({"province": p["name"], "code": p["code"], "issues": [issue]})

    for p in ind["provinces"]:
        issues = []
        if ind_avg["matric_pass_rate"] - p["matric_pass_rate"] > THRESHOLD:
            issues.append({"indicator": "Matric Pass Rate", "value": p["matric_pass_rate"], "national": ind_avg["matric_pass_rate"], "gap": round(ind_avg["matric_pass_rate"] - p["matric_pass_rate"], 1)})
        if p["clinic_access_km"] - ind_avg["clinic_access_km"] > 5:
            issues.append({"indicator": "Clinic Distance (km)", "value": p["clinic_access_km"], "national": ind_avg["clinic_access_km"], "gap": round(p["clinic_access_km"] - ind_avg["clinic_access_km"], 1)})
        if issues:
            existing = next((a for a in anomalies if a["code"] == p["code"]), None)
            if existing: existing["issues"].extend(issues)
            else: anomalies.append({"province": p["name"], "code": p["code"], "issues": issues})

    return {"total_anomalies": sum(len(a["issues"]) for a in anomalies), "provinces": anomalies}

@app.post("/api/flag")
def submit_flag(flag: FlagRequest):
    data = load("flags.json")
    flags = data["flags"]
    new_flag = {
        "id": str(uuid.uuid4())[:8].upper(),
        "timestamp": datetime.now().isoformat(),
        "province": flag.province,
        "category": flag.category,
        "indicator": flag.indicator,
        "reported_value": flag.reported_value,
        "citizen_note": flag.citizen_note,
        "contact": flag.contact,
        "status": "PENDING REVIEW"
    }
    flags.insert(0, new_flag)
    save_flags(flags)
    return {"message": "Flag submitted successfully.", "flag_id": new_flag["id"], "status": "PENDING REVIEW"}

@app.get("/api/flags")
def get_flags():
    data = load("flags.json")
    return {"total": len(data["flags"]), "flags": data["flags"]}

@app.delete("/api/flags/{flag_id}")
def resolve_flag(flag_id: str):
    data = load("flags.json")
    flags = data["flags"]
    match = next((f for f in flags if f["id"] == flag_id), None)
    if not match:
        raise HTTPException(404, detail="Flag not found.")
    match["status"] = "RESOLVED"
    save_flags(flags)
    return {"message": f"Flag {flag_id} marked as resolved."}
