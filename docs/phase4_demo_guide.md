# CardioSight — Phase 4 Interactive Demonstration & Verification Guide

> **Medical Disclaimer & Educational Use Notice:**
> CardioSight is an experimental educational machine-learning prototype trained on a single-center cohort of 303 patients. It produces research probability estimates and is **NOT** a certified medical device, clinical diagnostic tool, or triage system. Do not use this application for medical decision-making.

---

## 1. Prerequisites & Environment Setup

- **Python Runtime:** Python 3.10+ (tested on Python 3.10.0, Windows x64).
- **Node.js Runtime:** Node.js 18+ or 20+ (tested on Node.js v24.12.0).
- **Network Ports:** Local TCP port `8000` (FastAPI backend) and `3000` (Next.js frontend).
- **Dependencies:**
  - Python: `pip install -r backend/requirements.txt`
  - Frontend: `cd frontend && npm install`
- **Environment Configuration:**
  - `frontend/.env.local` configured with `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` (template in `frontend/.env.example`).

---

## 2. System Startup Sequence

### Step 2.1: Start the FastAPI Inference Backend
Open a terminal in the project root:
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
**Expected output:**
```
INFO:     Started server process [...]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### Step 2.2: Start the Next.js Frontend Application
In a second terminal:
```bash
cd frontend
npm run dev
```
**Expected output:**
```
▲ Next.js 16.4.0 (Turbopack)
- Local:        http://localhost:3000
✓ Ready in ...ms
```

### Step 2.3: Verify System Status Bar
Open your browser to `http://localhost:3000`.
At the top of the dashboard, confirm the **System Infrastructure Status Bar**:
- **Backend Status:** `ONLINE (v0.2.0)`
- **Trained Pipelines:** `4/4 Ready (Cath, LAD, LCX, RCA)`
- **Feature Contract:** `49 Features (Set A: BMI Only, Leakage-Safe)`
- **Latest Inference:** `Idle`

---

## 3. Interactive Clinical Workflow Walkthrough

### Step 3.1: Synthetic Profile Beta Demonstration (Lower Risk)
CardioSight provides two labeled, non-patient synthetic demonstration presets:
- **Profile Alpha (Elevated Risk):** Male, 58yo, hypertensive, typical chest pain, high triglycerides, elevated fasting glucose.
- **Profile Beta (Lower Risk):** Female, 42yo, normotensive, nonanginal symptoms, normal lab values.

Click **`Demo: Profile Beta (Lower Risk)`** in the toolbar.
- The 5-tab clinical form populates with Profile Beta's 49 feature parameters.
- Notice the tabs organize features into:
  1. *Demographics & Anthropometrics*
  2. *Medical History & Risk Factors*
  3. *Symptoms & Physical Examination*
  4. *ECG Findings*
  5. *Laboratory & Metabolic Markers*

### Step 3.2: Input Validation & Pre-Inference Review
Click **`Review Clinical Inputs`** at the bottom of the form.
- The **Clinical Input Review Dialog** opens.
- Review the normalized 49-feature dictionary. Notice that:
  - Excluded diagnostic columns (`Cath`, `LAD`, `LCX`, `RCA`) and provisional echo columns (`EF-TTE`, `Region RWMA`, `VHD`, `Exertional CP`) are strictly excluded.
  - Underscored keys are formatted according to the trained pipeline schema.

### Step 3.3: Execute Live Inference
Click **`Confirm & Run Model Inference`**.
- The form executes concurrent requests to `POST /api/predict` and `POST /api/explain`.
- Within $<100\text{ ms}$, the results appear:
  - **Overall CAD Risk (Cath):** Low CAD probability (~$12.4\%$), labeled `Normal`.
  - **Artery Stenosis Risk (LAD, LCX, RCA):**
    - LAD Stenosis: Low probability (~$15.2\%$, Normal)
    - LCX Stenosis: Low probability (~$18.6\%$, Normal)
    - RCA Stenosis: Low probability (~$14.1\%$, Normal)

### Step 3.4: Cath vs Individual Artery Outputs
- **Cath (Overall CAD):** Represents generalized patient-level coronary artery disease diagnosed via angiography. It appears in its own dedicated card and is **never** mapped to arterial geometry.
- **LAD, LCX, RCA:** Represent focal branch-specific stenosis ($\ge 50\%$ diameter reduction). Their probabilities directly drive the visual shader colors of the corresponding 3D arterial meshes.

### Step 3.5: 3D Coronary Artery Digital Twin Inspection
Scroll to the **3D Coronary Artery Visualization** section:
- Notice the viewer is now in **Prediction-Aware Mode**.
- The three arterial meshes (`lad.obj`, `lcx.obj`, `rca.obj`) are shaded in green (Low Risk: $P < 30\%$).
- Orbit the camera using left-click drag, zoom with scroll wheel, or click **LAD**, **LCX**, or **RCA** in the vessel selection toolbar to inspect specific arterial segments.

### Step 3.6: Stale-State Warning Demonstration
In the *Demographics & Anthropometrics* tab, change **Age** from `42` to `46`.
- Notice the amber alert banner immediately appears above the prediction cards:
  > *"Clinical inputs modified — Results below reflect previous submission. Run inference to update predictions."*
- This prevents mistaking previously displayed predictions for the newly edited inputs.

### Step 3.7: Clean State Reset Demonstration
Click **`Reset to Blank`** in the form toolbar.
- The form resets to default baseline values.
- Previous prediction cards and SHAP attribution bars are cleared.
- The 3D anatomical viewer reverts immediately to **Mode A: Neutral Preview Mode**, ensuring no stale patient risk colors remain visible.

---

## 4. High-Risk Profile & SHAP Explainability Walkthrough

### Step 4.1: Execute Elevated Risk Inference
1. Click **`Demo: Profile Alpha (Elevated Risk)`**.
2. Click **`Review Clinical Inputs`**.
3. Click **`Confirm & Run Model Inference`**.

### Step 4.2: Prediction Results Inspection
- **Cath:** $96.3\%$ CAD probability (`CAD` Positive).
- **LAD:** $77.2\%$ Stenosis probability (`Stenotic` Positive).
- **LCX:** $51.2\%$ Stenosis probability (`Stenotic` Positive).
- **RCA:** $50.3\%$ Stenosis probability (`Stenotic` Positive).
- The 3D viewer colors LAD in crimson/red ($P > 70\%$) and LCX/RCA in amber ($50-70\%$).

### Step 4.3: SHAP Feature Attributions
Scroll to the **Model Explainability (SHAP Attributions)** section:
1. Select the **`Cath`** target tab:
   - Method: `LinearExplainer` (Logistic Regression).
   - Base expected value: $0.686$.
   - Waterfall attributions show positive contributions from *Typical Chest Pain* ($+0.105$), *Age 58* ($+0.042$), and *Hypertension* ($+0.038$).
2. Select the **`LAD`** target tab:
   - Method: `TreeExplainer` (Random Forest).
   - Local feature ranking displays tree-based probability contributions.
3. Review the **Population Global Feature Importance** chart:
   - Sourced from `backend/artifacts/global_shap_importance.json` computed over the 242-patient training partition.
4. Note the **Causality Notice**:
   > *"SHAP values represent mathematical feature attribution within the trained model pipeline for this specific patient profile. Feature contributions reflect correlation within the study cohort and DO NOT prove biological causation, clinical mechanism, or treatment efficacy."*

---

## 5. Model Evaluation Dashboard Walkthrough

Scroll to the **Authoritative Benchmark Evaluation Metrics** section:
- Sourced directly from `backend/artifacts/metrics.json`.
- Displays the held-out test split ($N=61$) metrics:
  - **Cath:** ROC-AUC `0.8889`, Accuracy `83.6%`, F1 `0.8810`, Confusion Matrix `[14, 4, 6, 37]`.
  - **LAD:** ROC-AUC `0.7911`, Accuracy `77.0%`, F1 `0.8108`, Confusion Matrix `[17, 8, 6, 30]`.
  - **LCX:** ROC-AUC `0.7320`, Accuracy `68.9%`, F1 `0.5957`, Confusion Matrix `[28, 9, 10, 14]`.
  - **RCA:** ROC-AUC `0.7334`, Accuracy `70.5%`, F1 `0.5909`, Confusion Matrix `[30, 8, 10, 13]`.
- Also displays 5-fold cross-validation metrics across all four targets for full transparency.

---

## 6. Failure-Handling & Edge-Case Demonstration

| Test Scenario | Procedure | Expected Safe Behavior |
| :--- | :--- | :--- |
| **Out-of-Bounds Input** | Enter `Age: 12` or `BMI: 95` and click Review | Form displays inline validation error and prevents modal opening. |
| **Non-Finite Input (`NaN`)** | Send `NaN` via API client | Server rejects with HTTP 422 Unprocessable Entity. |
| **Leakage Injection** | Add `Cath: 1` to payload | Server rejects with HTTP 422: *"Forbidden input feature detected"*. |
| **Oversized Payload** | Send payload $>1\text{ MB}$ | Server returns HTTP 413: *"Payload exceeds 1MB limit"*. |
| **Backend Offline** | Stop uvicorn server and click Submit | Client displays friendly connection error banner; stale predictions are cleared; 3D viewer reverts to Neutral Mode. |
| **WebGL Unavailable** | Disable WebGL in browser | 3D viewer gracefully displays fallback card without crashing. |

---

## 7. Suggested Technical Demonstration Narrative (5-Minute Pitch)

1. **Introduction (1 min):**
   - Introduce CardioSight as an educational cardiovascular risk prediction system paired with a 3D anatomical digital twin.
   - Point out the System Status Bar: running live FastAPI with four scikit-learn models (Cath, LAD, LCX, RCA) trained on the Z-Alizadeh Sani cohort under strict leakage prevention.
2. **Clinical Input & Review (1 min):**
   - Load `Demo: Profile Beta (Lower Risk)`.
   - Explain the 5 clinical feature categories derived from the schema.
   - Open the Review Modal to emphasize clinical safety: verifying inputs before inference and excluding targets or unverified echocardiography features.
3. **Live Prediction & 3D Anatomical Twin (1.5 min):**
   - Click Confirm & Run Inference. Highlight sub-50ms inference.
   - Contrast overall CAD (`Cath`) at the patient level with the artery-specific probabilities.
   - Transition to the 3D Coronary Artery Digital Twin: orbit around the canonical BodyParts3D arterial meshes showing green risk coloration.
   - Show stale-state handling: edit Age and point out the alert warning that displayed results belong to the prior submission. Reset to neutral.
4. **Elevated Risk & Explainability (1 min):**
   - Load `Demo: Profile Alpha (Elevated Risk)`. Run inference.
   - Show the dramatic color shift on the LAD mesh (crimson) and LCX/RCA (amber).
   - Scroll to SHAP Explainability: switch between Cath (LinearExplainer) and LAD (TreeExplainer). Highlight the causality disclaimer: statistical attribution is correlation, not clinical etiology.
5. **Transparency & Benchmark (0.5 min):**
   - Show the Model Evaluation dashboard displaying real held-out test ROC-AUCs (`0.8889` for Cath, `0.7911` for LAD).
   - Reiterate that CardioSight is an educational research tool, not a diagnostic medical device.

---

## 8. Troubleshooting

- **CORS Error on localhost:** Verify that `backend/main.py` is running and that your frontend URL is listed in `ALLOWED_ORIGINS` (defaults to `http://localhost:3000,http://127.0.0.1:3000`).
- **Missing Models Warning:** Ensure `backend/artifacts/` contains all four `.joblib` files. If missing, execute `python backend/train.py`.
- **Port Conflict:** If port 8000 is occupied, run `python -m uvicorn backend.main:app --port 8080` and set `NEXT_PUBLIC_API_URL=http://127.0.0.1:8080` in `frontend/.env.local`.
