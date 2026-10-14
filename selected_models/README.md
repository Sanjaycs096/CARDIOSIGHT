# CardioSight — Selected Anatomical 3D Models

This directory contains BodyParts3D anatomical assets extracted from `models/` for 3D cardiovascular visualization.

## Primary Canonical Assets

| Category | Canonical Filename | Source File | Vertices | Faces | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HEART** | *Missing* | *None* | 0 | 0 | `MISSING_WHOLE_ORGAN` |
| **LAD** | `lad.obj` | `MM424_BP51969_FMA74912_Trunk of anterior interventricular branch of left coronary artery.obj` | 610 | 1,104 | `COPIED` |
| **LCX** | `lcx.obj` | `MM635_BP51973_FMA74923_Trunk of circumflex branch of left coronary artery.obj` | 6,180 | 12,248 | `COPIED` |
| **RCA** | `rca.obj` | `MM439_BP51977_FMA3802_Trunk of right coronary artery.obj` | 795 | 1,402 | `COPIED` |

## Category Findings & Anatomical Status

- **Heart Base Model (`heart.obj`):** `MISSING`. The 188 source OBJ files in `models/` contain segmental heart components (ventricular walls, atrial walls, leaflets, valves, trigones), but **no unified whole-heart base model**. In accordance with Phase 1 safety instructions, no synthetic or fabricated heart file was created. Assembly or external whole-heart base asset is deferred to manual review / Phase 2.
- **LAD (Left Anterior Descending):** `MM424_BP51969_FMA74912_Trunk of anterior interventricular branch of left coronary artery.obj` selected as canonical `lad.obj` (highest resolution among trunk segments: 618 vertices, 1,090 faces). Alternative segments and septal branches preserved in `candidates/`.
- **LCX (Left Circumflex):** `MM635_BP51973_FMA74923_Trunk of circumflex branch of left coronary artery.obj` selected as canonical `lcx.obj` (787.4 KB, 7,458 vertices, 12,654 faces). Alternative segments preserved in `candidates/`.
- **RCA (Right Coronary Artery):** `MM439_BP51977_FMA3802_Trunk of right coronary artery.obj` selected as canonical `rca.obj` (88.2 KB, 795 vertices, 1,402 faces). Alternative segments and branches preserved in `candidates/`.

## Companion Materials and Textures

- **Material Files (.mtl):** None referenced or present in source files. All source assets are geometry-only OBJ files.
- **Texture Files (.png/.jpg):** None referenced or present in source files.

## Alternative Candidates Directory (`candidates/`)

All alternative segments, branch vessels, and related anatomical structures are preserved in `selected_models/candidates/` with unique filenames. Source files in `models/` remain completely untouched.
