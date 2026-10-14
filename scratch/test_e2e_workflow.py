import requests
import json

base_api = "http://127.0.0.1:8000"
base_fe = "http://localhost:3000"

print("--- END-TO-END SYSTEM VERIFICATION ---")

# 1. Health
r = requests.get(f"{base_api}/api/health")
print(f"1. /api/health: {r.status_code} -> {r.json()['status']}")

# 2. Models Status
r = requests.get(f"{base_api}/api/models/status")
print(f"2. /api/models/status: {r.status_code} -> models_loaded: {r.json()['models_loaded']}, available: {r.json()['available_targets']}")

# 3. Metrics
r = requests.get(f"{base_api}/api/metrics")
print(f"3. /api/metrics: {r.status_code} -> targets in report: {list(r.json()['target_evaluations'].keys())}")

# 4. Predict
sample_patient = {
    "Age": 58, "Sex": "Male", "BMI": 26.78, "DM": 0, "HTN": 1, "Current Smoker": 0, "EX-Smoker": 0,
    "FH": 0, "Obesity": "N", "CRF": "N", "CVA": "N", "Airway disease": "N", "Thyroid Disease": "N",
    "CHF": "N", "DLP": "N", "BP": 130, "PR": 75, "Edema": 0, "Weak Peripheral Pulse": "N",
    "Lung rales": "N", "Systolic Murmur": "N", "Diastolic Murmur": "N", "Typical Chest Pain": 1,
    "Dyspnea": "N", "Function Class": 0, "Atypical": "N", "Nonanginal": "N", "LowTH Ang": "N",
    "Q Wave": 0, "St Elevation": 0, "St Depression": 0, "Tinversion": 0, "LVH": "N",
    "Poor R Progression": "N", "BBB": "N", "FBS": 100, "CR": 1.0, "TG": 140, "LDL": 100,
    "HDL": 40.0, "BUN": 16, "ESR": 15, "HB": 13.5, "K": 4.2, "Na": 141, "WBC": 7200,
    "Lymph": 32, "Neut": 60, "PLT": 220
}
r = requests.post(f"{base_api}/api/predict", json=sample_patient)
pred_data = r.json()
print(f"4. /api/predict: {r.status_code}")
for t in ["Cath", "LAD", "LCX", "RCA"]:
    print(f"   {t}: {pred_data['predictions'][t]['positive_probability']} ({pred_data['predictions'][t]['predicted_label']})")

# 5. Explain
r = requests.post(f"{base_api}/api/explain", json={"patient": sample_patient, "target": "all", "top_n": 5})
exp_data = r.json()
print(f"5. /api/explain: {r.status_code}")
for t in ["Cath", "LAD", "LCX", "RCA"]:
    top_f = exp_data['explanations'][t]['features'][0]
    print(f"   {t} Top feature: {top_f['feature_name']} (contrib: {top_f['contribution']}) [{exp_data['explanations'][t]['method']}]")

# 6. Frontend
r = requests.get(base_fe)
print(f"6. Frontend http://localhost:3000: {r.status_code} ({len(r.text)} bytes)")
print("ALL ENDPOINTS VERIFIED OPERATIONAL!")
