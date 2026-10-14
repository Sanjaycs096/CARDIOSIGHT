"""
CardioSight Unit Tests: ML Pipeline, Leakage Safety, and Preprocessing
"""

import pytest
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline

from backend.ml.config import (
    FORBIDDEN_INPUT_COLUMNS,
    TARGET_CONFIG,
    RANDOM_SEED,
)
from backend.ml.data_loader import load_clean_dataset, get_feature_sets
from backend.ml.pipeline import create_model_pipeline, sanitize_input_dataframe


def test_target_mapping_and_classes():
    """Validates exact target names and class distributions from the real dataset."""
    X, y_dict, features = load_clean_dataset()

    for target_name, config in TARGET_CONFIG.items():
        assert target_name in y_dict, f"Target '{target_name}' missing from y_dict"
        y = y_dict[target_name]
        assert len(y) == 303, f"Target '{target_name}' expected 303 labels, got {len(y)}"
        unique_vals = set(np.unique(y))
        assert unique_vals == {0, 1}, f"Target '{target_name}' must be binary 0 and 1"


def test_forbidden_feature_exclusion():
    """Verifies that none of the 8 forbidden target and leakage columns exist in candidate features."""
    X, y_dict, features = load_clean_dataset()

    for forbidden in FORBIDDEN_INPUT_COLUMNS:
        assert forbidden not in features, f"Forbidden column '{forbidden}' found in feature list!"
        assert forbidden not in X.columns, f"Forbidden column '{forbidden}' found in feature DataFrame!"

    # Verify candidate feature count
    assert len(features) == 51, f"Expected exactly 51 candidate features, got {len(features)}"


def test_sex_normalization():
    """Verifies that 'Fmale' typo is normalized to 'Female'."""
    raw_df = pd.DataFrame({
        "Sex": ["Male", "Fmale", "Female"],
        "Age": [50, 60, 70],
    })
    sanitized = sanitize_input_dataframe(raw_df)
    assert set(sanitized["Sex"].unique()) == {"Male", "Female"}
    assert "Fmale" not in sanitized["Sex"].values


def test_unknown_category_handling_in_pipeline():
    """Verifies that OneHotEncoder in pipeline handles unseen categories without error."""
    # Small synthetic training fixture
    train_df = pd.DataFrame({
        "Age": [55, 65, 45, 70],
        "Sex": ["Male", "Female", "Male", "Female"],
        "Obesity": ["Y", "N", "N", "Y"],
        "BBB": ["N", "LBBB", "N", "RBBB"],
    })
    y_train = np.array([1, 0, 1, 0])

    features = list(train_df.columns)
    pipe = create_model_pipeline(features, model_type="logistic_regression", random_seed=RANDOM_SEED)
    pipe.fit(train_df, y_train)

    # Test fixture with UNSEEN category 'Unknown_Type' in BBB
    unseen_df = pd.DataFrame({
        "Age": [58],
        "Sex": ["Male"],
        "Obesity": ["Y"],
        "BBB": ["Unknown_Unseen_Type"],
    })

    # Must predict without raising an exception (handle_unknown='ignore')
    probs = pipe.predict_proba(unseen_df)
    assert probs.shape == (1, 2)
    assert 0.0 <= probs[0, 1] <= 1.0


def test_pipeline_reproducibility():
    """Verifies that training with fixed seed produces identical predictions."""
    synthetic_X = pd.DataFrame({
        "Age": [50, 60, 70, 80, 55, 65],
        "BMI": [25.0, 28.0, 31.0, 22.0, 27.5, 30.0],
        "Sex": ["Male", "Female", "Male", "Female", "Male", "Female"],
        "Obesity": ["N", "Y", "Y", "N", "Y", "Y"],
        "BBB": ["N", "N", "LBBB", "N", "RBBB", "N"],
    })
    synthetic_y = np.array([0, 1, 1, 0, 1, 1])
    features = list(synthetic_X.columns)

    pipe1 = create_model_pipeline(features, model_type="logistic_regression", random_seed=RANDOM_SEED)
    pipe1.fit(synthetic_X, synthetic_y)
    probs1 = pipe1.predict_proba(synthetic_X)

    pipe2 = create_model_pipeline(features, model_type="logistic_regression", random_seed=RANDOM_SEED)
    pipe2.fit(synthetic_X, synthetic_y)
    probs2 = pipe2.predict_proba(synthetic_X)

    np.testing.assert_allclose(probs1, probs2, rtol=1e-6, err_msg="Pipeline predictions not deterministic!")
