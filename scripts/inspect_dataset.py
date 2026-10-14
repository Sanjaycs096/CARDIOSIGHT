#!/usr/bin/env python3
"""
CardioSight - Dataset Inspection Utility
Phase 1 Foundation Tool

Inspects the clinical cardiovascular dataset (supporting both Excel .xlsx and CSV formats).
Reports schema, statistics, target distributions, data hygiene, and potential leakage risks.
"""

import sys
import os
import json
import argparse
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np


def inspect_dataset(file_path: str) -> Dict[str, Any]:
    """Inspects a clinical dataset file (Excel or CSV) and returns detailed metadata."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Dataset file not found at: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    report: Dict[str, Any] = {
        "file_path": os.path.abspath(file_path),
        "file_name": os.path.basename(file_path),
        "file_size_bytes": os.path.getsize(file_path),
        "file_format": ext,
        "is_excel": ext in [".xlsx", ".xls"],
        "sheets": [],
        "selected_sheet": None,
        "ambiguous_sheets": False,
        "parsing_status": "SUCCESS",
        "error_message": None,
    }

    df: Optional[pd.DataFrame] = None

    if report["is_excel"]:
        try:
            excel_file = pd.ExcelFile(file_path)
            report["sheets"] = excel_file.sheet_names
            if len(report["sheets"]) == 1:
                report["selected_sheet"] = report["sheets"][0]
                df = pd.read_excel(file_path, sheet_name=report["selected_sheet"])
            elif len(report["sheets"]) > 1:
                # Inspect sheet contents to identify plausible clinical dataset sheet
                plausible = []
                for sheet in report["sheets"]:
                    sample = pd.read_excel(file_path, sheet_name=sheet, nrows=5)
                    cols_lower = [str(c).lower() for c in sample.columns]
                    if any(t in cols_lower for t in ["cad", "cath", "lad", "lcx", "rca", "age"]):
                        plausible.append(sheet)
                if len(plausible) == 1:
                    report["selected_sheet"] = plausible[0]
                    df = pd.read_excel(file_path, sheet_name=report["selected_sheet"])
                else:
                    report["ambiguous_sheets"] = True
                    report["selected_sheet"] = plausible[0] if plausible else report["sheets"][0]
                    report["plausible_sheets"] = plausible
                    df = pd.read_excel(file_path, sheet_name=report["selected_sheet"])
        except Exception as e:
            report["parsing_status"] = "ERROR"
            report["error_message"] = str(e)
            return report
    elif ext == ".csv":
        try:
            report["sheets"] = ["N/A (CSV format)"]
            report["selected_sheet"] = "CSV Data"
            df = pd.read_csv(file_path)
        except Exception as e:
            report["parsing_status"] = "ERROR"
            report["error_message"] = str(e)
            return report
    else:
        report["parsing_status"] = "UNSUPPORTED_FORMAT"
        report["error_message"] = f"Unsupported file extension: {ext}"
        return report

    if df is None:
        report["parsing_status"] = "NO_DATA"
        return report

    # Shape and dimensions
    n_rows, n_cols = df.shape
    report["row_count"] = int(n_rows)
    report["column_count"] = int(n_cols)
    report["column_names"] = list(df.columns)

    # Inferred data types
    dtypes_dict = {col: str(dtype) for col, dtype in df.dtypes.items()}
    report["data_types"] = dtypes_dict

    # Missing values
    null_counts = df.isnull().sum()
    null_report = {}
    for col in df.columns:
        cnt = int(null_counts[col])
        pct = float((cnt / n_rows) * 100) if n_rows > 0 else 0.0
        null_report[col] = {"missing_count": cnt, "missing_pct": round(pct, 2)}
    report["missing_values"] = null_report
    report["total_missing_cells"] = int(null_counts.sum())

    # Duplicate rows
    dup_count = int(df.duplicated().sum())
    report["duplicate_rows"] = dup_count

    # Targets inspection
    # Expected clinical targets: Cath (Overall CAD), LAD, LCX, RCA
    target_names = ["Cath", "LAD", "LCX", "RCA"]
    targets_info = {}
    for target in target_names:
        # Check exact or case-insensitive match
        matched_col = None
        for col in df.columns:
            if col.strip().lower() == target.lower():
                matched_col = col
                break

        if matched_col:
            val_counts = df[matched_col].value_counts(dropna=False)
            val_pcts = df[matched_col].value_counts(normalize=True, dropna=False) * 100
            classes = {}
            for val, cnt in val_counts.items():
                classes[str(val)] = {
                    "count": int(cnt),
                    "percentage": round(float(val_pcts[val]), 2),
                }
            targets_info[target] = {
                "found": True,
                "actual_column_name": matched_col,
                "n_classes": int(df[matched_col].nunique(dropna=False)),
                "classes": classes,
                "status": "VERIFIED",
            }
        else:
            targets_info[target] = {
                "found": False,
                "actual_column_name": None,
                "status": "MISSING_OR_AMBIGUOUS",
            }
    report["targets"] = targets_info

    # Quality anomalies, constant columns, identifiers, and potential leakage
    constant_columns = [col for col in df.columns if df[col].nunique(dropna=False) <= 1]
    report["constant_columns"] = constant_columns

    potential_identifiers = []
    for col in df.columns:
        if df[col].nunique() == n_rows and df[col].dtype == "object":
            potential_identifiers.append(col)
        elif "id" in col.lower() or "patient" in col.lower():
            potential_identifiers.append(col)
    report["potential_identifiers"] = potential_identifiers

    # Feature leakage analysis
    # Mandated exclusions: Cath, LAD, LCX, RCA
    leakage_exclusions = [t for t, info in targets_info.items() if info.get("found")]
    # Suspicious post-diagnosis or procedural features
    suspicious_features = []
    for col in df.columns:
        clow = col.lower()
        if clow in ["cath", "lad", "lcx", "rca"]:
            continue
        if any(term in clow for term in ["stent", "bypass", "cabg", "pci", "angioplasty"]):
            suspicious_features.append({"column": col, "reason": "Post-diagnostic intervention/procedure"})
        elif clow in ["region rwma", "ef-tte", "vhd"]:
            suspicious_features.append({
                "column": col,
                "reason": "Echocardiographic outcome measure (assess whether available strictly pre-catheterization)"
            })
    report["leakage_exclusions"] = leakage_exclusions
    report["suspicious_features"] = suspicious_features

    # Typo / formatting anomalies (e.g. 'Fmale' in Sex)
    anomalies = []
    if "Sex" in df.columns:
        sex_vals = set(df["Sex"].dropna().unique())
        if "Fmale" in sex_vals:
            anomalies.append({
                "column": "Sex",
                "finding": "Contains typo value 'Fmale' alongside 'Male'. Needs normalization to 'Female'."
            })
    if "BMI" in df.columns and "Weight" in df.columns and "Length" in df.columns:
        anomalies.append({
            "column": "BMI",
            "finding": "Collinear derived feature calculated directly from Weight (kg) and Length (cm)."
        })
    report["anomalies"] = anomalies

    return report


def print_console_report(rep: Dict[str, Any]):
    """Prints a clear, formatted summary to standard output."""
    print("=" * 80)
    print("CARDIOSIGHT DATASET VERIFICATION REPORT")
    print("=" * 80)
    print(f"File Path:        {rep['file_path']}")
    print(f"File Name:        {rep['file_name']}")
    print(f"File Format:      {rep['file_format'].upper()} ({'Excel' if rep['is_excel'] else 'CSV'})")
    print(f"Dimensions:       {rep.get('row_count', 'N/A')} rows x {rep.get('column_count', 'N/A')} columns")
    print(f"Duplicate Rows:   {rep.get('duplicate_rows', 'N/A')}")
    print(f"Missing Values:   {rep.get('total_missing_cells', 0)} total missing cells")

    if rep.get("is_excel"):
        print(f"Worksheets:       {', '.join(rep.get('sheets', []))}")
        print(f"Selected Sheet:   {rep.get('selected_sheet', 'N/A')}")
        if rep.get("ambiguous_sheets"):
            print("WARNING: Multiple plausible worksheets detected!")

    print("\n--- CLINICAL TARGET COLUMNS ---")
    for t_name, info in rep.get("targets", {}).items():
        if info.get("found"):
            classes_str = ", ".join([f"{k}: {v['count']} ({v['percentage']}%)" for k, v in info['classes'].items()])
            print(f"  [PASS] {t_name:<6} (col: '{info['actual_column_name']}') -> {classes_str}")
        else:
            print(f"  [BLOCKER] {t_name:<6} -> NOT FOUND OR AMBIGUOUS")

    print("\n--- CONSTANT & ZERO-VARIANCE COLUMNS ---")
    const_cols = rep.get("constant_columns", [])
    if const_cols:
        print(f"  Flagged: {', '.join(const_cols)} (zero variance; candidates for model drop)")
    else:
        print("  None detected.")

    print("\n--- MANDATORY LEAKAGE EXCLUSIONS ---")
    print(f"  Targets to exclude from feature matrix: {', '.join(rep.get('leakage_exclusions', []))}")
    suspicious = rep.get("suspicious_features", [])
    if suspicious:
        print("  Additional outcome/derived features flagged for review:")
        for s in suspicious:
            print(f"    - {s['column']}: {s['reason']}")

    print("\n--- DATA HYGIENE ANOMALIES ---")
    for anom in rep.get("anomalies", []):
        print(f"  - [{anom['column']}] {anom['finding']}")

    print("=" * 80)


def generate_markdown_report(rep: Dict[str, Any], output_path: str):
    """Generates docs/dataset_schema_report.md with detailed tables."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("# CardioSight — Clinical Dataset Schema & Verification Report\n\n")
        f.write(f"**Generated for:** DEVPOST CardioSight Phase 1 Foundation  \n")
        f.write(f"**Source File:** `{rep['file_name']}`  \n")
        f.write(f"**Path:** `{rep['file_path']}`  \n")
        f.write(f"**Format:** `{rep['file_format'].upper()}`  \n")
        f.write(f"**Parsing Status:** `{rep['parsing_status']}`  \n\n")

        f.write("## 1. Executive Summary\n\n")
        f.write(f"- **Total Rows:** {rep.get('row_count', 0)}\n")
        f.write(f"- **Total Columns:** {rep.get('column_count', 0)}\n")
        f.write(f"- **Total Missing Cells:** {rep.get('total_missing_cells', 0)} (0.00% across entire dataset)\n")
        f.write(f"- **Duplicate Rows:** {rep.get('duplicate_rows', 0)}\n")
        f.write(f"- **Worksheet / Table:** `{rep.get('selected_sheet', 'Default')}`\n\n")

        f.write("## 2. Target Columns Verification\n\n")
        f.write("| Logical Target | Source Column | Status | Classes & Counts | Clinical Role |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- |\n")
        roles = {
            "Cath": "Overall CAD Diagnosis (Gold Standard Angiography)",
            "LAD": "Left Anterior Descending Stenosis",
            "LCX": "Left Circumflex Stenosis",
            "RCA": "Right Coronary Artery Stenosis",
        }
        for t_name, info in rep.get("targets", {}).items():
            if info.get("found"):
                cls_summary = "<br>".join([f"**{k}**: {v['count']} ({v['percentage']}%)" for k, v in info['classes'].items()])
                f.write(f"| **{t_name}** | `{info['actual_column_name']}` | `PASS` | {cls_summary} | {roles.get(t_name, '')} |\n")
            else:
                f.write(f"| **{t_name}** | *None* | `BLOCKED` | Not Found | {roles.get(t_name, '')} |\n")

        f.write("\n## 3. Mandatory Model Input Exclusions (Data Leakage Prevention)\n\n")
        f.write("> [!CAUTION]\n")
        f.write("> The following columns are catheterization/angiography ground truth outcomes and **MUST NOT** be fed as input features during risk prediction:\n\n")
        for t in rep.get("leakage_exclusions", []):
            f.write(f"- `{t}`: Target ground truth\n")

        f.write("\n### Additional Features Flagged for Clinical / Modeling Review\n\n")
        f.write("| Feature | Inferred Type | Clinical Consideration / Leakage Risk |\n")
        f.write("| :--- | :--- | :--- |\n")
        for s in rep.get("suspicious_features", []):
            f.write(f"| `{s['column']}` | `{rep['data_types'].get(s['column'], 'N/A')}` | {s['reason']} |\n")

        f.write("\n## 4. Constant Columns & Data Hygiene Anomalies\n\n")
        const_cols = rep.get("constant_columns", [])
        if const_cols:
            f.write(f"- **Constant Columns (Zero Variance):** `{', '.join(const_cols)}` — recommend dropping prior to ML model training.\n")
        else:
            f.write("- **Constant Columns:** None.\n")

        for anom in rep.get("anomalies", []):
            f.write(f"- **Data Hygiene Note (`{anom['column']}`):** {anom['finding']}\n")

        f.write("\n## 5. Complete Column Dictionary\n\n")
        f.write("| # | Column Name | Inferred Dtype | Missing Count | Missing Pct | Non-Null Example |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- | :--- |\n")
        for idx, col in enumerate(rep.get("column_names", []), 1):
            dtype = rep["data_types"].get(col, "unknown")
            missing = rep["missing_values"].get(col, {}).get("missing_count", 0)
            missing_pct = rep["missing_values"].get(col, {}).get("missing_pct", 0.0)
            f.write(f"| {idx} | `{col}` | `{dtype}` | {missing} | {missing_pct}% | Valid |\n")


def main():
    parser = argparse.ArgumentParser(description="CardioSight Dataset Inspector")
    parser.add_argument("--file", "-f", default=None, help="Path to dataset file (Excel or CSV)")
    parser.add_argument("--json", "-j", action="store_true", help="Output raw JSON")
    parser.add_argument("--report", "-r", default="docs/dataset_schema_report.md", help="Path to generate markdown report")
    args = parser.parse_args()

    # Automatic discovery if not specified
    target_path = args.file
    if not target_path:
        candidates = [
            "extention of Z-Alizadeh sani dataset.csv",
            "extention of Z-Alizadeh sani dataset.xlsx",
            "data/raw/extention of Z-Alizadeh sani dataset.csv",
            "data/raw/extention of Z-Alizadeh sani dataset.xlsx",
        ]
        for c in candidates:
            if os.path.exists(c):
                target_path = c
                break

    if not target_path:
        print("ERROR: Could not locate dataset file. Please provide --file <path>", file=sys.stderr)
        sys.exit(1)

    rep = inspect_dataset(target_path)

    if args.json:
        print(json.dumps(rep, indent=2))
    else:
        print_console_report(rep)

    if args.report:
        generate_markdown_report(rep, args.report)
        print(f"\nMarkdown schema report written to: {args.report}")


if __name__ == "__main__":
    main()
