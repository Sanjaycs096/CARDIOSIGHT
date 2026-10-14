"""
CardioSight Integration Tests: FastAPI Endpoints & Inference Safeguards
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)

VALID_PATIENT_FIXTURE = {
    "Age": 58,
    "Sex": "Male",
    "BMI": 26.78,
    "DM": 0,
    "HTN": 1,
    "Current Smoker": 0,
    "EX-Smoker": 0,
    "FH": 0,
    "Obesity": "N",
    "CRF": "N",
    "CVA": "N",
    "Airway disease": "N",
    "Thyroid Disease": "N",
    "CHF": "N",
    "DLP": "N",
    "BP": 130,
    "PR": 75,
    "Edema": 0,
    "Weak Peripheral Pulse": "N",
    "Lung rales": "N",
    "Systolic Murmur": "N",
    "Diastolic Murmur": "N",
    "Typical Chest Pain": 1,
    "Dyspnea": "N",
    "Function Class": 0,
    "Atypical": "N",
    "Nonanginal": "N",
    "LowTH Ang": "N",
    "Q Wave": 0,
    "St Elevation": 0,
    "St Depression": 0,
    "Tinversion": 0,
    "LVH": "N",
    "Poor R Progression": "N",
    "BBB": "N",
    "FBS": 100,
    "CR": 1.0,
    "TG": 140,
    "LDL": 100,
    "HDL": 40.0,
    "BUN": 16,
    "ESR": 15,
    "HB": 13.5,
    "K": 4.2,
    "Na": 141,
    "WBC": 7200,
    "Lymph": 32,
    "Neut": 60,
    "PLT": 220,
}


def test_health_endpoint():
    """Confirms existing /api/health endpoint returns 200 and healthy status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "environment" in data


def test_models_status_endpoint():
    """Confirms /api/models/status reports all 4 target models as loaded."""
    response = client.get("/api/models/status")
    assert response.status_code == 200
    data = response.json()
    assert data["models_loaded"] is True
    assert set(data["available_targets"]) == {"Cath", "LAD", "LCX", "RCA"}
    assert "disclaimer" in data


def test_metrics_endpoint():
    """Confirms /api/metrics returns full saved evaluation metrics dictionary."""
    response = client.get("/api/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "target_evaluations" in data
    assert "feature_set_comparison" in data
    assert set(data["target_evaluations"].keys()) == {"Cath", "LAD", "LCX", "RCA"}


def test_predict_endpoint_success_and_probabilities():
    """Confirms /api/predict produces valid probability estimates summing to 1.0 for each target."""
    response = client.post("/api/predict", json=VALID_PATIENT_FIXTURE)
    assert response.status_code == 200
    data = response.json()

    assert "predictions" in data
    predictions = data["predictions"]
    assert set(predictions.keys()) == {"Cath", "LAD", "LCX", "RCA"}

    for target_name, pred in predictions.items():
        p_pos = pred["positive_probability"]
        p_neg = pred["negative_probability"]
        p_sum = pred["probability_sum"]

        # Probability bounds
        assert 0.0 <= p_pos <= 1.0, f"Positive probability out of bounds: {p_pos}"
        assert 0.0 <= p_neg <= 1.0, f"Negative probability out of bounds: {p_neg}"
        # Probability sum check
        assert abs(p_sum - 1.0) < 0.01, f"Probabilities do not sum to 1.0 for {target_name}: {p_sum}"

        # Verified labels
        assert pred["positive_class_label"] in ["CAD", "Stenotic"]
        assert pred["negative_class_label"] == "Normal"

    assert "disclaimer" in data


def test_predict_rejects_forbidden_targets():
    """Verifies that attempting to pass target columns as predictors is rejected with HTTP 422."""
    for forbidden in ["Cath", "LAD", "LCX", "RCA"]:
        leaked_payload = dict(VALID_PATIENT_FIXTURE)
        leaked_payload[forbidden] = "CAD" if forbidden == "Cath" else "Stenotic"
        response = client.post("/api/predict", json=leaked_payload)
        assert response.status_code == 422, f"Failed to reject forbidden target predictor: {forbidden}"
        assert "Forbidden input feature detected" in response.text


def test_predict_rejects_provisional_echo_and_constant_features():
    """Verifies that passing EF-TTE, Region RWMA, VHD, or Exertional CP is rejected with HTTP 422."""
    for forbidden in ["EF-TTE", "Region RWMA", "VHD", "Exertional CP"]:
        leaked_payload = dict(VALID_PATIENT_FIXTURE)
        leaked_payload[forbidden] = 50 if "EF" in forbidden else "N"
        response = client.post("/api/predict", json=leaked_payload)
        assert response.status_code == 422, f"Failed to reject forbidden feature: {forbidden}"
        assert "Forbidden input feature detected" in response.text


def test_predict_with_weight_and_length_derives_bmi():
    """Verifies that if BMI is omitted, it is derived automatically from Weight and Length."""
    payload_without_bmi = dict(VALID_PATIENT_FIXTURE)
    del payload_without_bmi["BMI"]
    payload_without_bmi["Weight"] = 75.0
    payload_without_bmi["Length"] = 175.0

    response = client.post("/api/predict", json=payload_without_bmi)
    assert response.status_code == 200
    assert "predictions" in response.json()


def test_predict_rejects_nonpositive_or_invalid_height():
    """Verifies that non-positive or out-of-range height values are rejected with HTTP 422."""
    payload_bad_height = dict(VALID_PATIENT_FIXTURE)
    del payload_bad_height["BMI"]
    payload_bad_height["Weight"] = 75.0
    payload_bad_height["Length"] = 0.0  # Invalid non-positive height

    response = client.post("/api/predict", json=payload_bad_height)
    assert response.status_code == 422


def test_missing_artifact_behavior(monkeypatch):
    """Verifies that when model artifacts are missing, /api/predict returns HTTP 503."""
    import backend.main as main_mod

    # Temporarily monkeypatch _loaded_pipelines to simulate missing models
    monkeypatch.setattr(main_mod, "_loaded_pipelines", {})
    monkeypatch.setattr(main_mod, "load_artifacts_if_present", lambda: {})

    # Models status reports models_loaded=False
    status_res = client.get("/api/models/status")
    assert status_res.status_code == 200
    assert status_res.json()["models_loaded"] is False

    # Predict returns HTTP 503 Service Unavailable
    pred_res = client.post("/api/predict", json=VALID_PATIENT_FIXTURE)
    assert pred_res.status_code == 503
    assert "Model artifacts missing" in pred_res.json()["detail"]


def test_explain_endpoint_success():
    """Confirms /api/explain calculates mathematical SHAP values for all targets."""
    payload = {
        "patient": VALID_PATIENT_FIXTURE,
        "target": "all",
        "top_n": 5
    }
    response = client.post("/api/explain", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "explanations" in data
    assert len(data["explanations"]) == 4

    # LAD uses TreeExplainer
    lad_exp = data["explanations"]["LAD"]
    assert lad_exp["method"] == "TreeExplainer"
    assert lad_exp["model_type"] == "RandomForestClassifier"
    assert len(lad_exp["features"]) == 5
    assert all("contribution" in f and "direction" in f for f in lad_exp["features"])

    # Cath uses LinearExplainer
    cath_exp = data["explanations"]["Cath"]
    assert cath_exp["method"] == "LinearExplainer"
    assert cath_exp["model_type"] == "LogisticRegression"

    # Global importance attached
    assert lad_exp["global_importance"] is not None
    assert len(lad_exp["global_importance"]) > 0


def test_explain_single_target_and_invalid_target():
    """Confirms explaining an individual target and rejecting invalid target identifiers."""
    # Single valid target
    res_single = client.post("/api/explain", json={"patient": VALID_PATIENT_FIXTURE, "target": "LCX"})
    assert res_single.status_code == 200
    assert list(res_single.json()["explanations"].keys()) == ["LCX"]

    # Invalid target identifier
    res_bad = client.post("/api/explain", json={"patient": VALID_PATIENT_FIXTURE, "target": "UNKNOWN_VESSEL"})
    assert res_bad.status_code == 400
    assert "Invalid target" in res_bad.json()["detail"]


def test_explain_rejects_forbidden_features():
    """Confirms /api/explain rejects input with forbidden target or provisional features."""
    bad_payload = {
        "patient": {**VALID_PATIENT_FIXTURE, "Cath": "CAD"},
        "target": "all"
    }
    response = client.post("/api/explain", json=bad_payload)
    assert response.status_code == 422


def test_predict_rejects_non_finite_numeric_values():
    """Confirms /api/predict rejects NaN and Infinity values with HTTP 422."""
    import json

    # 1. NaN in BMI
    nan_bmi = {**VALID_PATIENT_FIXTURE, "BMI": float("nan")}
    res_nan = client.post(
        "/api/predict",
        content=json.dumps(nan_bmi, allow_nan=True),
        headers={"Content-Type": "application/json"}
    )
    assert res_nan.status_code == 422

    # 2. Inf in BP
    inf_bp = {**VALID_PATIENT_FIXTURE, "BP": float("inf")}
    res_inf = client.post(
        "/api/predict",
        content=json.dumps(inf_bp, allow_nan=True),
        headers={"Content-Type": "application/json"}
    )
    assert res_inf.status_code == 422

    # 3. Non-finite weight in BMI derivation
    no_bmi = {k: v for k, v in VALID_PATIENT_FIXTURE.items() if k != "BMI"}
    bad_weight = {**no_bmi, "Weight": float("nan"), "Length": 170.0}
    res_w = client.post(
        "/api/predict",
        content=json.dumps(bad_weight, allow_nan=True),
        headers={"Content-Type": "application/json"}
    )
    assert res_w.status_code == 422


def test_payload_limit_middleware_rejects_oversized_payload():
    """Confirms PayloadLimitMiddleware rejects requests exceeding 1MB with HTTP 413."""
    headers = {"Content-Length": str(1_500_000)}
    response = client.post("/api/predict", json=VALID_PATIENT_FIXTURE, headers=headers)
    assert response.status_code == 413
    assert "exceeds maximum limit of 1MB" in response.json()["detail"]


def test_health_endpoint_distinguishes_api_and_models():
    """Confirms /api/health explicitly reports both API status and model readiness status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["api_online"] is True
    assert data["models_ready"] is True
    assert data["models_loaded_count"] == 4
    assert data["total_models_expected"] == 4
    assert data["status"] == "healthy"


def test_sanitized_internal_error_handling(monkeypatch):
    """Confirms 500 errors in inference return sanitized error messages without exposing system paths."""
    from backend.main import _loaded_pipelines

    class MockFailingPipeline:
        def predict_proba(self, X):
            raise RuntimeError("CRITICAL_INTERNAL_FILE_PATH_LEAK: /var/secrets/key.txt")

    monkeypatch.setitem(_loaded_pipelines, "Cath", MockFailingPipeline())

    response = client.post("/api/predict", json=VALID_PATIENT_FIXTURE)
    assert response.status_code == 500
    detail = response.json()["detail"]
    assert "CRITICAL_INTERNAL_FILE_PATH_LEAK" not in detail
    assert "Inference error during Cath risk estimation." in detail


def test_predict_rejects_invalid_categories_and_out_of_range_features():
    """Confirms rejection of invalid categorical values and out-of-range numeric features."""
    # 1. Invalid categorical Sex
    assert client.post("/api/predict", json={**VALID_PATIENT_FIXTURE, "Sex": "Unknown"}).status_code == 422

    # 2. Invalid categorical Obesity
    assert client.post("/api/predict", json={**VALID_PATIENT_FIXTURE, "Obesity": "Maybe"}).status_code == 422

    # 3. Invalid categorical BBB
    assert client.post("/api/predict", json={**VALID_PATIENT_FIXTURE, "BBB": "InvalidBlock"}).status_code == 422

    # 4. Out of range Age (< 18)
    assert client.post("/api/predict", json={**VALID_PATIENT_FIXTURE, "Age": 14}).status_code == 422

    # 5. Out of range Age (> 120)
    assert client.post("/api/predict", json={**VALID_PATIENT_FIXTURE, "Age": 135}).status_code == 422

    # 6. Out of range BP (> 260)
    assert client.post("/api/predict", json={**VALID_PATIENT_FIXTURE, "BP": 320}).status_code == 422


def test_explain_handles_corrupt_pipeline(monkeypatch):
    """Confirms /api/explain returns 500 with sanitized message when pipeline internal step is corrupt."""
    from backend.main import _loaded_pipelines

    class MockCorruptPipeline:
        named_steps = {}  # Missing classifier, preprocessor, sanitizer

    monkeypatch.setitem(_loaded_pipelines, "Cath", MockCorruptPipeline())

    response = client.post("/api/explain", json={"patient": VALID_PATIENT_FIXTURE, "target": "Cath"})
    assert response.status_code == 500
    assert "Corrupt pipeline structure for Cath." in response.json()["detail"]



