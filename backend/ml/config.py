"""
CardioSight ML Configuration & Constants
Phase 2 Leakage-Safe Machine Learning Pipeline
"""

import os
from typing import Dict, List, Any

# Reproducibility seed
RANDOM_SEED: int = 42

# Primary verified dataset paths
DATASET_CANDIDATES: List[str] = [
    "data/raw/extention of Z-Alizadeh sani dataset.csv",
    "extention of Z-Alizadeh sani dataset.csv",
]

# Mandatory Forbidden Input Columns (Leakage Prevention)
FORBIDDEN_INPUT_COLUMNS: List[str] = [
    "Cath",          # Target: Overall CAD
    "LAD",           # Target: Left Anterior Descending
    "LCX",           # Target: Left Circumflex
    "RCA",           # Target: Right Coronary Artery
    "EF-TTE",        # Provisionally excluded: Transthoracic Echo Ejection Fraction
    "Region RWMA",   # Provisionally excluded: Regional Wall Motion Abnormality
    "VHD",           # Provisionally excluded: Valvular Heart Disease
    "Exertional CP", # Excluded: Zero-variance upstream anomaly (100% constant 'N')
]

# Prediction Targets & Ground-Truth Contract
TARGET_CONFIG: Dict[str, Dict[str, Any]] = {
    "Cath": {
        "source_column": "Cath",
        "description": "Overall Coronary Artery Disease (Gold-Standard Angiography)",
        "positive_class": "CAD",
        "negative_class": "Normal",
        "positive_value": 1,
        "negative_value": 0,
    },
    "LAD": {
        "source_column": "LAD",
        "description": "Left Anterior Descending Artery Stenosis (>=50%)",
        "positive_class": "Stenotic",
        "negative_class": "Normal",
        "positive_value": 1,
        "negative_value": 0,
    },
    "LCX": {
        "source_column": "LCX",
        "description": "Left Circumflex Artery Stenosis (>=50%)",
        "positive_class": "Stenotic",
        "negative_class": "Normal",
        "positive_value": 1,
        "negative_value": 0,
    },
    "RCA": {
        "source_column": "RCA",
        "description": "Right Coronary Artery Stenosis (>=50%)",
        "positive_class": "Stenotic",
        "negative_class": "Normal",
        "positive_value": 1,
        "negative_value": 0,
    },
}

# Artifact Directory
ARTIFACTS_DIR: str = os.path.join("backend", "artifacts")

# Cross-Validation Configuration
TEST_SIZE: float = 0.20
CV_SPLITS: int = 5
