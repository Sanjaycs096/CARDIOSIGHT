"""
CardioSight Data Loader & Preprocessing Contract
Phase 2 Leakage-Safe Machine Learning Pipeline
"""

import os
from typing import Dict, List, Tuple, Optional
import pandas as pd
import numpy as np

from backend.ml.config import (
    DATASET_CANDIDATES,
    FORBIDDEN_INPUT_COLUMNS,
    TARGET_CONFIG,
    RANDOM_SEED,
)


def get_dataset_path() -> str:
    """Resolves and returns the verified dataset file path."""
    for path in DATASET_CANDIDATES:
        if os.path.exists(path):
            return path
    raise FileNotFoundError(
        f"Could not locate dataset file. Checked: {DATASET_CANDIDATES}"
    )


def load_clean_dataset() -> Tuple[pd.DataFrame, Dict[str, np.ndarray], List[str]]:
    """
    Loads the clinical dataset, performs data normalization, verifies target labels,
    and returns features DataFrame X, target arrays dictionary y, and candidate feature names.
    """
    path = get_dataset_path()
    df = pd.read_csv(path)

    # 1. Verify Dataset Dimensions
    if df.shape[0] != 303 or df.shape[1] != 59:
        raise ValueError(
            f"Unexpected dataset dimensions: {df.shape}. Expected (303, 59)."
        )

    # 2. Normalize known source data typos
    if "Sex" in df.columns:
        # Normalize 'Fmale' to 'Female'
        df["Sex"] = df["Sex"].replace({"Fmale": "Female"})
        valid_sex = {"Male", "Female"}
        found_sex = set(df["Sex"].dropna().unique())
        if not found_sex.issubset(valid_sex):
            raise ValueError(
                f"Unexpected categories in 'Sex': {found_sex - valid_sex}"
            )

    # 3. Validate and extract targets
    y_dict: Dict[str, np.ndarray] = {}
    for target_name, config in TARGET_CONFIG.items():
        col = config["source_column"]
        if col not in df.columns:
            raise KeyError(f"Target column '{col}' not found in dataset columns.")

        unique_vals = set(df[col].dropna().unique())
        expected_vals = {config["positive_class"], config["negative_class"]}
        if unique_vals != expected_vals:
            raise ValueError(
                f"Target '{target_name}' values {unique_vals} do not match expected {expected_vals}."
            )

        # Binary encoding: positive class = 1, negative class = 0
        binary_y = (df[col] == config["positive_class"]).astype(int).values
        y_dict[target_name] = binary_y

    # 4. Filter features: strictly exclude all forbidden columns
    feature_cols = [c for c in df.columns if c not in FORBIDDEN_INPUT_COLUMNS]

    # Verify that none of the forbidden columns leaked into feature_cols
    leaked = set(feature_cols).intersection(set(FORBIDDEN_INPUT_COLUMNS))
    if leaked:
        raise RuntimeError(f"CRITICAL: Forbidden columns leaked into feature list: {leaked}")

    X = df[feature_cols].copy()

    return X, y_dict, feature_cols


def get_feature_sets(all_features: List[str]) -> Dict[str, List[str]]:
    """
    Constructs candidate feature sets for collinearity evaluation:
    - Set_A_BMI_Only: Retains BMI, drops redundant Weight and Length (49 features)
    - Set_B_Weight_Length_Only: Retains Weight and Length, drops redundant BMI (50 features)
    - Set_C_All_Three: Retains all three features (51 features)
    """
    return {
        "Set_A_BMI_Only": [c for c in all_features if c not in ["Weight", "Length"]],
        "Set_B_Weight_Length_Only": [c for c in all_features if c != "BMI"],
        "Set_C_All_Three": list(all_features),
    }
