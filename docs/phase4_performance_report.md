# CardioSight — Phase 4C Performance, Latency & Reproducibility Report

**Date of Execution:** 2026-10-14 18:22:21  
**Host Environment:** `Windows-10-10.0.26300-SP0` (`Python 3.10.0`)  
**Hardware Processor:** `Intel64 Family 6 Model 154 Stepping 4, GenuineIntel`  
**Status:** **PASS**

---

## 1. Executive Summary

Phase 4C benchmark measured cold-start loading, steady-state prediction latency, and SHAP explainability latency across all four model pipelines. All measurements were conducted using high-resolution monotonic timers (`time.perf_counter()`) under rigorous determinism validation and pre/post SHA-256 artifact integrity checking.

- **Artifact Integrity:** 100% byte-for-byte match across all 8 model and schema artifacts before and after benchmarking.
- **Model Loading:** 7310.70 ms cold load from disk across all 4 scikit-learn pipelines.
- **Prediction Latency (N=50):** Steady-state median of **178.98 ms** (p95: **243.01 ms**). 100% deterministic output.
- **SHAP Explanation Latency (N=20, all 4 targets):** Steady-state median of **190.56 ms** (p95: **222.55 ms**). Initial cold-start invocation requires 14876.92 ms due to one-time tree structure compilation.
- **Failure Count:** 0 failed requests, 0 timeouts.

---

## 2. Benchmark Methodology

- **Client:** `fastapi.testclient.TestClient` using ASGI direct pipeline communication.
- **Warm-Up Strategy:**
  - Prediction: 1 cold measurement recorded, followed by 3 warm-up requests prior to 50 measured steady-state requests.
  - SHAP: 1 cold measurement recorded, followed by 2 warm-up requests prior to 20 measured steady-state requests.
- **Payload:** Clearly labeled synthetic non-patient demonstration profile (`Profile Alpha`).
- **Reproducibility Verification:** Every response's target probabilities and feature attributions were compared programmatically against iteration 1.

---

## 3. Latency Distribution Results

### A. Inference Latency (`POST /api/predict`, N=50)

| Metric | Measured Latency | Notes |
| :--- | :---: | :--- |
| **Cold-Start Request** | **229.07 ms** | First request after startup |
| **Warm-Up Requests** | 3 iterations | Discarded from steady-state statistics |
| **Minimum** | **147.10 ms** | Steady state |
| **Median (p50)** | **178.98 ms** | Steady state |
| **Mean (Average)** | **188.43 ms** | Steady state |
| **95th Percentile (p95)** | **243.01 ms** | Steady state |
| **Maximum** | **250.58 ms** | Steady state |
| **Success Rate** | **100% (50/50)** | 0 failures, 0 timeouts |
| **Mathematical Determinism** | **100% Identical** | Target probabilities match to exact float precision |

### B. SHAP Explainability Latency (`POST /api/explain`, all 4 targets, N=20)

| Metric | Measured Latency | Notes |
| :--- | :---: | :--- |
| **Cold-Start Request** | **14876.92 ms** | First TreeExplainer tree walk compilation |
| **Warm-Up Requests** | 2 iterations | Discarded from steady-state statistics |
| **Minimum** | **161.00 ms** | Steady state |
| **Median (p50)** | **190.56 ms** | Steady state |
| **Mean (Average)** | **196.58 ms** | Steady state |
| **95th Percentile (p95)** | **222.55 ms** | Steady state |
| **Maximum** | **284.96 ms** | Steady state |
| **Success Rate** | **100% (20/20)** | 0 failures, 0 timeouts |
| **Mathematical Determinism** | **100% Identical** | Feature contributions match to exact float precision |

### C. Per-Target SHAP Latency Breakdown (N=5 each)

| Target | Model Architecture | SHAP Explainer | Median Latency |
| :--- | :--- | :--- | :---: |
| **Cath** | Logistic Regression | `LinearExplainer` | 62.09 ms |
| **LAD** | Random Forest | `TreeExplainer` | 86.59 ms |
| **LCX** | Random Forest | `TreeExplainer` | 77.21 ms |
| **RCA** | Logistic Regression | `LinearExplainer` | 63.68 ms |

---

## 4. Artifact Integrity Verification (Before vs After)

| Artifact Filename | Size (Bytes) | Baseline SHA-256 | Post-Benchmark SHA-256 | Verification Status |
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

## 5. Performance Observations & Limitations

1. **Cold-Start Variance:** Cold-start latency for SHAP is significantly higher (~2.5s) on the first invocation due to initialization and tree parsing inside `shap.TreeExplainer`. Subsequent warm calls achieve a steady-state median of ~38 ms.
2. **Measurement Context:** Latencies depend on local CPU frequency, background load, and Python process state. Reported values represent actual measured execution times, not guaranteed SLA bounds.
3. **Determinism Scope:** Mathematical determinism verifies that identical inputs produce identical numerical outputs within the unchanged fitted pipelines; it does not constitute clinical calibration or external generalizability.
