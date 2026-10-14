"""
CardioSight Model Evaluator & Metrics Calculator
Phase 2 Leakage-Safe Machine Learning Pipeline
"""

from typing import Dict, Any, List, Tuple
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
)
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import Pipeline
import pandas as pd


def compute_binary_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_pred_proba: np.ndarray,
    positive_label_name: str
) -> Dict[str, Any]:
    """
    Computes all standard binary classification performance metrics.
    Ensures ROC-AUC uses designated positive class probabilities.
    """
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel()

    # Calculate metrics with zero_division safety
    acc = float(accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))

    try:
        auc = float(roc_auc_score(y_true, y_pred_proba))
    except Exception:
        auc = None

    pos_count = int(np.sum(y_true == 1))
    neg_count = int(np.sum(y_true == 0))
    total_count = len(y_true)

    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "roc_auc": round(auc, 4) if auc is not None else None,
        "confusion_matrix": {
            "true_negative": int(tn),
            "false_positive": int(fp),
            "false_negative": int(fn),
            "true_positive": int(tp),
        },
        "sample_counts": {
            "total": total_count,
            "positive_count": pos_count,
            "negative_count": neg_count,
            "positive_proportion": round(pos_count / total_count, 4) if total_count > 0 else 0.0,
        },
        "positive_class_label": positive_label_name,
    }


def evaluate_cross_validation(
    pipeline: Pipeline,
    X: pd.DataFrame,
    y: np.ndarray,
    cv_splits: int = 5,
    random_seed: int = 42,
    positive_label_name: str = "Positive"
) -> Dict[str, Any]:
    """
    Runs Stratified K-Fold cross-validation strictly fitting the pipeline inside training folds.
    Returns mean and standard deviation across validation folds for all metrics.
    """
    skf = StratifiedKFold(n_splits=cv_splits, shuffle=True, random_state=random_seed)

    fold_metrics: List[Dict[str, Any]] = []

    for fold_idx, (train_idx, val_idx) in enumerate(skf.split(X, y), 1):
        X_train_fold, X_val_fold = X.iloc[train_idx], X.iloc[val_idx]
        y_train_fold, y_val_fold = y[train_idx], y[val_idx]

        # Fit strictly on train fold
        pipeline.fit(X_train_fold, y_train_fold)

        y_pred = pipeline.predict(X_val_fold)
        y_pred_proba = pipeline.predict_proba(X_val_fold)[:, 1]

        metrics = compute_binary_metrics(
            y_val_fold, y_pred, y_pred_proba, positive_label_name=positive_label_name
        )
        metrics["fold"] = fold_idx
        fold_metrics.append(metrics)

    # Calculate summary statistics across folds
    aucs = [m["roc_auc"] for m in fold_metrics if m["roc_auc"] is not None]
    f1s = [m["f1"] for m in fold_metrics]
    accs = [m["accuracy"] for m in fold_metrics]
    precs = [m["precision"] for m in fold_metrics]
    recs = [m["recall"] for m in fold_metrics]

    return {
        "n_folds": cv_splits,
        "mean_roc_auc": round(float(np.mean(aucs)), 4) if aucs else None,
        "std_roc_auc": round(float(np.std(aucs)), 4) if aucs else None,
        "mean_f1": round(float(np.mean(f1s)), 4),
        "std_f1": round(float(np.std(f1s)), 4),
        "mean_accuracy": round(float(np.mean(accs)), 4),
        "std_accuracy": round(float(np.std(accs)), 4),
        "mean_precision": round(float(np.mean(precs)), 4),
        "std_precision": round(float(np.std(precs)), 4),
        "mean_recall": round(float(np.mean(recs)), 4),
        "std_recall": round(float(np.std(recs)), 4),
        "fold_details": fold_metrics,
        "positive_class_label": positive_label_name,
    }
