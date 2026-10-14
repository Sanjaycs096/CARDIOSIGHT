# CardioSight

**CardioSight** is an AI-powered cardiovascular clinical risk prediction system paired with an interactive 3D anatomical digital twin. It predicts patient-specific risk for overall Coronary Artery Disease (CAD) as well as localized arterial stenosis in the Left Anterior Descending (LAD), Left Circumflex (LCX), and Right Coronary Artery (RCA).

---

## Current Status: Phase 5 Final Release Readiness Completed & Verified

- **Phase 1 (Foundation, Dataset & 3D Assets):** **PASS WITH DOCUMENTED LIMITATIONS**
- **Phase 2 (Leakage-Safe ML, Cross-Validation, Artifacts & FastAPI Inference):** **PASS**
- **Phase 3A (Interactive 3D Coronary Artery Visualization Layer):** **PASS**
- **Phase 3B (Clinical Input Workflow & Live Prediction Dashboard):** **PASS**
- **Phase 3C (SHAP Model Explainability & Evaluation Dashboard):** **PASS**
- **Phase 4 (Production Readiness, Security, Reliability & Final Verification):** **PASS**
- **Phase 5 (Final Release Readiness, Acceptance Testing & Project Freeze):** **PASS WITH DOCUMENTED LIMITATIONS**

---

## Project Structure

```
Cardiosight/
├── .gitignore                                # Environment & build exclusions
├── README.md                                 # Master project documentation
├── extention of Z-Alizadeh sani dataset.csv  # Original clinical dataset
├── data/
│   ├── raw/                                  # Unmodified clinical datasets
│   └── processed/                            # Reproducible intermediate datasets
├── models/                                   # BodyParts3D source anatomical folders (188 OBJs)
├── selected_models/                          # Staged 3D assets & manifest
│   ├── lad.obj                               # Primary LAD mesh (MM424)
│   ├── lcx.obj                               # Primary LCX mesh (MM635)
│   ├── rca.obj                               # Primary RCA mesh (MM439)
│   ├── manifest.json                         # Complete asset manifest
│   ├── README.md                             # Asset summary
│   └── candidates/                           # 16 alternative & branch candidates
├── backend/                                  # FastAPI backend & ML pipeline
│   ├── main.py                               # FastAPI application & routes (/predict, /explain)
│   ├── schemas.py                            # Pydantic v2 validation contracts
│   ├── train.py                              # Master reproducible training script
│   ├── requirements.txt                      # Python dependencies (including shap>=0.45.0)
│   ├── ml/                                   # Leakage-safe ML package
│   │   ├── config.py                         # Target contracts & constants
│   │   ├── data_loader.py                    # Dataset loading & split manager
│   │   ├── pipeline.py                       # scikit-learn ColumnTransformer & Pipeline
│   │   └── evaluator.py                      # Metrics & cross-validation calculator
│   └── artifacts/                            # Persisted models & metadata
│       ├── cath_pipeline.joblib              # Fitted Cath pipeline (LogisticRegression)
│       ├── lad_pipeline.joblib               # Fitted LAD pipeline (RandomForest)
│       ├── lcx_pipeline.joblib               # Fitted LCX pipeline (RandomForest)
│       ├── rca_pipeline.joblib               # Fitted RCA pipeline (LogisticRegression)
│       ├── metrics.json                      # Full CV and test evaluation metrics
│       ├── feature_schema.json               # Input schema & bounds specification
│       ├── global_shap_importance.json       # Precomputed cohort SHAP importance (N=242)
│       └── training_metadata.json            # Versioning, seeds, and platform metadata
├── frontend/                                 # Next.js 16 + React frontend
│   ├── .env.example                          # Environment variable template
│   ├── package.json
│   ├── tests/
│   │   ├── vesselMapping.test.mjs            # Phase 3A 3D vessel color & probability mapping tests
│   │   └── clinicalWorkflow.test.mjs         # Phase 3B/3C schema validation & payload normalization tests
│   └── src/
│       ├── app/
│       │   ├── page.tsx                      # Fully integrated clinical prediction & explainability dashboard
│       │   └── globals.css                   # Obsidian & crimson theme styling
│       ├── components/
│       │   ├── clinical/                     # Phase 3B clinical input workflow
│       │   │   ├── ClinicalInputForm.tsx     # 5-tab schema-validated feature input form
│       │   │   └── ReviewModal.tsx           # Explicit pre-submission review & confirmation dialog
│       │   ├── dashboard/                    # Phase 3B/3C prediction, explainability & metrics
│       │   │   ├── SystemStatusBar.tsx       # Live FastAPI connection & model status
│       │   │   ├── PredictionResults.tsx     # Isolated Cath patient card + LAD/LCX/RCA vessel cards
│       │   │   ├── ExplainabilityDashboard.tsx # Target-specific SHAP local waterfall & global importance
│       │   │   └── MetricsDashboard.tsx      # Held-out test (N=61) & 5-fold CV evaluation metrics
│       │   └── viewer/                       # Phase 3A 3D coronary artery visualization
│       │       ├── CoronaryViewer.tsx        # Three.js canvas & dual-mode coordinator
│       │       └── ...
│       ├── types/
│       │   ├── prediction.ts                 # TypeScript prediction contracts
│       │   └── explanation.ts                # TypeScript SHAP explanation contracts
│       └── utils/
│           ├── apiClient.ts                  # Typed client for /predict, /explain, /metrics, /health
│           ├── clinicalFormDefaults.ts       # Validation bounds, blank state & labeled demo presets
│           └── vesselMapping.ts              # Risk band & continuous color interpolator
├── tests/                                    # Automated backend pytest suite (17 tests)
│   ├── test_pipeline.py                      # Leakage, mapping, and pipeline tests
│   └── test_api.py                           # FastAPI /health, /predict, /metrics, and /explain tests
├── scripts/
│   ├── inspect_dataset.py                    # Dataset inspection utility
│   └── process_models.py                     # 3D asset processing utility
└── docs/
    ├── phase3b_phase3c_report.md             # Phase 3B & Phase 3C comprehensive implementation report
    ├── phase3a_visualization.md              # Phase 3A 3D visualization architecture & verification
    ├── phase2_model_evaluation.md            # Phase 2 ML evaluation & model selection report
    ├── dataset_schema_report.md              # Clinical dataset schema & leakage audit
    └── phase1_verification.md                # Phase 1 asset discovery & canonical mesh staging
```

---

## Phase 2 Machine Learning & Evaluation Summary

### 1. Mandatory Leakage Prevention
Eight columns are strictly excluded from all training feature matrices:
- Targets: `Cath`, `LAD`, `LCX`, `RCA` (Ground-truth diagnostic outcomes)
- Provisional Echo Exclusions: `EF-TTE`, `Region RWMA`, `VHD` (Excluded pending clinical timing confirmation)
- Zero-Variance Exclusions: `Exertional CP` (100% constant `'N'` in source dataset)

### 2. Feature-Set Collinearity Comparison
To evaluate mathematical collinearity between `BMI`, `Weight`, and `Length` ($BMI = \text{Weight} / (\text{Length}/100)^2$), three architectures were compared across all 4 targets via 5-fold Stratified CV:
- **Set A (BMI Only, 49 features):** Selected. Completely eliminates collinearity while matching or exceeding discriminative performance.
- **Set B (Weight & Length Only, 50 features):** Dropped.
- **Set C (All Three Features, 51 features):** Dropped.

### 3. Model Selection & Performance
Models were selected strictly based on **5-fold Stratified Cross-Validation on the 80% training partition** (held-out test split remained untouched):

| Target | Selected Model | 5-Fold CV ROC-AUC | Held-Out Test ROC-AUC (n=61) | Test Accuracy | Test F1 Score | Test Confusion Matrix (TN, FP, FN, TP) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Cath** | Logistic Regression | **0.9175** (±0.0297) | **0.8889** | 83.6% | 0.8810 | `[14, 4, 6, 37]` |
| **LAD** | Random Forest | **0.8011** (±0.0442) | **0.7911** | 77.0% | 0.8108 | `[17, 8, 6, 30]` |
| **LCX** | Random Forest | **0.7070** (±0.0428) | **0.7320** | 68.9% | 0.5957 | `[28, 9, 10, 14]` |
| **RCA** | Logistic Regression | **0.7261** (±0.0935) | **0.7334** | 70.5% | 0.5909 | `[30, 8, 10, 13]` |

For full evaluation details and fold breakdown, see [`docs/phase2_model_evaluation.md`](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/docs/phase2_model_evaluation.md).

---

## FastAPI Inference & Explainability Endpoints

| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Service description, version, and clinical disclaimer. |
| `GET` | `/api/health` | Service health status and runtime environment. |
| `GET` | `/api/models/status` | Loaded model status, available targets, and artifact paths. |
| `POST` | `/api/predict` | Validates patient input and returns probability estimates for all 4 targets. Rejects leaked targets or invalid categories with HTTP 422. |
| `POST` | `/api/explain` | Computes on-the-fly local SHAP feature contributions and returns cohort-level global SHAP importance for any or all 4 targets. |
| `GET` | `/api/metrics` | Returns full cross-validation and test evaluation metrics from `backend/artifacts/metrics.json`. |

---

## SHAP Explainability Architecture (Phase 3C)

- **LAD & LCX (Random Forest):** Analyzed with `shap.TreeExplainer(model_step)` over the transformed 55-dimensional feature space. Explanations correspond strictly to positive class output ($P(\text{Stenosis})$).
- **Cath & RCA (Logistic Regression):** Analyzed with `shap.LinearExplainer(model_step, background)` over the standardized feature space, strictly oriented towards the positive class ($P(\text{CAD})$ and $P(\text{Stenosis})$).
- **Global Feature Importance:** Precomputed across the complete 242-patient training partition (`backend/artifacts/global_shap_importance.json`) to provide instantaneous baseline context without runtime re-computation.
- **Causality Notice:** SHAP contributions represent mathematical attribution inside fitted statistical models, **not** biological causality, clinical etiology, or interventional guarantees.

---

## How to Run

### Quick Start (Windows Launcher)
Double-click `launch_cardiosight.bat` from Windows Explorer or run from PowerShell:
```cmd
.\launch_cardiosight.bat
```
This script automatically verifies Python and Node.js environments, checks for port availability, and launches the FastAPI backend (`http://127.0.0.1:8000`) and Next.js frontend (`http://localhost:3000`) in separate persistent terminal windows.

---

### Manual Step-by-Step Launch
 
#### 1. Execute Training Pipeline (Optional / Reproducibility)
```bash
python backend/train.py
```

#### 2. Run Automated Test & Quality Suites
```bash
# Run backend pytest suite (23 passing tests)
python -m pytest tests -v

# Run frontend test suite (15 passing unit tests)
cd frontend
npm test

# Run TypeScript type-checking (0 errors)
npx tsc --noEmit

# Run Next.js production build (100% static compilation)
npm run build
```

#### 3. Run Performance & Artifact Benchmark
```bash
python scripts/benchmark_performance.py
```

#### 4. Start Backend API Server
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
Verify backend health and status:
- Health Check: `http://127.0.0.1:8000/api/health`
- Model Status: `http://127.0.0.1:8000/api/models/status`

#### 5. Start Frontend Application (Next.js 16)
```bash
cd frontend
cp .env.example .env.local    # Configures NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
npm install
npm run dev                   # Starts Next.js dashboard on http://localhost:3000
```

---

## 3D Canonical Coronary Artery Assets & Visualization Boundaries

CardioSight incorporates three canonical coronary artery OBJ meshes sourced from the authoritative open BodyParts3D anatomical dataset (University of Tokyo / DBCLS):
- **LAD (`frontend/public/models/lad.obj`):** Left Anterior Descending artery branch ($67.7\text{ KB}$, 1,518 vertices).
- **LCX (`frontend/public/models/lcx.obj`):** Left Circumflex artery branch ($787.4\text{ KB}$, 17,664 vertices).
- **RCA (`frontend/public/models/rca.obj`):** Right Coronary Artery branch ($88.2\text{ KB}$, 1,978 vertices).

### Key Architectural & Anatomical Boundaries:
1. **Isolation of Global CAD Target (`Cath`):** The `Cath` model predicts overall patient-level CAD outcome from cardiac catheterization. It is strictly presented in its own dedicated card and is **never** mapped to an arterial mesh. Only focal branch targets (`LAD`, `LCX`, `RCA`) drive the color shaders of the 3D meshes.
2. **Canonical Reference Geometry vs. Patient-Specific Anatomy:** The 3D arterial models represent canonical reference anatomy. They are **not** reconstructed patient-specific segmented meshes from patient CT angiography or intravascular ultrasound (IVUS).
3. **Dual-Mode Visualizer:**
   - **Mode A (Neutral Preview):** Displays anatomical geometry with neutral slate-gray shading prior to inference.
   - **Mode B (Prediction-Aware):** Color-codes each artery according to ML model risk estimates ($<30\%$ Emerald/Low Risk, $30-50\%$ Amber/Moderate, $50-70\%$ Orange/Elevated, $>70\%$ Crimson/High Risk).

---

## Documentation Index

- [`docs/phase5_release_acceptance_report.md`](docs/phase5_release_acceptance_report.md): Master Phase 5 release acceptance, fresh-start launcher testing, full regression suite, security & medical review, and project freeze report.
- [`docs/3d_visualization_fix_report.md`](docs/3d_visualization_fix_report.md): Technical root cause analysis, mathematical scene-graph pivot fix, camera framing, and real browser verification for the 3D coronary models.
- [`docs/phase4_readiness_report.md`](docs/phase4_readiness_report.md): Master Phase 4 production readiness, security audit, latency benchmarking, artifact hash verification, and final sign-off report.
- [`docs/phase4_performance_report.md`](docs/phase4_performance_report.md): Latency profiling, steady-state throughput (50 runs), memory profiling, and artifact hash verification report.
- [`docs/phase4_demo_guide.md`](docs/phase4_demo_guide.md): Complete interactive demonstration and verification guide for presentation walkthroughs.
- [`docs/phase3b_phase3c_report.md`](docs/phase3b_phase3c_report.md): Master Phase 3B & 3C implementation report covering clinical workflow, live inference integration, 3D anatomical twin coupling, SHAP explainability, and evaluation dashboard.
- [`docs/phase3a_visualization.md`](docs/phase3a_visualization.md): Phase 3A 3D visualization architecture, mesh coordinate system, color encoding, and verification results.
- [`docs/phase2_model_evaluation.md`](docs/phase2_model_evaluation.md): Phase 2 ML pipelines, 5-fold cross-validation, held-out evaluation, and FastAPI schemas.
- [`docs/dataset_schema_report.md`](docs/dataset_schema_report.md): Clinical dataset schema, feature descriptions, and leakage audit.
- [`docs/phase1_verification.md`](docs/phase1_verification.md): Phase 1 asset discovery and canonical mesh staging.

---

## Known Limitations & Troubleshooting

1. **Transitive `braces` DevDependency Advisory:** `npm audit` flags a high-severity advisory (`GHSA-vfj7-8cjw-p6xm`) in `braces <= 3.0.3` via `eslint-config-next@16.4.0`. Running `npm audit fix --force` would downgrade to Next.js 14 and break Turbopack. This package is strictly an offline build-time linter tool and is never bundled into client runtime code.
2. **Single-Center Cohort Dataset:** The machine-learning models are trained on the Z-Alizadeh Sani clinical dataset (303 Iranian patients). External validity across broader demographic cohorts has not been established.
3. **Mathematical Attribution vs. Clinical Causality:** SHAP attributions represent mathematical contributions within the fitted scikit-learn models; they do not indicate biological causation or clinical etiology.
4. **Port Conflicts:** If ports 8000 or 3000 are in use, `launch_cardiosight.bat` detects this non-destructively and informs the user without terminating unrelated processes.

---

## Clinical Safeguards & Limitations

> [!CAUTION]
> **Experimental Educational Prototype:** CardioSight model outputs are machine-learning probability estimates trained on a single-center cohort of 303 patients. They have not been established as clinically validated diagnostic tools and must not be used for medical diagnosis, clinical triage, or treatment decisions.
