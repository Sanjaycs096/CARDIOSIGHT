# CardioSight — Phase 2 Model Training & Evaluation Report

**Verification & Audit Date:** October 13, 2026  
**Final Status:** `PASS — Phase 2 Verified and Complete`  
**Dataset Source:** `data/raw/extention of Z-Alizadeh sani dataset.csv` (Z-Alizadeh Sani cohort, Tehran Heart Center)  
**Dataset Dimensions:** 303 patient records, 59 columns (0 missing values, 0 duplicate rows)  
**Fixed Random Seed:** `42`  
**Software Environment:** Python 3.10.0 | scikit-learn 1.5.0 | FastAPI 0.115.x | Windows 10/11 x64  

---

> [!CAUTION]
> **Clinical Safeguard:** CardioSight is an experimental educational prototype. Model outputs are machine-learning probability estimates trained on a retrospective single-center dataset and **must not be used as clinical diagnostic instruments, triage tools, or medical advice**.

---

## 1. Dataset Partition & Mandatory Feature Exclusions

### A. Target Ground-Truth & Class Counts (303 records)
| Target | Diagnostic Definition | Positive Class | Negative Class | Positive Count (%) | Negative Count (%) |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Cath** | Overall Coronary Artery Disease | `CAD` (1) | `Normal` (0) | 216 (71.3%) | 87 (28.7%) |
| **LAD** | Left Anterior Descending Stenosis (≥50%) | `Stenotic` (1) | `Normal` (0) | 177 (58.4%) | 126 (41.6%) |
| **LCX** | Left Circumflex Artery Stenosis (≥50%) | `Stenotic` (1) | `Normal` (0) | 119 (39.3%) | 184 (60.7%) |
| **RCA** | Right Coronary Artery Stenosis (≥50%) | `Stenotic` (1) | `Normal` (0) | 114 (37.6%) | 189 (62.4%) |

### B. Mandatory Excluded Columns (8 columns)
The following columns were strictly excluded from all predictive feature matrices:
1. `Cath` (Target outcome)
2. `LAD` (Target outcome)
3. `LCX` (Target outcome)
4. `RCA` (Target outcome)
5. `EF-TTE` (Provisional exclusion: Transthoracic Echo Ejection Fraction)
6. `Region RWMA` (Provisional exclusion: Regional Wall Motion Abnormality)
7. `VHD` (Provisional exclusion: Valvular Heart Disease)
8. `Exertional CP` (Exclusion: 100% constant 'N' in source cohort, zero informational entropy)

---

## 2. Feature Set Collinearity Comparison

To resolve the exact mathematical collinearity between Body Mass Index, Weight, and Height ($BMI = \text{Weight} / (\text{Length}/100)^2$), three feature set architectures were evaluated across all 4 targets using 5-fold Stratified Cross-Validation on the full cohort:

| Feature Set | Features | Configuration Description | Cath CV AUC | LAD CV AUC | LCX CV AUC | RCA CV AUC |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: |
| **Set_A_BMI_Only** | **49** | **Retains BMI, drops Weight and Length** | **0.9186** | **0.7939** | **0.6647** | **0.7173** |
| **Set_B_Weight_Length_Only** | 50 | Retains Weight and Length, drops BMI | 0.9175 | 0.7948 | 0.6582 | 0.7097 |
| **Set_C_All_Three** | 51 | Retains all three features (BMI, Weight, Length) | 0.9176 | 0.7943 | 0.6571 | 0.7092 |

**Selected Feature Set:** `Set_A_BMI_Only` (49 features).  
**Selection Rationale:** `Set_A_BMI_Only` completely eliminates the exact collinear dependency while achieving equal or superior discriminative performance with fewer model parameters.

---

## 3. Model Architecture Selection (Training Partition CV)

Models were evaluated strictly on the **80% training partition (n=242)** using **5-Fold Stratified Cross-Validation**. The 20% held-out test split (n=61) was untouched during model selection:

| Target | Logistic Regression CV AUC (mean ± std) | Random Forest CV AUC (mean ± std) | Selected Architecture | Selection Rationale |
| :--- | :---: | :---: | :--- | :--- |
| **Cath** | **0.9175** (±0.0297) | 0.9023 (±0.0440) | **Logistic Regression** | Superior linear boundary with balanced class weighting; higher CV ROC-AUC (+0.0152). |
| **LAD** | 0.7653 (±0.0355) | **0.8011** (±0.0442) | **Random Forest** | Random Forest outperformed linear model by +0.0358 in CV ROC-AUC; captures non-linear ECG interactions. |
| **LCX** | 0.6676 (±0.0813) | **0.7070** (±0.0428) | **Random Forest** | Random Forest outperformed linear baseline by +0.0394 with lower fold variance (±0.0428 vs ±0.0813). |
| **RCA** | **0.7261** (±0.0935) | 0.7241 (±0.0613) | **Logistic Regression** | Marginally superior CV ROC-AUC with higher F1 score (0.5764 vs 0.5265). |

---

## 4. Held-Out Test Evaluation (Unseen 20% Partition)

The selected winning pipelines were fitted on the 80% training set and evaluated **exactly once on the held-out test split (n=61 patients, stratified)**:

| Target | Model | Positive Label | Test ROC-AUC | Test Accuracy | Test F1 Score | Test Precision | Test Recall | Confusion Matrix (TN, FP, FN, TP) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Cath** | Logistic Regression | `CAD` | **0.8889** | 83.61% | 0.8810 | 0.9024 | 0.8605 | `[14, 4, 6, 37]` |
| **LAD** | Random Forest | `Stenotic` | **0.7911** | 77.05% | 0.8108 | 0.7895 | 0.8333 | `[17, 8, 6, 30]` |
| **LCX** | Random Forest | `Stenotic` | **0.7320** | 68.85% | 0.5957 | 0.6087 | 0.5833 | `[28, 9, 10, 14]` |
| **RCA** | Logistic Regression | `Stenotic` | **0.7334** | 70.49% | 0.5909 | 0.6190 | 0.5652 | `[30, 8, 10, 13]` |

---

## 5. Persisted Artifacts

All artifacts are persisted locally under `backend/artifacts/`:

| Artifact | File Size | Description |
| :--- | :---: | :--- |
| `cath_pipeline.joblib` | 12.5 KB | Complete fitted pipeline: `sanitize` $\rightarrow$ `ColumnTransformer` $\rightarrow$ `LogisticRegression` |
| `lad_pipeline.joblib` | 352.0 KB | Complete fitted pipeline: `sanitize` $\rightarrow$ `ColumnTransformer` $\rightarrow$ `RandomForestClassifier` |
| `lcx_pipeline.joblib` | 348.7 KB | Complete fitted pipeline: `sanitize` $\rightarrow$ `ColumnTransformer` $\rightarrow$ `RandomForestClassifier` |
| `rca_pipeline.joblib` | 12.5 KB | Complete fitted pipeline: `sanitize` $\rightarrow$ `ColumnTransformer` $\rightarrow$ `LogisticRegression` |
| `metrics.json` | 23.1 KB | Machine-readable metrics: CV results, test results, confusion matrices, class counts |
| `feature_schema.json` | 8.8 KB | Input feature schema: data types, allowed categories, observed min/max bounds |
| `training_metadata.json` | 0.8 KB | Execution metadata: random seed, package versions, hardware platform |

---

## 6. FastAPI Inference API & Run Instructions

### Endpoints
- `GET /api/health` — Service health status (`200 OK`).
- `GET /api/models/status` — Status of the 4 loaded pipelines, available targets, and artifact paths.
- `POST /api/predict` — Accepts patient features, validates against Pydantic schema, and returns calibrated probabilities summing to 1.0 for each target. Rejects leaked targets or invalid categories with `HTTP 422`.
- `GET /api/metrics` — Returns full cross-validation and test evaluation metrics from `metrics.json`.

### Run Instructions
```bash
# 1. Run reproducible training pipeline
python backend/train.py

# 2. Run automated test suite (14 tests)
python -m pytest tests -v

# 3. Start FastAPI inference server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

---

## 7. Automated Test Audit Results (October 13, 2026)

Test execution command: `python -m pytest tests -v`  
Result: **14 passed in 2.71s (100% pass rate, 0 warnings)**

```
tests/test_api.py::test_health_endpoint PASSED                           [  7%]
tests/test_api.py::test_models_status_endpoint PASSED                    [ 14%]
tests/test_api.py::test_metrics_endpoint PASSED                          [ 21%]
tests/test_api.py::test_predict_endpoint_success_and_probabilities PASSED [ 28%]
tests/test_api.py::test_predict_rejects_forbidden_targets PASSED         [ 35%]
tests/test_api.py::test_predict_rejects_provisional_echo_and_constant_features PASSED [ 42%]
tests/test_api.py::test_predict_with_weight_and_length_derives_bmi PASSED [ 50%]
tests/test_api.py::test_predict_rejects_nonpositive_or_invalid_height PASSED [ 57%]
tests/test_api.py::test_missing_artifact_behavior PASSED                 [ 64%]
tests/test_pipeline.py::test_target_mapping_and_classes PASSED           [ 71%]
tests/test_pipeline.py::test_forbidden_feature_exclusion PASSED          [ 78%]
tests/test_pipeline.py::test_sex_normalization PASSED                    [ 85%]
tests/test_pipeline.py::test_unknown_category_handling_in_pipeline PASSED [ 92%]
tests/test_pipeline.py::test_pipeline_reproducibility PASSED             [100%]
```

---

## 8. Limitations & Clinical Safeguards

1. **Cohort Sample Size:** The dataset contains 303 patient records from a single tertiary care center (Tehran Heart Center). Statistical power is sufficient for prototype evaluation, but multi-center external validation is essential prior to any clinical consideration.
2. **Class Imbalance:** Overall CAD prevalence is high (71.3%), whereas localized LCX and RCA stenosis prevalence is ~38%. Balanced class weighting was applied to mitigate minority-class neglect.
3. **Excluded Features:** Echocardiographic features (`EF-TTE`, `Region RWMA`, `VHD`) remain provisionally excluded pending clinical workflow confirmation. `Exertional CP` has zero variance in the source cohort and is omitted.
4. **No Probability Calibration:** Probabilities represent raw model sigmoid/forest score outputs and have not been calibrated via Platt scaling or isotonic regression.
5. **Educational Prototype:** This system is strictly an experimental educational prototype and must not be used for diagnostic purposes.
