# CardioSight — Phase 1 Verification & Final Sign-Off Report

**Date of Sign-Off:** October 13, 2026  
**Environment:** Windows 10/11 x64 | Python 3.10.0 | Node.js v24.12.0 | npm 11.6.2  
**Final Status:** **PASS WITH DOCUMENTED LIMITATIONS**  

---

## 1. Executive Summary & Sign-Off Result

Phase 1 foundation tasks have reached final completion. All essential dataset schemas, target mappings, data hygiene checks, anatomical asset discoveries, and local service validations have been verified with empirical evidence.

- **Phase 1 Decision:** **PASS WITH DOCUMENTED LIMITATIONS**
- **Core Verification Summary:**
  1. **Dataset Integrity:** Verified against `extention of Z-Alizadeh sani dataset.csv` (303 patient records, 59 columns, 0 missing cells, 0 duplicate rows).
  2. **Four Prediction Targets Verified:** Exact mapping and class distributions confirmed for `Cath` (Overall CAD), `LAD`, `LCX`, and `RCA`.
  3. **Input/Target Separation:** Exactly 51 proposed input features identified; all 4 targets, 3 provisional echocardiographic features, and 1 zero-variance feature are proven absent from the input set.
  4. **Exertional CP Anomaly:** Verified at raw byte level that all 303 data lines in the raw file literally contain `'N'`. Confirmed as an intrinsic upstream dataset property, not a parsing artifact.
  5. **Anatomical Asset Pipeline:** 188 BodyParts3D OBJ files cataloged. Primary coronary meshes (`lad.obj`, `lcx.obj`, `rca.obj`) staged; 16 alternatives preserved in `candidates/`; whole-heart base model documented as missing without fabricating geometry; 0 companion files verified.
  6. **Local Runtime Verification:** FastAPI backend (`/api/health`) and Next.js frontend (`http://localhost:3000`) both tested and operational (HTTP 200).
  7. **Phase Boundary:** Strict boundary maintained. Zero model training, feature fitting, or 3D rendering implemented.

---

## 2. Detailed Verification of Outstanding Phase 1 Tasks

### 2.1 Echocardiographic Feature Policy
The dataset contains three echocardiography-derived variables:
- `EF-TTE` (Ejection Fraction - Transthoracic Echocardiogram)
- `Region RWMA` (Regional Wall Motion Abnormality)
- `VHD` (Valvular Heart Disease)

**Policy Decision:**
- `EF-TTE`, `Region RWMA`, and `VHD` are **excluded from the initial primary model**.
- **Clinical Rationale:** In typical clinical workflows, pre-test CAD screening often occurs before transthoracic echocardiography is ordered or interpreted. Conditioning the baseline prediction model on echo features would assume clinical information that may not yet be available at the intended decision point.
- **Evidentiary Boundary:** This decision **does not claim or prove that these features constitute post-catheterization data leakage**. It is a conservative, disciplined risk-mitigation measure pending confirmation of clinical deployment timing.
- **Reconsideration Policy:** If downstream requirements establish that echocardiographic data is routinely and universally available prior to catheterization referral, these features may be re-evaluated for an advanced multimodal risk tier.

---

### 2.2 Explicit Target / Input Separation

#### A. Target-to-Source-Column Mapping
| Logical Prediction Target | Source Column in Dataset | Clinical Meaning | Observed Class Counts & Percentages | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Cath** | `Cath` | Overall Coronary Artery Disease | **CAD:** 216 (71.29%)<br>**Normal:** 87 (28.71%) | **VERIFIED** |
| **LAD** | `LAD` | Left Anterior Descending Stenosis (≥50%) | **Stenotic:** 177 (58.42%)<br>**Normal:** 126 (41.58%) | **VERIFIED** |
| **LCX** | `LCX` | Left Circumflex Artery Stenosis (≥50%) | **Normal:** 184 (60.73%)<br>**Stenotic:** 119 (39.27%) | **VERIFIED** |
| **RCA** | `RCA` | Right Coronary Artery Stenosis (≥50%) | **Normal:** 189 (62.38%)<br>**Stenotic:** 114 (37.62%) | **VERIFIED** |

#### B. Dataset Schema Partition Formula
$$\text{Total Columns (59)} = \text{Targets (4)} + \text{Provisional Echo Exclusions (3)} + \text{Zero-Variance Exclusion (1)} + \text{Proposed Inputs (51)}$$

#### C. Proof of Absence from Input Feature Set
| Column Name | Category | Included in Proposed Inputs? | Reason for Absence |
| :--- | :--- | :---: | :--- |
| `Cath` | Target | **NO** | Primary ground-truth outcome |
| `LAD` | Target | **NO** | Primary ground-truth outcome |
| `LCX` | Target | **NO** | Primary ground-truth outcome |
| `RCA` | Target | **NO** | Primary ground-truth outcome |
| `EF-TTE` | Clinical Variable | **NO** | Provisional echo exclusion policy |
| `Region RWMA` | Clinical Variable | **NO** | Provisional echo exclusion policy |
| `VHD` | Clinical Variable | **NO** | Provisional echo exclusion policy |
| `Exertional CP` | Clinical Variable | **NO** | Zero variance (100% constant 'N') |

#### D. Complete Proposed Input-Feature List (51 Features)
1. `Age` (Numeric)
2. `Length` (Numeric)
3. `Weight` (Numeric)
4. `Sex` (Categorical: `'Male'`, `'Fmale'` — requires normalization to `'Female'`)
5. `BMI` (Numeric, derived collinear feature)
6. `DM` (Binary: Diabetes Mellitus)
7. `HTN` (Binary: Hypertension)
8. `Current Smoker` (Binary)
9. `EX-Smoker` (Binary)
10. `FH` (Binary: Family History)
11. `Obesity` (Binary)
12. `CRF` (Binary: Chronic Renal Failure)
13. `CVA` (Binary: Cerebrovascular Accident)
14. `Airway disease` (Binary)
15. `Thyroid Disease` (Binary)
16. `CHF` (Binary: Congestive Heart Failure)
17. `DLP` (Binary: Dyslipidemia)
18. `BP` (Numeric: Blood Pressure)
19. `PR` (Numeric: Pulse Rate)
20. `Edema` (Binary)
21. `Weak Peripheral Pulse` (Binary)
22. `Lung rales` (Binary)
23. `Systolic Murmur` (Binary)
24. `Diastolic Murmur` (Binary)
25. `Typical Chest Pain` (Binary)
26. `Dyspnea` (Binary)
27. `Function Class` (Ordinal: NYHA classes 0, 1, 2, 3)
28. `Atypical` (Binary)
29. `Nonanginal` (Binary)
30. `LowTH Ang` (Binary: Low Threshold Angina)
31. `Q Wave` (Binary ECG)
32. `St Elevation` (Binary ECG)
33. `St Depression` (Binary ECG)
34. `Tinversion` (Binary ECG)
35. `LVH` (Binary ECG: Left Ventricular Hypertrophy)
36. `Poor R Progression` (Binary ECG)
37. `BBB` (Categorical ECG: `'N'`, `'LBBB'`, `'RBBB'`)
38. `FBS` (Numeric: Fasting Blood Sugar)
39. `CR` (Numeric: Creatinine)
40. `TG` (Numeric: Triglycerides)
41. `LDL` (Numeric)
42. `HDL` (Numeric)
43. `BUN` (Numeric: Blood Urea Nitrogen)
44. `ESR` (Numeric: Erythrocyte Sedimentation Rate)
45. `HB` (Numeric: Hemoglobin)
46. `K` (Numeric: Potassium)
47. `Na` (Numeric: Sodium)
48. `WBC` (Numeric: White Blood Cells)
49. `Lymph` (Numeric: Lymphocyte %)
50. `Neut` (Numeric: Neutrophil %)
51. `PLT` (Numeric: Platelet Count)

---

### 2.3 Exertional CP Anomaly Verification
- **Investigation:** Direct inspection of raw bytes and tokens of `extention of Z-Alizadeh sani dataset.csv` across all 303 data lines.
- **Evidence:**
  - File encoding: UTF-8 with BOM (`\xef\xbb\xbf`).
  - Column index: 29 (0-indexed).
  - Value counts: Exactly **303 occurrences of literal `'N'`**; 0 non-`'N'` values; 0 whitespace tokens; 0 null tokens.
  - Neighboring columns (`Nonanginal`, `LowTH Ang`) display normal categorical variation (`'Y'` and `'N'`).
- **Conclusion:** The all-`'N'` distribution is **an authentic characteristic of the source dataset**, not an artifact of script ingestion, whitespace stripping, or normalization.
- **Dataset Preservation:** The source dataset on disk remains completely unaltered.
- **Status:** Documented as an **unresolved data-quality limitation of the source dataset**. It will be dropped from modeling due to zero variance.

---

### 2.4 Dataset and Script Consistency

- **Dataset Inspection Consistency:** Verified that `docs/dataset_schema_report.md` matches `extention of Z-Alizadeh sani dataset.csv` in dimensions (303 x 59), data types, and target distributions.
- **Asset Manifest Consistency:** Verified that `selected_models/manifest.json` exactly matches the physical filesystem:
  - `selected_models/lad.obj`: Present (67,711 bytes, 610 vertices, 1,104 faces) $\rightarrow$ Matches manifest.
  - `selected_models/lcx.obj`: Present (787,422 bytes, 6,180 vertices, 12,248 faces) $\rightarrow$ Matches manifest.
  - `selected_models/rca.obj`: Present (88,232 bytes, 795 vertices, 1,402 faces) $\rightarrow$ Matches manifest.
  - `selected_models/heart.obj`: **Absent** on filesystem $\rightarrow$ Matches manifest (`MISSING_WHOLE_ORGAN`; no synthetic placeholder created).
  - `selected_models/candidates/`: **16** candidate OBJ files present on filesystem $\rightarrow$ Matches all 16 alternative entries in manifest.
- **Companion File Consistency:** 0 MTL files and 0 textures present or referenced in either files or manifest.

---

## 3. Acceptance Criteria Audit

| # | Acceptance Criterion | Evaluation | Evidence & Technical Notes |
| :---: | :--- | :---: | :--- |
| 1 | Existing starter scaffold inspected and preserved | **PASS** | Original `models/` directory and root dataset preserved untouched. |
| 2 | Actual Excel / CSV workbook located and readable | **PASS** | `extention of Z-Alizadeh sani dataset.csv` located, parsed, and verified. |
| 3 | Worksheet and schema verified from real workbook | **PASS** | 303 rows x 59 columns verified; complete column dictionary generated. |
| 4 | Dataset quality statistics recorded | **PASS** | 0 missing cells, 0 duplicate rows, zero-variance column documented. |
| 5 | Four target definitions verified | **PASS** | `Cath`, `LAD`, `LCX`, `RCA` mapped with verified class counts. |
| 6 | LAD, LCX, RCA, and Cath input exclusions documented | **PASS** | Formally excluded from input feature lists. |
| 7 | Potential additional leakage risks recorded | **PASS** | Provisional echo exclusion policy documented for `EF-TTE`, `Region RWMA`, `VHD`. |
| 8 | `scripts/process_models.py` implemented | **PASS** | Implemented with Windows long-path prefixing (`\\?\`) and ranking logic. |
| 9 | Recursive OBJ discovery tested against source folders | **PASS** | 188 OBJ files discovered across all 4 nested FMA directories. |
| 10 | Candidate matches and ambiguity handling verified | **PASS** | 40 candidates categorized; primary selections made by explicit rules. |
| 11 | Selected files copied without modifying source files | **PASS** | 3 primary vessels copied to `selected_models/`; 16 alternatives to `candidates/`. |
| 12 | Manifest and readable asset summary generated | **PASS** | `selected_models/manifest.json` and `selected_models/README.md` verified. |
| 13 | Missing anatomical candidates & companion problems reported | **PASS** | Whole-heart base mesh reported missing; 0 companion files verified. |
| 14 | Backend health check tested | **PASS** | `http://127.0.0.1:8000/api/health` returned HTTP 200 OK (`{"status":"healthy"}`). |
| 15 | Frontend starter page tested | **PASS** | `http://localhost:3000` returned HTTP 200 OK (Next.js 16 App Router). |
| 16 | README and Phase 1 verification report updated | **PASS** | Master `README.md`, schema report, and verification report finalized. |
| 17 | No model training or Phase 2 implementation started | **PASS** | Strict Phase 1 boundary maintained. Zero ML fitting or 3D canvas work. |

---

## 4. Distinction Between Verified Facts, Assumptions, and Unresolved Issues

### Verified Facts
1. The dataset on disk is `extention of Z-Alizadeh sani dataset.csv` containing exactly 303 rows and 59 columns.
2. There are 0 missing cells and 0 duplicate records in the clinical dataset.
3. `Cath`, `LAD`, `LCX`, and `RCA` are the ground-truth targets derived from cardiac catheterization.
4. `Exertional CP` contains 100% `'N'` values in the raw dataset file.
5. All 188 OBJ files in `models/` are geometry-only meshes without MTL material or texture dependencies.
6. The BodyParts3D source folders contain individual anatomical components (trigones, valves, muscle layers, walls), but lack a single unified whole-heart base model.
7. Both backend and frontend run locally on Windows and return HTTP 200.

### Assumptions Documented for Downstream Phases
1. It is assumed that the clinical triage point occurs prior to echocardiography, which motivates the provisional exclusion of `EF-TTE`, `Region RWMA`, and `VHD`.
2. It is assumed that `'Fmale'` in `Sex` represents a clerical typo for `'Female'`.
3. It is assumed that a whole-heart base mesh will either be imported externally or composited from component wall meshes in Phase 2.

### Unresolved Limitations
1. **Upstream Data Anomaly (`Exertional CP`):** Zero variance across all 303 patients; feature is non-informative and dropped.
2. **Whole-Heart Base Mesh:** Missing from BodyParts3D source files; awaiting user direction on compound mesh assembly vs. external base model.

---

## 5. Phase 1 Sign-Off Conclusion

**Phase 1 Final Assessment:** **PASS WITH DOCUMENTED LIMITATIONS**

All necessary foundation checks, dataset verifications, asset processing pipelines, and application tests have succeeded. Model training, pipeline fitting, and 3D rendering remain strictly unexecuted. CardioSight is fully prepared for Phase 2 upon user approval.
