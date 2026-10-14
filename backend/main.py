"""
CardioSight Backend API - Phase 2
Provides clinical inference, model status, evaluation metrics, and health endpoints.
"""

import os
import sys
import json
import platform
from typing import Dict, Any, Optional

# Ensure project root is in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import joblib

from backend.schemas import (
    PatientInput,
    PredictionResponse,
    TargetPrediction,
    ModelStatusResponse,
    ExplanationRequest,
    ExplanationResponse,
    TargetExplanation,
    ExplanationFeature,
    GlobalFeatureImportance,
)
from backend.ml.config import TARGET_CONFIG, ARTIFACTS_DIR

CLINICAL_DISCLAIMER: str = (
    "EXPERIMENTAL EDUCATIONAL PROTOTYPE ONLY. "
    "CardioSight model outputs are machine-learning probability estimates and "
    "MUST NOT be used as a formal clinical diagnosis, medical advice, or treatment directive."
)

# In-memory pipeline cache (loaded lazily or on startup if present)
_loaded_pipelines: Dict[str, Any] = {}


def load_artifacts_if_present() -> Dict[str, Any]:
    """Safely loads persisted model pipelines from backend/artifacts/ if available."""
    global _loaded_pipelines
    if _loaded_pipelines:
        return _loaded_pipelines

    for target_name in TARGET_CONFIG.keys():
        artifact_file = os.path.join(ARTIFACTS_DIR, f"{target_name.lower()}_pipeline.joblib")
        if os.path.exists(artifact_file):
            try:
                _loaded_pipelines[target_name] = joblib.load(artifact_file)
            except Exception as e:
                print(f"Warning: Failed to load artifact '{artifact_file}': {e}", file=sys.stderr)

    return _loaded_pipelines


from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Attempt to load existing model artifacts on server startup."""
    load_artifacts_if_present()
    yield


from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

class PayloadLimitMiddleware(BaseHTTPMiddleware):
    """Enforces a strict 1MB limit on incoming request payloads to prevent DoS abuse."""
    def __init__(self, app, max_bytes: int = 1_048_576):
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > self.max_bytes:
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={"detail": "Request payload exceeds maximum limit of 1MB."},
                    )
            except ValueError:
                pass
        return await call_next(request)


app = FastAPI(
    title="CardioSight API",
    description="CardioSight Cardiovascular Risk & Anatomical Twin Inference API",
    version="0.2.0",
    lifespan=lifespan,
)

from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
import math

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Sanitizes validation errors to guarantee JSON-compliant responses even with non-finite inputs."""
    raw_errors = jsonable_encoder(exc.errors())
    safe_errors = []
    for err in raw_errors:
        err_copy = dict(err)
        if "input" in err_copy:
            inp = err_copy["input"]
            if isinstance(inp, dict):
                err_copy["input"] = {
                    k: ("<non-finite>" if isinstance(v, float) and (math.isnan(v) or math.isinf(v)) else v)
                    for k, v in inp.items()
                }
            elif isinstance(inp, float) and (math.isnan(inp) or math.isinf(inp)):
                err_copy["input"] = "<non-finite>"
        safe_errors.append(err_copy)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": safe_errors},
    )

# 1. Payload Limit Middleware (1MB)
app.add_middleware(PayloadLimitMiddleware, max_bytes=1_048_576)

# 2. CORS Middleware for Frontend Integration (configurable via ALLOWED_ORIGINS)
ALLOWED_ORIGINS_ENV = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000"
)
allowed_origins_list = [origin.strip() for origin in ALLOWED_ORIGINS_ENV.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    """Root service information and navigation."""
    return {
        "service": "CardioSight API",
        "phase": "Phase 2 Machine Learning Inference",
        "documentation": "/docs",
        "health_endpoint": "/api/health",
        "models_status_endpoint": "/api/models/status",
        "predict_endpoint": "/api/predict",
        "explain_endpoint": "/api/explain",
        "metrics_endpoint": "/api/metrics",
        "disclaimer": CLINICAL_DISCLAIMER,
    }


@app.get("/api/health")
def health_check():
    """Application health endpoint distinguishing API uptime from model artifact readiness."""
    pipelines = load_artifacts_if_present()
    available_targets = list(pipelines.keys())
    models_ready = len(available_targets) == len(TARGET_CONFIG)

    return {
        "status": "healthy" if models_ready else "degraded",
        "api_online": True,
        "models_ready": models_ready,
        "models_loaded_count": len(available_targets),
        "total_models_expected": len(TARGET_CONFIG),
        "service": "CardioSight API",
        "version": "0.2.0",
        "environment": {
            "python_version": sys.version.split()[0],
            "platform": platform.platform(),
        },
    }


@app.get("/api/models/status", response_model=ModelStatusResponse)
def get_models_status():
    """Reports status and availability of trained model pipelines."""
    pipelines = load_artifacts_if_present()
    available_targets = list(pipelines.keys())
    models_ready = len(available_targets) == len(TARGET_CONFIG)

    artifact_paths = {}
    for target in TARGET_CONFIG.keys():
        p = os.path.join(ARTIFACTS_DIR, f"{target.lower()}_pipeline.joblib")
        artifact_paths[target] = p.replace("\\", "/") if os.path.exists(p) else "MISSING"

    return ModelStatusResponse(
        models_loaded=models_ready,
        available_targets=available_targets,
        total_expected=len(TARGET_CONFIG),
        artifact_paths=artifact_paths,
        environment={
            "python_version": sys.version.split()[0],
            "platform": platform.platform(),
            "artifacts_dir": ARTIFACTS_DIR.replace("\\", "/"),
        },
        disclaimer=CLINICAL_DISCLAIMER,
    )


@app.post("/api/predict", response_model=PredictionResponse)
def predict_cardiovascular_risk(patient: PatientInput):
    """
    Computes patient-specific risk probabilities for the four cardiovascular targets:
    Cath (overall CAD), LAD (anterior descending), LCX (circumflex), and RCA (right coronary).
    """
    pipelines = load_artifacts_if_present()

    missing_targets = [t for t in TARGET_CONFIG.keys() if t not in pipelines]
    if missing_targets:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"Model artifacts missing for targets: {missing_targets}. "
                "Please execute 'python backend/train.py' to generate artifacts."
            ),
        )

    # Convert patient input dictionary to DataFrame row
    patient_dict = patient.to_dataframe_dict()
    df_patient = pd.DataFrame([patient_dict])

    predictions: Dict[str, TargetPrediction] = {}
    high_risk_targets = []

    for target_name, config in TARGET_CONFIG.items():
        pipeline = pipelines[target_name]

        # Predict probability: proba shape is (1, 2) -> [P(neg), P(pos)]
        try:
            probabilities = pipeline.predict_proba(df_patient)[0]
        except Exception as e:
            print(f"Error during {target_name} inference: {e}", file=sys.stderr)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Inference error during {target_name} risk estimation.",
            )

        prob_neg = float(probabilities[0])
        prob_pos = float(probabilities[1])
        prob_sum = round(prob_neg + prob_pos, 4)

        binary_pred = 1 if prob_pos >= 0.5 else 0
        predicted_label = config["positive_class"] if binary_pred == 1 else config["negative_class"]

        if prob_pos >= 0.5:
            high_risk_targets.append(target_name)

        # Retrieve classifier model type
        model_step = pipeline.named_steps.get("classifier")
        model_name = type(model_step).__name__ if model_step else "unknown"

        predictions[target_name] = TargetPrediction(
            target=target_name,
            description=config["description"],
            positive_class_label=config["positive_class"],
            negative_class_label=config["negative_class"],
            positive_probability=round(prob_pos, 4),
            negative_probability=round(prob_neg, 4),
            probability_sum=prob_sum,
            binary_prediction=binary_pred,
            predicted_label=predicted_label,
            model_type=model_name,
        )

    return PredictionResponse(
        predictions=predictions,
        high_risk_targets=high_risk_targets,
        disclaimer=CLINICAL_DISCLAIMER,
        pipeline_version="1.0.0",
    )


@app.get("/api/metrics")
def get_evaluation_metrics():
    """Returns saved cross-validation and held-out test evaluation metrics."""
    metrics_file = os.path.join(ARTIFACTS_DIR, "metrics.json")
    if not os.path.exists(metrics_file):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation metrics artifact not found. Run 'python backend/train.py' first.",
        )

    with open(metrics_file, "r", encoding="utf-8") as f:
        metrics_data = json.load(f)

    return metrics_data


_global_shap_cache: Optional[Dict[str, Any]] = None


def load_global_shap_cache() -> Dict[str, Any]:
    """Loads precomputed population-level global SHAP feature importance if present."""
    global _global_shap_cache
    if _global_shap_cache is not None:
        return _global_shap_cache

    shap_file = os.path.join(ARTIFACTS_DIR, "global_shap_importance.json")
    if os.path.exists(shap_file):
        try:
            with open(shap_file, "r", encoding="utf-8") as f:
                _global_shap_cache = json.load(f)
        except Exception as e:
            print(f"Warning: Failed to load global shap cache: {e}", file=sys.stderr)
            _global_shap_cache = {}
    else:
        _global_shap_cache = {}

    return _global_shap_cache


@app.post("/api/explain", response_model=ExplanationResponse)
def explain_cardiovascular_risk(request: ExplanationRequest):
    """
    Computes mathematical SHAP feature attributions for patient prediction.
    Supports TreeExplainer for Random Forest models and LinearExplainer for Logistic Regression.
    Features are ranked by descending absolute contribution, and global reference importances are attached.
    """
    pipelines = load_artifacts_if_present()
    missing_targets = [t for t in TARGET_CONFIG.keys() if t not in pipelines]
    if missing_targets:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model artifacts missing for targets: {missing_targets}.",
        )

    requested_target = request.target.strip() if request.target else "all"
    if requested_target != "all" and requested_target not in TARGET_CONFIG:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid target '{requested_target}'. Must be one of: {list(TARGET_CONFIG.keys())} or 'all'.",
        )

    targets_to_explain = list(TARGET_CONFIG.keys()) if requested_target == "all" else [requested_target]

    patient_dict = request.patient.to_dataframe_dict()
    df_patient = pd.DataFrame([patient_dict])
    global_shap_data = load_global_shap_cache()

    explanations: Dict[str, TargetExplanation] = {}

    import shap
    import numpy as np

    for target_name in targets_to_explain:
        config = TARGET_CONFIG[target_name]
        pipeline = pipelines[target_name]
        classifier = pipeline.named_steps.get("classifier")
        preprocessor = pipeline.named_steps.get("preprocessor")
        sanitizer = pipeline.named_steps.get("sanitizer")

        if not classifier or not preprocessor or not sanitizer:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Corrupt pipeline structure for {target_name}.",
            )

        try:
            df_san = sanitizer.transform(df_patient)
            X_trans = preprocessor.transform(df_san)
            feature_names = list(preprocessor.get_feature_names_out())
            model_type_name = type(classifier).__name__

            if model_type_name == "RandomForestClassifier":
                explainer = shap.TreeExplainer(classifier)
                shap_vals = explainer.shap_values(X_trans)
                if isinstance(shap_vals, list):
                    pos_vals = shap_vals[1][0]
                elif isinstance(shap_vals, np.ndarray) and len(shap_vals.shape) == 3:
                    pos_vals = shap_vals[0, :, 1]
                else:
                    pos_vals = shap_vals[0]
                base_val = float(explainer.expected_value[1] if hasattr(explainer.expected_value, '__len__') else explainer.expected_value)
                method_name = "TreeExplainer"
            else:
                # LogisticRegression
                explainer = shap.LinearExplainer(classifier, np.zeros((1, X_trans.shape[1])))
                shap_vals = explainer.shap_values(X_trans)
                pos_vals = shap_vals[0]
                base_val = float(explainer.expected_value[0] if hasattr(explainer.expected_value, '__len__') else explainer.expected_value)
                method_name = "LinearExplainer"

            # Build list of feature contributions
            features_list: List[ExplanationFeature] = []
            for i, raw_name in enumerate(feature_names):
                val_contrib = float(pos_vals[i])
                clean_name = raw_name.replace("num__", "").replace("cat__", "")

                # Determine original feature key
                orig_col = clean_name.split("_")[0] if "_" in clean_name and "cat__" in raw_name else clean_name
                # Check patient value
                pval = patient_dict.get(orig_col, patient_dict.get(clean_name, "N/A"))

                features_list.append(
                    ExplanationFeature(
                        feature_name=clean_name,
                        raw_feature_name=raw_name,
                        original_feature=orig_col,
                        patient_value=pval,
                        contribution=round(val_contrib, 5),
                        direction="increases_risk" if val_contrib > 0 else "decreases_risk",
                    )
                )

            # Sort features by absolute contribution descending
            features_list.sort(key=lambda f: abs(f.contribution), reverse=True)
            top_features = features_list[:request.top_n]

            # Global importance if cached
            raw_global = global_shap_data.get(target_name, [])
            global_importance_list = [
                GlobalFeatureImportance(**item) for item in raw_global[:request.top_n]
            ] if raw_global else None

            explanations[target_name] = TargetExplanation(
                target=target_name,
                target_description=config["description"],
                model_type=model_type_name,
                method=method_name,
                positive_class_label=config["positive_class"],
                negative_class_label=config["negative_class"],
                base_value=round(base_val, 5),
                features=top_features,
                global_importance=global_importance_list,
            )
        except Exception as e:
            print(f"Error generating SHAP explanation for {target_name}: {e}", file=sys.stderr)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate SHAP explanation for {target_name}.",
            )

    return ExplanationResponse(
        explanations=explanations,
        disclaimer=(
            "EXPLANATORY REASONING NOTICE: SHAP values represent mathematical feature attribution "
            "within the trained model pipeline for this specific patient profile. "
            "Feature contributions reflect correlation within the study cohort and DO NOT prove biological "
            "causation, clinical mechanism, or treatment efficacy."
        ),
        pipeline_version="1.0.0",
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
