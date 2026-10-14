"""
CardioSight API Schemas & Data Contracts
Phase 2 Pydantic Models for Inference and Metrics
"""

from typing import Dict, Any, List, Optional, Literal
from pydantic import BaseModel, Field, model_validator

# Forbidden columns that must be strictly rejected
FORBIDDEN_COLUMNS = {
    "Cath", "cath",
    "LAD", "lad",
    "LCX", "lcx",
    "RCA", "rca",
    "EF-TTE", "ef-tte", "EF_TTE", "ef_tte",
    "Region RWMA", "region rwma", "Region_RWMA", "region_rwma",
    "VHD", "vhd",
    "Exertional CP", "exertional cp", "Exertional_CP", "exertional_cp"
}

BinaryYN = Literal["Y", "N"]
SexCategory = Literal["Male", "Female", "Fmale"]  # 'Fmale' normalized automatically
BBBCategory = Literal["N", "LBBB", "RBBB"]


class PatientInput(BaseModel):
    """
    Input schema for patient clinical, demographic, electrocardiographic,
    and laboratory features required for cardiovascular risk inference.
    """
    # Demographics & Anthropometrics
    Age: int = Field(..., ge=18, le=120, description="Patient age in years")
    Sex: SexCategory = Field(..., description="Biological sex ('Male', 'Female', or 'Fmale')")
    BMI: Optional[float] = Field(None, ge=10.0, le=70.0, description="Body Mass Index (kg/m^2)")
    Weight: Optional[float] = Field(None, ge=20.0, le=250.0, description="Optional Weight in kg (used to compute BMI if missing)")
    Length: Optional[float] = Field(None, ge=50.0, le=250.0, description="Optional Height in cm (used to compute BMI if missing)")

    # Medical History & Risk Factors
    DM: Literal[0, 1] = Field(..., description="Diabetes Mellitus (0 or 1)")
    HTN: Literal[0, 1] = Field(..., description="Hypertension (0 or 1)")
    Current_Smoker: Literal[0, 1] = Field(..., alias="Current Smoker", description="Current smoker status (0 or 1)")
    EX_Smoker: Literal[0, 1] = Field(..., alias="EX-Smoker", description="Ex-smoker status (0 or 1)")
    FH: Literal[0, 1] = Field(..., description="Family History of CAD (0 or 1)")
    Obesity: BinaryYN = Field(..., description="Obesity clinical flag ('Y' or 'N')")
    CRF: BinaryYN = Field(..., description="Chronic Renal Failure ('Y' or 'N')")
    CVA: BinaryYN = Field(..., description="Cerebrovascular Accident ('Y' or 'N')")
    Airway_disease: BinaryYN = Field(..., alias="Airway disease", description="Airway disease ('Y' or 'N')")
    Thyroid_Disease: BinaryYN = Field(..., alias="Thyroid Disease", description="Thyroid disease ('Y' or 'N')")
    CHF: BinaryYN = Field(..., description="Congestive Heart Failure ('Y' or 'N')")
    DLP: BinaryYN = Field(..., description="Dyslipidemia ('Y' or 'N')")

    # Physical Examination & Symptoms
    BP: int = Field(..., ge=60, le=260, description="Systolic Blood Pressure (mmHg)")
    PR: int = Field(..., ge=30, le=220, description="Pulse Rate (bpm)")
    Edema: Literal[0, 1] = Field(..., description="Peripheral edema flag (0 or 1)")
    Weak_Peripheral_Pulse: BinaryYN = Field(..., alias="Weak Peripheral Pulse", description="Weak peripheral pulse ('Y' or 'N')")
    Lung_rales: BinaryYN = Field(..., alias="Lung rales", description="Lung rales ('Y' or 'N')")
    Systolic_Murmur: BinaryYN = Field(..., alias="Systolic Murmur", description="Systolic murmur ('Y' or 'N')")
    Diastolic_Murmur: BinaryYN = Field(..., alias="Diastolic Murmur", description="Diastolic murmur ('Y' or 'N')")
    Typical_Chest_Pain: Literal[0, 1] = Field(..., alias="Typical Chest Pain", description="Typical chest pain (0 or 1)")
    Dyspnea: BinaryYN = Field(..., description="Dyspnea on exertion or rest ('Y' or 'N')")
    Function_Class: Literal[0, 1, 2, 3] = Field(..., alias="Function Class", description="NYHA heart failure functional class (0-3)")
    Atypical: BinaryYN = Field(..., description="Atypical chest pain ('Y' or 'N')")
    Nonanginal: BinaryYN = Field(..., description="Non-anginal chest pain ('Y' or 'N')")
    LowTH_Ang: BinaryYN = Field(..., alias="LowTH Ang", description="Low threshold angina ('Y' or 'N')")

    # Electrocardiogram (ECG) Findings
    Q_Wave: Literal[0, 1] = Field(..., alias="Q Wave", description="Pathological Q wave present (0 or 1)")
    St_Elevation: Literal[0, 1] = Field(..., alias="St Elevation", description="ST segment elevation (0 or 1)")
    St_Depression: Literal[0, 1] = Field(..., alias="St Depression", description="ST segment depression (0 or 1)")
    Tinversion: Literal[0, 1] = Field(..., description="T-wave inversion (0 or 1)")
    LVH: BinaryYN = Field(..., description="Left Ventricular Hypertrophy ('Y' or 'N')")
    Poor_R_Progression: BinaryYN = Field(..., alias="Poor R Progression", description="Poor R wave progression ('Y' or 'N')")
    BBB: BBBCategory = Field(..., description="Bundle Branch Block ('N', 'LBBB', or 'RBBB')")

    # Laboratory Blood Tests
    FBS: int = Field(..., ge=30, le=600, description="Fasting Blood Sugar (mg/dL)")
    CR: float = Field(..., ge=0.1, le=15.0, description="Serum Creatinine (mg/dL)")
    TG: int = Field(..., ge=20, le=2000, description="Triglycerides (mg/dL)")
    LDL: int = Field(..., ge=10, le=400, description="Low-Density Lipoprotein (mg/dL)")
    HDL: float = Field(..., ge=5.0, le=200.0, description="High-Density Lipoprotein (mg/dL)")
    BUN: int = Field(..., ge=2, le=150, description="Blood Urea Nitrogen (mg/dL)")
    ESR: int = Field(..., ge=0, le=150, description="Erythrocyte Sedimentation Rate (mm/hr)")
    HB: float = Field(..., ge=4.0, le=25.0, description="Hemoglobin (g/dL)")
    K: float = Field(..., ge=1.5, le=9.0, description="Serum Potassium (mEq/L)")
    Na: int = Field(..., ge=100, le=180, description="Serum Sodium (mEq/L)")
    WBC: int = Field(..., ge=1000, le=40000, description="White Blood Cell count (/uL)")
    Lymph: int = Field(..., ge=0, le=100, description="Lymphocyte percentage (%)")
    Neut: int = Field(..., ge=0, le=100, description="Neutrophil percentage (%)")
    PLT: int = Field(..., ge=10, le=1200, description="Platelet count (x10^3/uL)")

    model_config = {
        "populate_by_name": True,
        "extra": "forbid",
        "allow_inf_nan": False,
    }

    @model_validator(mode="before")
    @classmethod
    def check_forbidden_and_compute_bmi(cls, data: Any) -> Any:
        import math
        if isinstance(data, dict):
            # 1. Strictly check for any forbidden columns
            for key, val in data.items():
                if key in FORBIDDEN_COLUMNS:
                    raise ValueError(
                        f"Forbidden input feature detected: '{key}'. "
                        f"Ground-truth targets and leakage columns must never be passed as predictors."
                    )
                # Check for non-finite numeric floats (NaN, Inf, -Inf)
                if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
                    raise ValueError(f"Feature '{key}' must be a finite numeric value, received {val}.")

            # 2. Derive BMI if missing
            bmi = data.get("BMI")
            if bmi is None:
                weight = data.get("Weight")
                length = data.get("Length")
                if weight is not None and length is not None:
                    try:
                        w_flt = float(weight)
                        l_flt = float(length)
                        if math.isnan(w_flt) or math.isinf(w_flt) or math.isnan(l_flt) or math.isinf(l_flt):
                            raise ValueError("Weight and Length must be finite numbers.")
                        if l_flt <= 0 or w_flt <= 0:
                            raise ValueError("Weight and Length must be positive numbers.")
                        data["BMI"] = round(w_flt / ((l_flt / 100.0) ** 2), 4)
                    except (TypeError, ValueError) as err:
                        raise ValueError(f"Invalid anthropometric input for BMI derivation: {err}")
                else:
                    raise ValueError("Must provide either 'BMI' or both 'Weight' and 'Length'.")

            # 3. Normalize 'Fmale' to 'Female' if passed
            if data.get("Sex") == "Fmale":
                data["Sex"] = "Female"

        return data

    def to_dataframe_dict(self) -> Dict[str, Any]:
        """Exports dictionary with original dataset column names matching model pipeline expectations."""
        # Map pydantic fields back to original column names
        return {
            "Age": self.Age,
            "Sex": "Female" if self.Sex == "Fmale" else self.Sex,
            "BMI": self.BMI,
            "DM": self.DM,
            "HTN": self.HTN,
            "Current Smoker": self.Current_Smoker,
            "EX-Smoker": self.EX_Smoker,
            "FH": self.FH,
            "Obesity": self.Obesity,
            "CRF": self.CRF,
            "CVA": self.CVA,
            "Airway disease": self.Airway_disease,
            "Thyroid Disease": self.Thyroid_Disease,
            "CHF": self.CHF,
            "DLP": self.DLP,
            "BP": self.BP,
            "PR": self.PR,
            "Edema": self.Edema,
            "Weak Peripheral Pulse": self.Weak_Peripheral_Pulse,
            "Lung rales": self.Lung_rales,
            "Systolic Murmur": self.Systolic_Murmur,
            "Diastolic Murmur": self.Diastolic_Murmur,
            "Typical Chest Pain": self.Typical_Chest_Pain,
            "Dyspnea": self.Dyspnea,
            "Function Class": self.Function_Class,
            "Atypical": self.Atypical,
            "Nonanginal": self.Nonanginal,
            "LowTH Ang": self.LowTH_Ang,
            "Q Wave": self.Q_Wave,
            "St Elevation": self.St_Elevation,
            "St Depression": self.St_Depression,
            "Tinversion": self.Tinversion,
            "LVH": self.LVH,
            "Poor R Progression": self.Poor_R_Progression,
            "BBB": self.BBB,
            "FBS": self.FBS,
            "CR": self.CR,
            "TG": self.TG,
            "LDL": self.LDL,
            "HDL": self.HDL,
            "BUN": self.BUN,
            "ESR": self.ESR,
            "HB": self.HB,
            "K": self.K,
            "Na": self.Na,
            "WBC": self.WBC,
            "Lymph": self.Lymph,
            "Neut": self.Neut,
            "PLT": self.PLT,
        }


class TargetPrediction(BaseModel):
    """Result for an individual cardiovascular prediction target."""
    model_config = {"protected_namespaces": ()}
    target: str = Field(..., description="Target identifier ('Cath', 'LAD', 'LCX', 'RCA')")
    description: str = Field(..., description="Clinical target description")
    positive_class_label: str = Field(..., description="Designated positive clinical outcome ('CAD' or 'Stenotic')")
    negative_class_label: str = Field(..., description="Designated negative clinical outcome ('Normal')")
    positive_probability: float = Field(..., ge=0.0, le=1.0, description="Estimated probability of positive outcome")
    negative_probability: float = Field(..., ge=0.0, le=1.0, description="Estimated probability of negative outcome")
    probability_sum: float = Field(..., description="Sum of probabilities (must approximately equal 1.0)")
    binary_prediction: int = Field(..., description="Binary classification (1 = positive, 0 = negative)")
    predicted_label: str = Field(..., description="Predicted categorical label")
    model_type: str = Field(..., description="Underlying model architecture ('logistic_regression' or 'random_forest')")


class PredictionResponse(BaseModel):
    """Response object returned by POST /api/predict."""
    predictions: Dict[str, TargetPrediction]
    high_risk_targets: List[str]
    disclaimer: str
    pipeline_version: str = "1.0.0"


class ModelStatusResponse(BaseModel):
    """Response object returned by GET /api/models/status."""
    models_loaded: bool
    available_targets: List[str]
    total_expected: int = 4
    artifact_paths: Dict[str, str]
    environment: Dict[str, Any]
    disclaimer: str


class ExplanationFeature(BaseModel):
    """Individual feature contribution to model prediction."""
    feature_name: str = Field(..., description="Human-readable feature name")
    raw_feature_name: str = Field(..., description="Transformed pipeline feature name")
    original_feature: str = Field(..., description="Original input feature name")
    patient_value: Any = Field(..., description="Patient input value for this feature")
    contribution: float = Field(..., description="SHAP feature contribution to positive prediction")
    direction: str = Field(..., description="'increases_risk' or 'decreases_risk'")


class GlobalFeatureImportance(BaseModel):
    """Population-level mean absolute SHAP feature importance."""
    feature: str = Field(..., description="Clean feature name")
    raw_feature: str = Field(..., description="Transformed feature name")
    mean_abs_shap: float = Field(..., description="Mean absolute SHAP value across training cohort")


class TargetExplanation(BaseModel):
    """Explanation breakdown for a single target."""
    model_config = {"protected_namespaces": ()}
    target: str = Field(..., description="Target identifier ('Cath', 'LAD', 'LCX', 'RCA')")
    target_description: str = Field(..., description="Clinical target description")
    model_type: str = Field(..., description="Classifier model architecture")
    method: str = Field(..., description="SHAP explainer method ('TreeExplainer' or 'LinearExplainer')")
    positive_class_label: str = Field(..., description="Designated positive clinical outcome")
    negative_class_label: str = Field(..., description="Designated negative clinical outcome")
    base_value: float = Field(..., description="Baseline expected value for positive class")
    features: List[ExplanationFeature] = Field(..., description="Ranked patient-specific feature contributions")
    global_importance: Optional[List[GlobalFeatureImportance]] = Field(None, description="Global feature ranking")


class ExplanationRequest(BaseModel):
    """Request payload for POST /api/explain."""
    patient: PatientInput = Field(..., description="Patient clinical and demographic features")
    target: Optional[str] = Field("all", description="Target to explain: 'Cath', 'LAD', 'LCX', 'RCA', or 'all'")
    top_n: Optional[int] = Field(10, ge=1, le=50, description="Number of top contributing features to return")


class ExplanationResponse(BaseModel):
    """Response payload for POST /api/explain."""
    explanations: Dict[str, TargetExplanation]
    disclaimer: str
    pipeline_version: str = "1.0.0"
