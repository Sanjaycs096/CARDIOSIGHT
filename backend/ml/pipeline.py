"""
CardioSight Pipeline Builder
Phase 2 Leakage-Safe Machine Learning Pipeline
"""

from typing import List, Dict, Any, Optional
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder, FunctionTransformer
from sklearn.feature_selection import VarianceThreshold
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

from backend.ml.config import RANDOM_SEED


def sanitize_input_dataframe(df_input: pd.DataFrame) -> pd.DataFrame:
    """Sanitizes raw input data: normalizes typos such as 'Fmale' in Sex."""
    df_copy = df_input.copy()
    if "Sex" in df_copy.columns:
        df_copy["Sex"] = df_copy["Sex"].replace({"Fmale": "Female"})
    return df_copy


def build_preprocessing_pipeline(
    feature_cols: List[str],
    scale_numeric: bool = True
) -> ColumnTransformer:
    """
    Constructs a cross-validation safe ColumnTransformer for the given feature columns.
    Imputes missing values defensively, scales numeric features if requested,
    one-hot encodes categorical features with handle_unknown='ignore',
    and removes zero-variance columns strictly within training folds.
    """
    # Identify column types based on typical conventions
    # All categorical features in the dataset are 'object' or string
    # We define known categorical columns explicitly from the schema
    known_cat_cols = {
        "Sex", "Obesity", "CRF", "CVA", "Airway disease", "Thyroid Disease",
        "CHF", "DLP", "Weak Peripheral Pulse", "Lung rales", "Systolic Murmur",
        "Diastolic Murmur", "Dyspnea", "Atypical", "Nonanginal", "LowTH Ang",
        "LVH", "Poor R Progression", "BBB"
    }

    cat_cols = [c for c in feature_cols if c in known_cat_cols]
    num_cols = [c for c in feature_cols if c not in known_cat_cols]

    # Numeric Pipeline
    num_steps = [
        ("imputer", SimpleImputer(strategy="median")),
    ]
    if scale_numeric:
        num_steps.append(("scaler", StandardScaler()))
    num_steps.append(("variance_thresh", VarianceThreshold(threshold=0.0)))

    num_pipeline = Pipeline(num_steps)

    # Categorical Pipeline
    cat_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ("variance_thresh", VarianceThreshold(threshold=0.0)),
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", num_pipeline, num_cols),
            ("cat", cat_pipeline, cat_cols),
        ],
        remainder="drop"
    )

    return preprocessor


def create_model_pipeline(
    feature_cols: List[str],
    model_type: str = "logistic_regression",
    class_weight: Optional[str] = "balanced",
    random_seed: int = RANDOM_SEED
) -> Pipeline:
    """
    Constructs a complete end-to-end scikit-learn Pipeline incorporating
    input sanitization, column preprocessing, and the specified classification model.
    """
    is_linear = (model_type == "logistic_regression")
    preprocessor = build_preprocessing_pipeline(feature_cols, scale_numeric=is_linear)

    if model_type == "logistic_regression":
        classifier = LogisticRegression(
            class_weight=class_weight,
            max_iter=1000,
            solver="lbfgs",
            random_state=random_seed,
        )
    elif model_type == "random_forest":
        classifier = RandomForestClassifier(
            n_estimators=100,
            max_depth=5,
            min_samples_leaf=2,
            class_weight=class_weight,
            random_state=random_seed,
        )
    else:
        raise ValueError(f"Unsupported model_type: '{model_type}'")

    pipeline = Pipeline([
        ("sanitizer", FunctionTransformer(sanitize_input_dataframe, validate=False)),
        ("preprocessor", preprocessor),
        ("classifier", classifier),
    ])

    return pipeline
