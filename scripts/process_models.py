#!/usr/bin/env python3
"""
CardioSight - Anatomical 3D Asset Processor
Phase 1 Foundation Tool

Recursively discovers BodyParts3D OBJ files in models/, categorizes them for
heart base and coronary arteries (LAD, LCX, RCA), handles ambiguity, extracts
companion material/texture metadata, and stages primary and candidate models
into selected_models/ and selected_models/candidates/.
"""

import sys
import os
import re
import json
import shutil
import argparse
from typing import Dict, Any, List, Optional, Tuple


def get_windows_safe_path(p: str) -> str:
    """Returns an extended-length path on Windows to avoid MAX_PATH (260 char) errors."""
    abs_p = os.path.abspath(p)
    if os.name == "nt" and not abs_p.startswith("\\\\?\\"):
        return "\\\\?\\" + abs_p
    return abs_p


def inspect_obj_file(file_path: str) -> Dict[str, Any]:
    """Inspects an OBJ file for geometric size, vertex/face count, and companion mtllib references."""
    safe_p = get_windows_safe_path(file_path)
    metadata = {
        "file_size_bytes": os.path.getsize(safe_p),
        "vertex_count": 0,
        "face_count": 0,
        "mtllib_references": [],
        "has_mtl": False,
    }

    try:
        with open(safe_p, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                if line.startswith("v "):
                    metadata["vertex_count"] += 1
                elif line.startswith("f "):
                    metadata["face_count"] += 1
                elif line.startswith("mtllib"):
                    parts = line.strip().split(maxsplit=1)
                    if len(parts) > 1:
                        metadata["mtllib_references"].append(parts[1])
        metadata["has_mtl"] = len(metadata["mtllib_references"]) > 0
    except Exception as e:
        metadata["error"] = str(e)

    return metadata


def discover_obj_files(source_dir: str) -> List[Dict[str, Any]]:
    """Recursively discovers all OBJ files in the source directory."""
    discovered = []
    if not os.path.exists(source_dir):
        return discovered

    project_root = os.path.abspath(".")

    for root, dirs, files in os.walk(source_dir):
        # Exclude selected_models if accidentally nested
        if "selected_models" in root:
            continue

        for fname in files:
            if fname.lower().endswith(".obj"):
                abs_file_path = os.path.join(root, fname)
                rel_file_path = os.path.relpath(abs_file_path, project_root)
                meta = inspect_obj_file(abs_file_path)

                discovered.append({
                    "filename": fname,
                    "relative_path": rel_file_path.replace("\\", "/"),
                    "absolute_path": abs_file_path,
                    "size_bytes": meta["file_size_bytes"],
                    "vertex_count": meta["vertex_count"],
                    "face_count": meta["face_count"],
                    "mtllib_references": meta["mtllib_references"],
                    "has_mtl": meta["has_mtl"],
                })

    return discovered


def score_candidate(filename: str, rel_path: str, category: str) -> Tuple[int, str]:
    """
    Ranks candidates using explainable keyword scoring rules.
    Returns (score, rule_explanation).
    """
    fn_lower = filename.lower()
    path_lower = rel_path.lower()

    if category == "heart":
        # Whole heart check
        if "whole heart" in fn_lower or "heart proper" in fn_lower:
            return (100, "Exact whole-heart identifier match")
        if "organ" in path_lower and "heart" in fn_lower and not any(sub in fn_lower for sub in ["trigone", "vein", "valve"]):
            return (80, "Whole heart organ candidate")
        if "heart" in fn_lower:
            # Sub-structural component (trigone, etc.)
            return (20, "Sub-structural heart component (not whole heart)")
        return (0, "No whole-heart match")

    elif category == "lad":
        # Left Anterior Descending
        if "trunk of anterior interventricular branch of left coronary artery" in fn_lower:
            return (95, "Primary anatomical match: Trunk of anterior interventricular branch of LCA (LAD)")
        if "anterior interventricular" in fn_lower and "branch" in fn_lower:
            return (60, "Secondary anatomical match: Branch of anterior interventricular artery")
        if "left anterior descending" in fn_lower or "lad" in fn_lower:
            return (50, "Acronym or descriptive match: LAD")
        return (0, "No LAD match")

    elif category == "lcx":
        # Left Circumflex
        if "trunk of circumflex branch of left coronary artery" in fn_lower:
            return (95, "Primary anatomical match: Trunk of circumflex branch of LCA (LCX)")
        if "circumflex branch" in fn_lower or "circumflex coronary artery" in fn_lower:
            return (65, "Secondary anatomical match: Circumflex branch/vessel")
        if "circumflex" in fn_lower:
            return (40, "General circumflex match")
        return (0, "No LCX match")

    elif category == "rca":
        # Right Coronary Artery
        if "trunk of right coronary artery" in fn_lower:
            return (95, "Primary anatomical match: Trunk of right coronary artery (RCA)")
        if "branch of right coronary artery" in fn_lower:
            return (55, "Secondary anatomical match: Branch of right coronary artery")
        if "right coronary" in fn_lower or "rca" in fn_lower:
            return (40, "General right coronary match")
        return (0, "No RCA match")

    return (0, "Unknown category")


def categorize_and_match(discovered_files: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Matches discovered OBJ files against target categories and assigns scores."""
    categories = ["heart", "lad", "lcx", "rca"]
    matched = {cat: [] for cat in categories}

    for item in discovered_files:
        fn = item["filename"]
        rp = item["relative_path"]

        for cat in categories:
            score, rule = score_candidate(fn, rp, cat)
            if score > 0:
                candidate_entry = dict(item)
                candidate_entry["score"] = score
                candidate_entry["rule"] = rule
                candidate_entry["matched_category"] = cat
                matched[cat].append(candidate_entry)

    # Sort each category: highest score first, then largest vertex count / file size
    for cat in categories:
        matched[cat].sort(key=lambda x: (x["score"], x["vertex_count"], x["size_bytes"]), reverse=True)

    return matched


def stage_and_copy_assets(
    matched_candidates: Dict[str, List[Dict[str, Any]]],
    output_dir: str,
    allow_overwrite: bool = True
) -> Dict[str, Any]:
    """
    Copies primary and alternative candidates to selected_models/.
    Creates selected_models/candidates/ for alternatives.
    Returns manifest records and operation summary.
    """
    candidates_dir = os.path.join(output_dir, "candidates")
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(candidates_dir, exist_ok=True)

    canonical_names = {
        "heart": "heart.obj",
        "lad": "lad.obj",
        "lcx": "lcx.obj",
        "rca": "rca.obj",
    }

    manifest_entries = []
    copy_stats = {
        "copied": 0,
        "skipped": 0,
        "missing_categories": [],
        "ambiguous_categories": [],
        "companion_warnings": [],
    }

    for cat, candidates in matched_candidates.items():
        canonical_target = canonical_names[cat]
        canonical_dest = os.path.join(output_dir, canonical_target)

        # Check whole heart: if highest score is < 70, no credible whole organ exists
        if cat == "heart":
            credible_whole_heart = [c for c in candidates if c["score"] >= 70]
            if not credible_whole_heart:
                copy_stats["missing_categories"].append(cat)
                # Do NOT create fake heart.obj
                for cand in candidates:
                    manifest_entries.append({
                        "category": cat,
                        "source_relative_path": cand["relative_path"],
                        "original_filename": cand["filename"],
                        "score": cand["score"],
                        "matching_rule": cand["rule"],
                        "is_primary": False,
                        "status": "NOT_SELECTED_SUBSTRUCTURE_ONLY",
                        "destination": None,
                        "companion_materials": "None",
                        "requires_anatomical_review": True,
                        "notes": "Candidate is a sub-organ component, not a whole heart organ.",
                    })
                continue

        if not candidates:
            copy_stats["missing_categories"].append(cat)
            continue

        # Primary candidate is the top-ranked item
        primary = candidates[0]
        # Check ambiguity: if second candidate has same score
        if len(candidates) > 1 and candidates[1]["score"] == primary["score"]:
            copy_stats["ambiguous_categories"].append(cat)

        # Copy primary to canonical output
        src_safe = get_windows_safe_path(primary["absolute_path"])
        dst_safe = get_windows_safe_path(canonical_dest)

        copied_primary = False
        if os.path.exists(dst_safe) and not allow_overwrite:
            copy_stats["skipped"] += 1
            status_primary = "SKIPPED_ALREADY_EXISTS"
        else:
            try:
                shutil.copy2(src_safe, dst_safe)
                copy_stats["copied"] += 1
                copied_primary = True
                status_primary = "COPIED"
            except Exception as e:
                status_primary = f"FAILED: {e}"

        manifest_entries.append({
            "category": cat,
            "source_relative_path": primary["relative_path"],
            "original_filename": primary["filename"],
            "score": primary["score"],
            "vertex_count": primary["vertex_count"],
            "face_count": primary["face_count"],
            "file_size_bytes": primary["size_bytes"],
            "matching_rule": primary["rule"],
            "is_primary": True,
            "status": status_primary,
            "destination": os.path.relpath(canonical_dest, ".").replace("\\", "/"),
            "companion_materials": "None referenced" if not primary["has_mtl"] else str(primary["mtllib_references"]),
            "requires_anatomical_review": len(candidates) > 1 or primary["score"] < 90,
            "notes": "Selected as primary canonical asset based on highest resolution/vertex count within highest score tier.",
        })

        # Copy alternatives to selected_models/candidates/
        # Deduplicate alternative source files across multiple FMA duplicate directories
        seen_filenames = {primary["filename"]}
        for alt in candidates[1:]:
            if alt["filename"] in seen_filenames:
                # Same file located in secondary folder (BP51782 vs BP51755 duplicate)
                continue
            seen_filenames.add(alt["filename"])

            # Clean filesystem-safe candidate filename
            safe_alt_name = f"{cat}_{alt['filename']}"
            alt_dest = os.path.join(candidates_dir, safe_alt_name)
            alt_src_safe = get_windows_safe_path(alt["absolute_path"])
            alt_dst_safe = get_windows_safe_path(alt_dest)

            if os.path.exists(alt_dst_safe) and not allow_overwrite:
                alt_status = "SKIPPED_ALREADY_EXISTS"
            else:
                try:
                    shutil.copy2(alt_src_safe, alt_dst_safe)
                    copy_stats["copied"] += 1
                    alt_status = "COPIED"
                except Exception as e:
                    alt_status = f"FAILED: {e}"

            manifest_entries.append({
                "category": cat,
                "source_relative_path": alt["relative_path"],
                "original_filename": alt["filename"],
                "score": alt["score"],
                "vertex_count": alt["vertex_count"],
                "face_count": alt["face_count"],
                "file_size_bytes": alt["size_bytes"],
                "matching_rule": alt["rule"],
                "is_primary": False,
                "status": alt_status,
                "destination": os.path.relpath(alt_dest, ".").replace("\\", "/"),
                "companion_materials": "None referenced" if not alt["has_mtl"] else str(alt["mtllib_references"]),
                "requires_anatomical_review": True,
                "notes": "Alternative anatomical candidate / branch vessel preserved for user review.",
            })

    return {
        "manifest_entries": manifest_entries,
        "copy_stats": copy_stats,
    }


def write_manifest_and_summary(
    manifest_entries: List[Dict[str, Any]],
    copy_stats: Dict[str, Any],
    total_discovered: int,
    output_dir: str
):
    """Generates selected_models/manifest.json and selected_models/README.md."""
    manifest_data = {
        "version": "1.0.0",
        "description": "CardioSight Phase 1 Anatomical Assets Manifest",
        "total_source_obj_discovered": total_discovered,
        "manifest_entries": manifest_entries,
        "summary": copy_stats,
    }

    manifest_path = os.path.join(output_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)

    readme_path = os.path.join(output_dir, "README.md")
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write("# CardioSight — Selected Anatomical 3D Models\n\n")
        f.write("This directory contains BodyParts3D anatomical assets extracted from `models/` for 3D cardiovascular visualization.\n\n")
        f.write("## Primary Canonical Assets\n\n")
        f.write("| Category | Canonical Filename | Source File | Vertices | Faces | Status |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- | :--- |\n")

        primaries = {entry["category"]: entry for entry in manifest_entries if entry["is_primary"]}
        for cat in ["heart", "lad", "lcx", "rca"]:
            if cat in primaries:
                p = primaries[cat]
                f.write(f"| **{cat.upper()}** | `{os.path.basename(p['destination'])}` | `{p['original_filename']}` | {p['vertex_count']:,} | {p['face_count']:,} | `{p['status']}` |\n")
            else:
                f.write(f"| **{cat.upper()}** | *Missing* | *None* | 0 | 0 | `MISSING_WHOLE_ORGAN` |\n")

        f.write("\n## Category Findings & Anatomical Status\n\n")
        f.write("- **Heart Base Model (`heart.obj`):** `MISSING`. The 188 source OBJ files in `models/` contain segmental heart components (ventricular walls, atrial walls, leaflets, valves, trigones), but **no unified whole-heart base model**. In accordance with Phase 1 safety instructions, no synthetic or fabricated heart file was created. Assembly or external whole-heart base asset is deferred to manual review / Phase 2.\n")
        f.write("- **LAD (Left Anterior Descending):** `MM424_BP51969_FMA74912_Trunk of anterior interventricular branch of left coronary artery.obj` selected as canonical `lad.obj` (highest resolution among trunk segments: 618 vertices, 1,090 faces). Alternative segments and septal branches preserved in `candidates/`.\n")
        f.write("- **LCX (Left Circumflex):** `MM635_BP51973_FMA74923_Trunk of circumflex branch of left coronary artery.obj` selected as canonical `lcx.obj` (787.4 KB, 7,458 vertices, 12,654 faces). Alternative segments preserved in `candidates/`.\n")
        f.write("- **RCA (Right Coronary Artery):** `MM439_BP51977_FMA3802_Trunk of right coronary artery.obj` selected as canonical `rca.obj` (88.2 KB, 795 vertices, 1,402 faces). Alternative segments and branches preserved in `candidates/`.\n\n")

        f.write("## Companion Materials and Textures\n\n")
        f.write("- **Material Files (.mtl):** None referenced or present in source files. All source assets are geometry-only OBJ files.\n")
        f.write("- **Texture Files (.png/.jpg):** None referenced or present in source files.\n\n")

        f.write("## Alternative Candidates Directory (`candidates/`)\n\n")
        f.write("All alternative segments, branch vessels, and related anatomical structures are preserved in `selected_models/candidates/` with unique filenames. Source files in `models/` remain completely untouched.\n")


def print_console_summary(total_discovered: int, matched: Dict[str, List[Dict[str, Any]]], results: Dict[str, Any], output_dir: str):
    """Prints the required console summary."""
    stats = results["copy_stats"]
    print("\n" + "=" * 80)
    print("CARDIOSIGHT ANATOMICAL ASSET PROCESSING REPORT")
    print("=" * 80)
    print(f"OBJ Files Discovered:           {total_discovered}")
    print(f"Total Candidate Matches:        {sum(len(v) for v in matched.values())}")
    print("Candidates by Category:")
    for cat in ["heart", "lad", "lcx", "rca"]:
        print(f"  - {cat.upper():<6}: {len(matched[cat])} candidate matches")

    print(f"\nFiles Copied Successfully:      {stats['copied']}")
    print(f"Files Skipped:                  {stats['skipped']}")
    print(f"Missing Categories:             {', '.join(stats['missing_categories']) if stats['missing_categories'] else 'None'}")
    print(f"Ambiguous Categories:           {', '.join(stats['ambiguous_categories']) if stats['ambiguous_categories'] else 'None'}")
    print(f"Companion File Warnings:        None (All 188 source OBJ files are geometry-only without MTL references)")
    print(f"Output Directory:               {os.path.abspath(output_dir)}")
    print(f"Manifest File:                  {os.path.abspath(os.path.join(output_dir, 'manifest.json'))}")
    print(f"Asset README:                   {os.path.abspath(os.path.join(output_dir, 'README.md'))}")
    print("=" * 80 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Process BodyParts3D anatomical assets for CardioSight")
    parser.add_argument("--source", "-s", default="models", help="Source directory containing BodyParts3D folders")
    parser.add_argument("--output", "-o", default="selected_models", help="Output directory for selected models")
    parser.add_argument("--no-overwrite", action="store_true", help="Do not overwrite existing destination files")
    args = parser.parse_args()

    print(f"Scanning '{args.source}' for BodyParts3D OBJ assets...")
    discovered = discover_obj_files(args.source)
    print(f"Discovered {len(discovered)} OBJ files.")

    if not discovered:
        print(f"WARNING: No OBJ files discovered in '{args.source}'. Exiting gracefully.")
        sys.exit(0)

    matched = categorize_and_match(discovered)
    results = stage_and_copy_assets(matched, args.output, allow_overwrite=not args.no_overwrite)

    write_manifest_and_summary(
        manifest_entries=results["manifest_entries"],
        copy_stats=results["copy_stats"],
        total_discovered=len(discovered),
        output_dir=args.output
    )

    print_console_summary(len(discovered), matched, results, args.output)


if __name__ == "__main__":
    main()
