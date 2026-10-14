# CardioSight — Clinical Dataset Schema & Verification Report

**Document Version:** 1.1.0 (Phase 1 Final Sign-Off)  
**Source Dataset File:** `extention of Z-Alizadeh sani dataset.csv`  
**File Location:** `c:\Users\sanja\project\CONTEST\DEVPOST\Cardiosight\extention of Z-Alizadeh sani dataset.csv`  
**Format:** CSV (UTF-8 with BOM, 56,694 bytes)  
**Cohort Size:** 303 patients, 59 columns  
**Data Integrity:** 0 missing cells (100% complete), 0 duplicate rows  

---

## 1. Executive Summary & Verification Findings

This document establishes the clinical data schema, target definitions, and input feature boundaries for the CardioSight cardiovascular risk prediction pipeline.

- **Total Rows:** 303 patient records.
- **Total Columns:** 59 columns.
- **Missing Value Count:** 0 total missing values across the entire dataset.
- **Duplicate Rows:** 0 duplicate rows.
- **Upstream Dataset Provenance:** Z-Alizadeh Sani clinical cohort for coronary artery disease (CAD) diagnosis via gold-standard catheterization/angiography.

---

## 2. Target Columns Verification & Mapping

The four logical clinical targets and their exact source columns in the dataset are:

| Logical Target | Source Column Name | Diagnostic Meaning | Class Breakdown | Observed Counts & Percentages | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Cath** | `Cath` | Overall Coronary Artery Disease (Gold-standard catheterization) | Binary: `CAD` vs `Normal` | **CAD:** 216 (71.29%)<br>**Normal:** 87 (28.71%) | **VERIFIED** |
| **LAD** | `LAD` | Left Anterior Descending Artery Stenosis (≥ 50% luminal narrowing) | Binary: `Stenotic` vs `Normal` | **Stenotic:** 177 (58.42%)<br>**Normal:** 126 (41.58%) | **VERIFIED** |
| **LCX** | `LCX` | Left Circumflex Artery Stenosis (≥ 50% luminal narrowing) | Binary: `Normal` vs `Stenotic` | **Normal:** 184 (60.73%)<br>**Stenotic:** 119 (39.27%) | **VERIFIED** |
| **RCA** | `RCA` | Right Coronary Artery Stenosis (≥ 50% luminal narrowing) | Binary: `Normal` vs `Stenotic` | **Normal:** 184 (62.38%)<br>**Stenotic:** 114 (37.62%) | **VERIFIED** |

---

## 3. Mandatory Input Exclusions & Data Leakage Prevention

### A. Primary Target Exclusions
The four target columns are ground-truth clinical diagnostic outcomes from cardiac catheterization and **must be strictly excluded** from any predictive feature matrix:
- `Cath` (Ground truth for overall CAD risk)
- `LAD` (Ground truth for LAD stenosis)
- `LCX` (Ground truth for LCX stenosis)
- `RCA` (Ground truth for RCA stenosis)

Predicting any target while including the other catheterization findings as inputs represents post-diagnostic leakage unless a multi-task learning architecture explicitly defines shared representations without cross-target conditioning.

---

## 4. Echocardiographic Feature Policy

The dataset contains three features derived from transthoracic echocardiography (TTE):
1. `EF-TTE` (Ejection Fraction from Transthoracic Echocardiogram, numeric integer 50–60%)
2. `Region RWMA` (Regional Wall Motion Abnormality, ordinal score 0–4)
3. `VHD` (Valvular Heart Disease, categorical: `N`, `mild`, `Moderate`, `Severe`)

### Policy Statement:
- **Provisional Exclusion:** `EF-TTE`, `Region RWMA`, and `VHD` are **excluded from the initial primary prediction model** until their availability and timing at the intended clinical prediction moment are definitively established.
- **Rationale:** In clinical triage, pre-test risk assessment often occurs prior to echocardiographic imaging. If a patient presents for initial CAD screening before echocardiography is conducted, conditioning on echo results would assume unavailable clinical information.
- **Non-Leakage Clause:** This exclusion policy **does not assert that these features are post-catheterization leakage**; rather, it is a conservative, disciplined design choice pending confirmation of clinical deployment timing.
- **Reconsideration Condition:** If downstream clinical requirements confirm that echocardiography is universally performed prior to CAD risk assessment, these features may be re-integrated into an advanced multimodal model tier.

---

## 5. Exertional CP Anomaly Verification

- **Feature:** `Exertional CP` (Exertional Chest Pain, column index 29).
- **Observed Distribution:** 303 / 303 rows contain `'N'` (100% constant; zero informational variance).
- **Raw File Audit:**
  - Raw byte and token analysis of `extention of Z-Alizadeh sani dataset.csv` verified that all 303 lines on disk literally contain the single-character ASCII string `'N'`.
  - The constant result was **not** introduced by parsing, whitespace stripping, casing transforms, or script normalization.
  - The original dataset remains completely unaltered.
- **Conclusion:** Documented as an **unresolved data-quality limitation of the source dataset**. This feature provides zero variance and zero mutual information, and is excluded from model feature sets.

---

## 6. Complete Proposed Input-Feature List (51 Features)

The dataset schema consists of 59 columns. By partitioning out the 4 targets (`Cath`, `LAD`, `LCX`, `RCA`), the 3 provisionally excluded echo features (`EF-TTE`, `Region RWMA`, `VHD`), and the 1 zero-variance column (`Exertional CP`), exactly **51 input features** remain:

$$59 \text{ total} - 4 \text{ targets} - 3 \text{ echo features} - 1 \text{ zero-variance feature} = 51 \text{ proposed input features}$$

### Demonstration of Exclusion:
- `Cath` $\in$ Proposed Inputs? **NO (Excluded)**
- `LAD` $\in$ Proposed Inputs? **NO (Excluded)**
- `LCX` $\in$ Proposed Inputs? **NO (Excluded)**
- `RCA` $\in$ Proposed Inputs? **NO (Excluded)**
- `EF-TTE` $\in$ Proposed Inputs? **NO (Excluded under echo policy)**
- `Region RWMA` $\in$ Proposed Inputs? **NO (Excluded under echo policy)**
- `VHD` $\in$ Proposed Inputs? **NO (Excluded under echo policy)**
- `Exertional CP` $\in$ Proposed Inputs? **NO (Excluded due to zero variance)**

### Proposed Primary Input Features (Alphabetical by Category):

#### Demographics & Anthropometrics (5 features)
1. `Age` (`int64`, 30–86 years)
2. `Length` (`int64`, 140–188 cm)
3. `Weight` (`int64`, 48–120 kg)
4. `Sex` (`object`, values: `'Male'`, `'Fmale'` — requires normalization to `'Female'`)
5. `BMI` (`float64`, collinear with Weight and Length; evaluate dropping or retaining during preprocessing)

#### Clinical History & Comorbidities (12 features)
6. `Airway disease` (`object`: `'N'`, `'Y'`)
7. `CHF` (Congestive Heart Failure, `object`: `'N'`, `'Y'`)
8. `CRF` (Chronic Renal Failure, `object`: `'N'`, `'Y'`)
9. `Current Smoker` (`int64`: `0`, `1`)
10. `CVA` (Cerebrovascular Accident, `object`: `'N'`, `'Y'`)
11. `DLP` (Dyslipidemia, `object`: `'N'`, `'Y'`)
12. `DM` (Diabetes Mellitus, `int64`: `0`, `1`)
13. `EX-Smoker` (`int64`: `0`, `1`)
14. `FH` (Family History, `int64`: `0`, `1`)
15. `HTN` (Hypertension, `int64`: `0`, `1`)
16. `Obesity` (`object`: `'N'`, `'Y'`)
17. `Thyroid Disease` (`object`: `'N'`, `'Y'`)

#### Symptoms & Physical Examination (13 features)
18. `Atypical` (`object`: `'N'`, `'Y'`)
19. `BP` (Blood Pressure, systolic, `int64`: 90–190 mmHg)
20. `Diastolic Murmur` (`object`: `'N'`, `'Y'`)
21. `Dyspnea` (`object`: `'N'`, `'Y'`)
22. `Edema` (`int64`: `0`, `1`)
23. `Function Class` (`int64`: NYHA class 0, 1, 2, 3)
24. `LowTH Ang` (Low Threshold Angina, `object`: `'N'`, `'Y'`)
25. `Lung rales` (`object`: `'N'`, `'Y'`)
26. `Nonanginal` (`object`: `'N'`, `'Y'`)
27. `PR` (Pulse Rate, `int64`: 50–110 bpm)
28. `Systolic Murmur` (`object`: `'N'`, `'Y'`)
29. `Typical Chest Pain` (`int64`: `0`, `1`)
30. `Weak Peripheral Pulse` (`object`: `'N'`, `'Y'`)

#### Electrocardiogram Findings (7 features)
31. `BBB` (Bundle Branch Block, `object`: `'N'`, `'LBBB'`, `'RBBB'`)
32. `LVH` (Left Ventricular Hypertrophy, `object`: `'N'`, `'Y'`)
33. `Poor R Progression` (`object`: `'N'`, `'Y'`)
34. `Q Wave` (`int64`: `0`, `1`)
35. `St Depression` (`int64`: `0`, `1`)
36. `St Elevation` (`int64`: `0`, `1`)
37. `Tinversion` (T-Wave Inversion, `int64`: `0`, `1`)

#### Laboratory Blood Tests (14 features)
38. `BUN` (Blood Urea Nitrogen, `int64`: 6–52 mg/dL)
39. `CR` (Creatinine, `float64`: 0.5–2.2 mg/dL)
40. `ESR` (Erythrocyte Sedimentation Rate, `int64`: 1–90 mm/hr)
41. `FBS` (Fasting Blood Sugar, `int64`: 62–400 mg/dL)
42. `HB` (Hemoglobin, `float64`: 8.9–17.6 g/dL)
43. `HDL` (High-Density Lipoprotein, `float64`: 19–111 mg/dL)
44. `K` (Potassium, `float64`: 3.0–6.6 mEq/L)
45. `LDL` (Low-Density Lipoprotein, `int64`: 26–232 mg/dL)
46. `Lymph` (Lymphocyte count percentage, `int64`: 7–60%)
47. `Na` (Sodium, `int64`: 128–156 mEq/L)
48. `Neut` (Neutrophil count percentage, `int64`: 32–89%)
49. `PLT` (Platelet count, `int64`: 25–742 x10^3/µL)
50. `TG` (Triglycerides, `int64`: 37–1050 mg/dL)
51. `WBC` (White Blood Cell count, `int64`: 3700–18000 /µL)

---

## 7. Additional Data Hygiene & Preprocessing Notes

1. **Typographical Normalization:** The `Sex` column contains `'Fmale'` (n=127) and `'Male'` (n=176). Standard string replacement to `'Female'` will be applied in the future Phase 2 pipeline.
2. **Collinearity Audit:** `BMI` is mathematically redundant with `Weight` and `Length`. In tree-based models (XGBoost/LightGBM), collinearity is non-catastrophic; for regularized linear baselines, dropping `BMI` or dropping `Length` and `Weight` will be evaluated.
3. **No Model Training:** Feature transformation, scaling, one-hot encoding, or fitting has strictly not occurred.
