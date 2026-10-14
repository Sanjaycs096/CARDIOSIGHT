# CardioSight — Phase 4 Production Readiness, Security & Final Validation Report

**Date of Audit:** October 14, 2026  
**Final Status:** **PASS**

---

## 1. Executive Summary

Phase 4 of CardioSight successfully concluded all production-readiness, security, reliability, performance benchmarking, regression-testing, and demonstration-readiness requirements. Building on the foundation of Phases 1, 2, 3A, 3B, and 3C, Phase 4 has hardened both the Next.js frontend and FastAPI backend against failure modes, non-finite numeric exploits, oversized payloads, and state desynchronization without altering any model weights or compromising clinical contracts.

Key achievements:
- **Zero Artifact Drift:** Baseline SHA-256 hashes of all eight model, schema, metadata, and SHAP artifacts (`cath_pipeline.joblib`, `lad_pipeline.joblib`, `lcx_pipeline.joblib`, `rca_pipeline.joblib`, `global_shap_importance.json`, `metrics.json`, `feature_schema.json`, `training_metadata.json`) were verified before and after implementation, confirming 100% byte-for-byte preservation.
- **Backend Hardening:** Added `allow_inf_nan=False` in Pydantic schemas, non-finite float validation, a 1MB payload size protection middleware, robust CORS configuration with environment-variable support, custom JSON error serializer for validation exceptions, and sanitized error messages to avoid internal filesystem or system trace leaks.
- **Frontend Hardening:** Added timeout guards (15s abort controller), response validation verifying finite probabilities across all 4 targets, automatic clearing of stale predictions upon inference failure or form reset, and inline NaN/type validation in clinical inputs.
- **Automated Testing:** 23 passing backend pytest tests (14 Phase 2 + 3 Phase 3C + 6 Phase 4 tests) and 15 passing frontend unit tests (7 Phase 3A + 5 Phase 3B + 3 Phase 4 tests).
- **Full E2E Browser Verification:** Automated walkthrough using browser subagent executed low-risk inference, pre-inference review modal, 3D anatomical twin risk coloring, input-modification stale warnings, clean form reset, elevated-risk inference, and SHAP explainability.

---

## 2. Verified Repository Baseline

Prior to implementing Phase 4 changes, baseline integrity was verified:
- **Backend baseline:** 17 tests passed in 9.84s (now expanded to 23 tests).
- **Frontend baseline:** 12 tests passed in 314ms (now expanded to 15 tests).
- **Production build baseline:** `next build` completed successfully.
- **Initial Model Artifact SHA-256 Hashes:**
  - `cath_pipeline.joblib`: `7b2054a3e8c2696990a64ffd9994f0d931829ab17dca200aa748a5e65d61d3c8` (12,471 bytes)
  - `lad_pipeline.joblib`: `10e4feba6f32d6c225513bfe296dac7d803cb8a60dd2bbc7d335db4a3c655acf` (351,944 bytes)
  - `lcx_pipeline.joblib`: `2708c395af9b402d0e7a6571d37a1186127d4fcc15d515556af08217cb595198` (348,744 bytes)
  - `rca_pipeline.joblib`: `a05270650eae0d4c9ad5c1db6504b0a4bfacce8e90562654080cee5b5a251d53` (12,471 bytes)
  - `global_shap_importance.json`: `79d643b9e651696341d9461e62946db679f9c5cdda9dfce16940fd72f52185c6` (32,334 bytes)
  - `metrics.json`: `effb7faa777d257a71e25c7b9e0831b5a9a0edb163c9de6f09b85a6048499682` (23,058 bytes)
  - `feature_schema.json`: `19034a1468a125424cb321026e7c6e937f022d39ae8557033ffc010724ee0ca6` (8,807 bytes)
  - `training_metadata.json`: `0c6a52413c147d43d0d9312c79e2257330174089025b686c3e35035cec47c9e2` (765 bytes)

---

## 3. Implemented Improvements & Fixes

### A. Backend Reliability & Security (`backend/main.py`, `backend/schemas.py`)
1. **Non-Finite Numeric Rejection:** Enforced `"allow_inf_nan": False` in Pydantic models. Added explicit checks rejecting `NaN`, `+Inf`, and `-Inf` in `PatientInput` and anthropometric derivation fields, returning HTTP 422.
2. **Safe Request Validation Error Handler:** Implemented custom `RequestValidationError` handler utilizing `jsonable_encoder` to prevent Starlette JSON serialization crashes when echoing error details.
3. **Payload Limit Middleware:** Added `PayloadLimitMiddleware` enforcing a 1MB limit (`1,048,576` bytes), rejecting oversized payloads with HTTP 413.
4. **CORS Hardening:** Configured CORS with explicit origins (`ALLOWED_ORIGINS` environment variable, defaulting to local frontend URLs `http://localhost:3000,http://127.0.0.1:3000`) instead of wildcard `*` with credentials.
5. **Exception Sanitization:** Sanitized 500 error messages in `/api/predict` and `/api/explain` to prevent leaking filesystem paths, environment variables, or Python stack traces to clients while logging full traces to server `sys.stderr`.
6. **Health Endpoint Distinction:** Enhanced `GET /api/health` to report both API process uptime (`api_online: True`) and model artifact readiness (`models_ready: True`, `models_loaded_count: 4`, `total_models_expected: 4`).
7. **Regression Coverage:** Added focused tests for invalid categorical values (`Sex: "Unknown"`, `Obesity: "Maybe"`, `BBB: "InvalidBlock"`), out-of-range boundaries (`Age < 18`, `Age > 120`, `BP > 260`), and corrupt pipeline error recovery.

### B. Frontend Reliability & State Synchronization
1. **Fetch Timeout Protection (`apiClient.ts`):** Wrapped all network calls with an `AbortController` timeout (8s for health/models, 10s for metrics, 15s for predict, 20s for explain), converting aborts into clean `ApiError(..., 408)`.
2. **Response Integrity Validation (`apiClient.ts`):** Validates that responses contain all expected targets (`Cath`, `LAD`, `LCX`, `RCA`) and that all probabilities are finite numbers in `[0.0, 1.0]`, throwing HTTP 502 `ApiError` if malformed.
3. **Stale Prediction Clean-Up (`page.tsx`):** If an inference request fails, `predictionData` and `explanationData` are cleared immediately, reverting the 3D coronary viewer to neutral preview mode.
4. **Form Reset State Synchronization (`ClinicalInputForm.tsx`, `page.tsx`):** Added `onReset` callback that clears previous predictions, explanation data, and error alerts when the user clicks `Reset to Blank`.
5. **Robust Numeric Form Validation (`clinicalFormDefaults.ts`):** Updated `validateClinicalForm` to check `typeof val !== 'number' || isNaN(val)` across all numeric fields.

### C. Repository & Environment Hygiene
1. **Git Exclusions (`.gitignore`):** Added `.pytest_cache/`, `*.log`, `.coverage`, and `htmlcov/` to `.gitignore`.

---

## 4. Test Verification Evidence

### A. Backend Automated Tests (`pytest tests -v`)
```
============================= test session starts =============================
platform win32 -- Python 3.10.0, pytest-9.1.1, pluggy-1.6.0
collected 23 items

tests/test_api.py::test_health_endpoint PASSED                           [  4%]
tests/test_api.py::test_models_status_endpoint PASSED                    [  8%]
tests/test_api.py::test_metrics_endpoint PASSED                          [ 13%]
tests/test_api.py::test_predict_endpoint_success_and_probabilities PASSED [ 17%]
tests/test_api.py::test_predict_rejects_forbidden_targets PASSED         [ 21%]
tests/test_api.py::test_predict_rejects_provisional_echo_and_constant_features PASSED [ 26%]
tests/test_api.py::test_predict_with_weight_and_length_derives_bmi PASSED [ 30%]
tests/test_api.py::test_predict_rejects_nonpositive_or_invalid_height PASSED [ 34%]
tests/test_api.py::test_missing_artifact_behavior PASSED                 [ 39%]
tests/test_api.py::test_explain_endpoint_success PASSED                  [ 43%]
tests/test_api.py::test_explain_single_target_and_invalid_target PASSED  [ 47%]
tests/test_api.py::test_explain_rejects_forbidden_features PASSED        [ 52%]
tests/test_api.py::test_predict_rejects_non_finite_numeric_values PASSED [ 56%]
tests/test_api.py::test_payload_limit_middleware_rejects_oversized_payload PASSED [ 60%]
tests/test_api.py::test_health_endpoint_distinguishes_api_and_models PASSED [ 65%]
tests/test_api.py::test_sanitized_internal_error_handling PASSED         [ 69%]
tests/test_api.py::test_predict_rejects_invalid_categories_and_out_of_range_features PASSED [ 73%]
tests/test_api.py::test_explain_handles_corrupt_pipeline PASSED          [ 78%]
tests/test_pipeline.py::test_target_mapping_and_classes PASSED           [ 82%]
tests/test_pipeline.py::test_forbidden_feature_exclusion PASSED          [ 86%]
tests/test_pipeline.py::test_sex_normalization PASSED                    [ 91%]
tests/test_pipeline.py::test_unknown_category_handling_in_pipeline PASSED [ 95%]
tests/test_pipeline.py::test_pipeline_reproducibility PASSED             [100%]

======================= 23 passed, 14 warnings in 4.61s =======================
```

### B. Frontend Unit Tests (`npm test`)
```
> frontend@0.1.0 test
> tsx --test tests/vesselMapping.test.mjs tests/clinicalWorkflow.test.mjs

✔ 1. DEMO_PROFILE_ELEVATED and DEMO_PROFILE_LOW_RISK pass clinical validation with zero errors (2.66ms)
✔ 2. validateClinicalForm catches out-of-bounds fields correctly (1.27ms)
✔ 3. formatPatientPayload excludes Weight and Length when BMI is present (0.28ms)
✔ 4. formatPatientPayload normalizes underscored aliases to schema column names (0.13ms)
✔ 5. Leakage Prevention: Form schemas and payloads strictly exclude forbidden columns (0.21ms)
✔ 6. ApiError correctly represents error status and detail context (2.37ms)
✔ 7. INITIAL_BLANK_FORM ensures clean reset with zero leaked attributes (0.37ms)
✔ 8. validateClinicalForm catches NaN, undefined, or missing required fields (0.33ms)
✔ 1. isValidProbability accepts valid finite numbers in [0.0, 1.0] (0.70ms)
✔ 2. getProbabilityColor maps probabilities to correct color bands (0.50ms)
✔ 3. mapPredictionToVessels returns neutral preview when response is null (2.29ms)
✔ 4. mapPredictionToVessels maps targets correctly when valid PredictionResponse is supplied (0.68ms)
✔ 5. mapPredictionToVessels handles incomplete predictions gracefully (0.87ms)
✔ 6. mapPredictionToVessels handles invalid/out-of-range probabilities gracefully (0.35ms)
✔ 7. Canonical OBJ file paths and metadata are valid (0.20ms)
ℹ tests 15 | pass 15 | fail 0 | duration_ms 284.30
```

### C. TypeScript Type Check (`npx tsc --noEmit`)
- Command: `npx tsc --noEmit`
- Result: **0 errors** (exited code 0).

### D. Frontend Production Build (`npm run build`)
```
▲ Next.js 16.4.0 (Turbopack)
✓ Running next.config.ts took 209ms
- Cache Components enabled
- Partial Prefetching enabled
✓ Compiled successfully in 975ms
  Running TypeScript ...
  Finished TypeScript in 5.8s ...
✓ Generating static pages using 5 workers (4/4) in 4.7s
Route (app)
┌ ○ /
└ ○ /_not-found
○ (Static) prerendered as static content
```

---

## 5. Performance, Latency & Reproducibility Benchmark

Executed via `scripts/benchmark_performance.py`:

| Benchmark Metric | Measurement | Criteria | Result |
| :--- | :--- | :--- | :--- |
| **Model Cold-Start Load** | 1,792.58 ms | 4 scikit-learn pipelines from disk | PASS |
| **Prediction Latency (Cold Start)** | 68.87 ms | First request after startup | PASS |
| **Prediction Latency (Steady State Min)** | 26.42 ms | Over 50 repeated requests | PASS |
| **Prediction Latency (Steady State Median)** | 28.59 ms | Over 50 repeated requests | PASS |
| **Prediction Latency (Steady State Mean)** | 28.76 ms | Over 50 repeated requests | PASS |
| **Prediction Latency (Steady State p95)** | 30.79 ms | Over 50 repeated requests | PASS |
| **Prediction Latency (Steady State Max)** | 30.93 ms | Over 50 repeated requests | PASS |
| **Prediction Determinism** | 100% Identical | Probabilities match across 50 runs | **PASS** |
| **SHAP Latency (Cold Start, all 4 targets)** | 4,560.13 ms | Initial TreeExplainer tree parsing | PASS |
| **SHAP Latency (Steady State Median)** | 40.81 ms | Over 20 repeated warm runs | PASS |
| **SHAP Latency (Steady State p95)** | 45.64 ms | Over 20 repeated warm runs | PASS |
| **SHAP Latency (Cath - LinearExplainer)** | 14.02 ms | Individual target median | PASS |
| **SHAP Latency (LAD - TreeExplainer)** | 17.99 ms | Individual target median | PASS |
| **SHAP Latency (LCX - TreeExplainer)** | 15.74 ms | Individual target median | PASS |
| **SHAP Latency (RCA - LinearExplainer)** | 13.64 ms | Individual target median | PASS |
| **SHAP Determinism** | 100% Identical | Feature attributions match across 20 runs | **PASS** |

---

## 6. Model Artifact Integrity Verification (Before vs After)

| Artifact File | Size (Bytes) | Baseline SHA-256 | Post-Benchmark SHA-256 | Status |
| :--- | :---: | :---: | :---: | :---: |
| `cath_pipeline.joblib` | 12,471 | `7b2054a3e8c2696990a64ffd9994f0d931829ab17dca200aa748a5e65d61d3c8` | `7b2054a3e8c2696990a64ffd9994f0d931829ab17dca200aa748a5e65d61d3c8` | **MATCH (Unchanged)** |
| `lad_pipeline.joblib` | 351,944 | `10e4feba6f32d6c225513bfe296dac7d803cb8a60dd2bbc7d335db4a3c655acf` | `10e4feba6f32d6c225513bfe296dac7d803cb8a60dd2bbc7d335db4a3c655acf` | **MATCH (Unchanged)** |
| `lcx_pipeline.joblib` | 348,744 | `2708c395af9b402d0e7a6571d37a1186127d4fcc15d515556af08217cb595198` | `2708c395af9b402d0e7a6571d37a1186127d4fcc15d515556af08217cb595198` | **MATCH (Unchanged)** |
| `rca_pipeline.joblib` | 12,471 | `a05270650eae0d4c9ad5c1db6504b0a4bfacce8e90562654080cee5b5a251d53` | `a05270650eae0d4c9ad5c1db6504b0a4bfacce8e90562654080cee5b5a251d53` | **MATCH (Unchanged)** |
| `global_shap_importance.json` | 32,334 | `79d643b9e651696341d9461e62946db679f9c5cdda9dfce16940fd72f52185c6` | `79d643b9e651696341d9461e62946db679f9c5cdda9dfce16940fd72f52185c6` | **MATCH (Unchanged)** |
| `metrics.json` | 23,058 | `effb7faa777d257a71e25c7b9e0831b5a9a0edb163c9de6f09b85a6048499682` | `effb7faa777d257a71e25c7b9e0831b5a9a0edb163c9de6f09b85a6048499682` | **MATCH (Unchanged)** |
| `feature_schema.json` | 8,807 | `19034a1468a125424cb321026e7c6e937f022d39ae8557033ffc010724ee0ca6` | `19034a1468a125424cb321026e7c6e937f022d39ae8557033ffc010724ee0ca6` | **MATCH (Unchanged)** |
| `training_metadata.json` | 765 | `0c6a52413c147d43d0d9312c79e2257330174089025b686c3e35035cec47c9e2` | `0c6a52413c147d43d0d9312c79e2257330174089025b686c3e35035cec47c9e2` | **MATCH (Unchanged)** |

---

## 7. Security and Dependency Audit Findings

1. **`npm audit` Dependency Audit (`braces` Deep Dive)**:
   - **Advisory**: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) — *braces vulnerable to stack-exhaustion denial of service through deeply nested patterns*.
   - **Vulnerability Classification**: CWE-674 (Uncontrolled Recursion), CVSS v3.1 Score: 7.5 (High, `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H`).
   - **Dependency Chain**:
     ```
     frontend@0.1.0
     └─┬ eslint-config-next@16.4.0
       └─┬ @next/eslint-plugin-next@16.4.0
         └─┬ fast-glob@3.3.1
           └─┬ micromatch@4.0.8
             └── braces@3.0.3 (installed & resolved: 3.0.3)
     ```
   - **Affected Version Range**: `<=3.0.3` (all published releases of `braces` up to 3.0.3).
   - **Remediation Analysis**:
     - `npm view braces version` reports that `3.0.3` is the latest published version across the npm registry; no upstream patched release (e.g. 3.0.4) exists.
     - Running `npm audit fix --force` attempts to downgrade `eslint-config-next` to `14.2.35`, which creates a fatal breaking mismatch with Next.js 16.4.0 (Turbopack).
   - **Residual Risk Assessment**:
     - `braces` is strictly an internal build-time development dependency used solely by ESLint during file globbing.
     - It is **never bundled into the client runtime JavaScript bundle** and is never exposed across network endpoints or user-input surfaces.
     - The application has zero network-facing risk from this finding. Follow-up action: update `eslint-config-next` once upstream Next.js updates its globbing dependencies.
2. **Medical-Safety Wording & Labeling Audit**:
   - **Cath Separation**: Explicitly identified as a global patient-level catheterization target, physically segregated from the 3D artery mesh renderer.
   - **Uncalibrated Model Output**: Replaced misleading terms (e.g., "Diagnostic Outcome", "Estimated Risk") with qualified terms ("Patient-Level Model Target", "Model-Estimated Probability", "Model Output").
   - **Synthetic Non-Patient Examples**: Explicitly updated preset buttons and review dialogs to label Profile Alpha and Beta as "Synthetic Presets (Non-Patient Examples)".
   - **Explainability vs. Causality**: Maintained prominent notices distinguishing mathematical SHAP feature attributions from biological etiology or clinical advice.
   - **Persistent Safety Disclaimers**: Added educational disclaimers across headers, prediction results, 3D legends, review modals, and footers.
3. **Secrets & Privacy**:
   - Zero credentials, secrets, or patient records are committed.
   - No sensitive patient inputs or system paths are emitted in production server logs or client errors.

---

## 8. Complete Changed-Files List

### Created Files
- [`scripts/benchmark_performance.py`](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/scripts/benchmark_performance.py): Automated benchmark testing cold-start vs steady-state latency, determinism, and SHA-256 hash preservation.
- [`docs/phase4_performance_report.md`](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/docs/phase4_performance_report.md): Dedicated latency distributions and artifact integrity report.
- [`docs/phase4_demo_guide.md`](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/docs/phase4_demo_guide.md): Complete demonstration, script narrative, and failure-handling walkthrough guide.
- [`docs/phase4_readiness_report.md`](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/docs/phase4_readiness_report.md): Master technical audit and sign-off report.

### Modified Files
- [`backend/schemas.py`](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/backend/schemas.py): Added `allow_inf_nan=False`, non-finite float validation, and bounds checking.
- [`backend/main.py`](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/backend/main.py): Added 1MB payload limit middleware, configurable CORS, RequestValidationError JSON serializer, health distinction, and exception sanitization.
- [`tests/test_api.py`](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/tests/test_api.py): Added 6 automated tests verifying NaN rejection, payload limit, health distinction, error sanitization, invalid categories, out of range values, and corrupt pipeline recovery.
- [`frontend/src/utils/apiClient.ts`](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/frontend/src/utils/apiClient.ts): Added `fetchWithTimeout` abort controller, prediction response schema validation, and health/models typing.
- [`frontend/src/utils/clinicalFormDefaults.ts`](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/frontend/src/utils/clinicalFormDefaults.ts): Added `isNaN` and type checks to `validateClinicalForm`.
- [`frontend/src/components/clinical/ClinicalInputForm.tsx`](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/frontend/src/components/clinical/ClinicalInputForm.tsx): Added `onReset` callback prop, wired form clean-up, and updated preset labels to non-patient synthetic fixtures.
- [`frontend/src/components/clinical/ReviewModal.tsx`](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/frontend/src/components/clinical/ReviewModal.tsx): Updated review modal title and educational disclaimers.
- [`frontend/src/components/dashboard/PredictionResults.tsx`](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/frontend/src/components/dashboard/PredictionResults.tsx): Clarified medical-safety wording, replaced diagnostic phrasing with model-estimated probabilities, and added safety banner.
- [`frontend/src/app/page.tsx`](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/frontend/src/app/page.tsx): Cleared predictions on inference failure, wired `handleFormReset`, and updated header and ground-truth descriptions.
- [`frontend/tests/clinicalWorkflow.test.mjs`](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/frontend/tests/clinicalWorkflow.test.mjs): Added 3 unit tests for `ApiError`, `INITIAL_BLANK_FORM`, and NaN validation.
- [`.gitignore`](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/.gitignore): Added `.pytest_cache/`, `*.log`, and coverage files.
- [`README.md`](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/README.md): Updated project status to PASS for Phase 4.

---

## 9. Final Readiness Decision

**FINAL STATUS: PASS**

The CardioSight application has achieved full cross-phase verification and demonstration readiness:
1. **Models & Artifacts:** Preserved 100% byte-for-byte with zero parameter drift across all 8 artifacts.
2. **Inference Pipeline:** Robust against malformed JSON, out-of-bounds features, and non-finite numbers.
3. **Frontend Experience:** Fully synchronized, responsive, accessible, and equipped with stale-state detection and clean reset workflows.
4. **Automated Verification:** 38 automated regression tests (23 backend + 15 frontend) passing without errors.
5. **Medical Positioning:** Unambiguously labeled as an experimental educational research prototype with clear disclaimers separating predictive correlation from biological causality and uncalibrated probabilities from validated clinical diagnoses.
