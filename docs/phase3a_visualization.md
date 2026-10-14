# CardioSight — Phase 3A: Interactive 3D Coronary Artery Visualization

## 1. Overview and Architecture

Phase 3A introduces the interactive 3D coronary artery visualization layer for CardioSight. It builds directly on top of the Phase 1 anatomical foundation and Phase 2 leakage-safe machine learning pipelines.

The 3D visualization layer is architected as a modular, client-safe component system integrated into the existing Next.js 16 (Turbopack) frontend:

```mermaid
graph TD
    A[Next.js App Router Page: src/app/page.tsx] --> B[CoronaryViewer Container: src/components/3d/CoronaryViewer.tsx]
    B --> C[CoronaryScene: src/components/3d/CoronaryScene.tsx (Three.js WebGL)]
    B --> D[SceneControls: Orbit / Zoom / Reset / Focus]
    B --> E[VesselLegend: Visual Probability Legend]
    B --> F[VesselDetails: Selected Vessel Prediction Metrics]
    B --> G[VisualizationStatus: Mode A Preview vs Mode B Live ML]
    H[FastAPI Backend: POST /api/predict] -.->|PredictionResponse| A
    I[Public Static Assets: /models/*.obj] -->|OBJLoader| C
```

### Component Structure and Responsibilities

- **`CoronaryViewer` ([frontend/src/components/3d/CoronaryViewer.tsx](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/frontend/src/components/3d/CoronaryViewer.tsx)):** Top-level wrapper managing dynamic client-only loading (`ssr: false`), WebGL hardware detection, error boundaries, and state coordination.
- **`CoronaryScene` ([frontend/src/components/3d/CoronaryScene.tsx](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/frontend/src/components/3d/CoronaryScene.tsx)):** Three.js WebGL scene owning camera framing, OrbitControls, directional/ambient lighting, OBJ mesh loading, bounds centering, raycaster pointer selection, and 2D floating screen-space labels.
- **`SceneControls` ([frontend/src/components/3d/SceneControls.tsx](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/frontend/src/components/3d/SceneControls.tsx)):** Unobtrusive control panel supporting Camera Reset, Zoom In/Out (+/-), Turntable Auto-Rotate, and single-click focus filters for LAD, LCX, RCA, or All Vessels.
- **`VesselLegend` ([frontend/src/components/3d/VesselLegend.tsx](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/frontend/src/components/3d/VesselLegend.tsx)):** Explains the color bands (Preview, <40%, 40%–60%, >60%) and provides educational disclaimer context.
- **`VesselDetails` ([frontend/src/components/3d/VesselDetails.tsx](file:///c:/Users/sanley/project/CONTEST/DEVPOST/Cardiosight/frontend/src/components/3d/VesselDetails.tsx)):** Displays the selected artery's target name, canonical asset path, positive probability, binary classification label, and model type. Crucially isolates the `Cath` overall CAD prediction at patient level.
- **`VisualizationStatus` ([frontend/src/components/3d/VisualizationStatus.tsx](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/frontend/src/components/3d/VisualizationStatus.tsx)):** Communicates Mode A vs Mode B status, mesh loading progress, and WebGL/file alerts.
- **`vesselMapping` ([frontend/src/utils/vesselMapping.ts](file:///c:/Users/sanja/project/CONTEST/DEVPOST/Cardiosight/frontend/src/utils/vesselMapping.ts)):** Pure functional mapping library validating probability numbers, assigning color bands, and mapping API prediction targets to vessel meshes.

---

## 2. Anatomical Mesh Assets and Loading

### Source and Canonical Files

All canonical arterial meshes are sourced directly from the BodyParts3D open anatomical dataset staged in Phase 1:

| Vessel | Canonical Asset | File Size | Source FMA Component |
| :--- | :--- | :--- | :--- |
| **LAD** | `/models/lad.obj` | 67,711 bytes | MM424_BP51969_FMA74912 (Trunk of anterior interventricular branch of LCA) |
| **LCX** | `/models/lcx.obj` | 787,422 bytes | MM635_BP51973_FMA74923 (Trunk of circumflex branch of LCA) |
| **RCA** | `/models/rca.obj` | 88,232 bytes | MM439_BP51977_FMA3802 (Trunk of right coronary artery) |

### Asset Path and Serving

Canonical assets were deployed from `selected_models/` to `frontend/public/models/`. Next.js serves them at `/models/lad.obj`, `/models/lcx.obj`, and `/models/rca.obj`.
HTTP verification confirms all three files return `HTTP 200` with exact byte counts.

### Coordinate Space and Centering

The three meshes originate from the BodyParts3D thoracic coordinate system. Their coordinate bounds in millimeters are:
- **LAD:** $X \in [42.96, 51.36]$, $Y \in [-153.50, -135.52]$, $Z \in [1232.76, 1248.09]$
- **LCX:** $X \in [12.23, 43.86]$, $Y \in [-104.99, -82.02]$, $Z \in [1188.94, 1235.18]$
- **RCA:** $X \in [-16.78, 0.27]$, $Y \in [-146.06, -124.14]$, $Z \in [1193.92, 1205.60]$

Because they share the same global BodyParts3D reference frame, their relative spatial positions are naturally aligned. `CoronaryScene` computes the collective bounding box across all three meshes and centers the group at the scene origin $(0, 0, 0)$ without altering any vessel's true geometry or fabricating artificial bridges.

---

## 3. Prediction Visualization Contract

The visualization strictly enforces the two operating modes specified in Phase 3A:

### Mode A — Geometry Preview

- Activated when no patient inference payload is supplied or when the user resets the view.
- All three vessels are rendered using neutral slate materials (`#94a3b8`).
- Displays: `"Mode A: Geometry Preview Mode — No prediction data loaded"`.
- Numerical probabilities are replaced with `— (Preview)`. No fabricated probabilities or false risk classifications are ever displayed.

### Mode B — Live Model Risk Inference

- Activated when genuine prediction results from `POST /api/predict` are supplied.
- Maps API targets to vessels strictly one-to-one:
  - **LAD Mesh** $\longleftrightarrow$ `LAD` target (`positive_probability`)
  - **LCX Mesh** $\longleftrightarrow$ `LCX` target (`positive_probability`)
  - **RCA Mesh** $\longleftrightarrow$ `RCA` target (`positive_probability`)
- **Isolation of Cath Target:** The `Cath` target represents overall Coronary Artery Disease ($>50\%$ stenosis in any vessel). As mandated, `Cath` is **strictly excluded** from individual artery mesh mapping and is displayed in its own patient-level summary banner.

### Probability Validation

All incoming probabilities must be finite numbers within the inclusive interval $[0.0, 1.0]$. If any required vessel target is missing, out-of-range, or malformed, `vesselMapping` safely reverts the entire visualization to Mode A neutral preview and displays an informative validation notice.

### Color Encoding Bands

Probability values are visualized according to clear, configurable bands:

| Band Category | Probability Range | Color Hex | Visual Purpose |
| :--- | :--- | :--- | :--- |
| **Neutral Preview** | Unassigned / Null | `#94a3b8` | Geometry preview without prediction |
| **Cool / Neutral Band** | $< 0.40$ ($<40\%$) | `#38bdf8` | Lower model-estimated score |
| **Intermediate Amber Band** | $0.40 - 0.60$ ($40\%–60\%$) | `#f59e0b` | Intermediate model-estimated score |
| **Warm Crimson Band** | $> 0.60$ ($>60\%$) | `#ff3366` | Elevated model-estimated score |

> [!IMPORTANT]
> **Educational Notice:** Color bands represent experimental model probability estimates for the positive class (stenotic vessel outcome). They do not represent clinically validated risk tiers, diagnostic truth, or medical severity categories. Numerical model outputs are always displayed alongside color indicators.

---

## 4. Verification and Test Results

### 1. Frontend Unit Tests (vesselMapping Contract)
```bash
npm test
```
**Result:**
```
✔ 1. isValidProbability accepts valid finite numbers in [0.0, 1.0]
✔ 2. getProbabilityColor maps probabilities to correct color bands
✔ 3. mapPredictionToVessels returns neutral preview when response is null
✔ 4. mapPredictionToVessels maps targets correctly when valid PredictionResponse is supplied
✔ 5. mapPredictionToVessels handles incomplete predictions gracefully
✔ 6. mapPredictionToVessels handles invalid/out-of-range probabilities gracefully
✔ 7. Canonical OBJ file paths and metadata are valid
ℹ tests 7 | pass 7 | fail 0 (464ms)
```

### 2. Frontend Production Build
```bash
npm run build
```
**Result:** Next.js 16.4.0 (Turbopack) compiled successfully in 603ms. TypeScript passed with 0 errors. Prerendered static pages smoothly.

### 3. Backend Regression Tests
```bash
python -m pytest tests -v
```
**Result:** 14 passed in 3.46s (all Phase 2 API endpoints, safeguards, and pipelines 100% passing).

### 4. HTTP Static Asset Verification
```bash
python scratch/verify_http_assets.py
```
**Result:**
- `GET / -> HTTP 200 (40,385 bytes)`
- `GET /models/lad.obj -> HTTP 200 (67,711 bytes)`
- `GET /models/lcx.obj -> HTTP 200 (787,422 bytes)`
- `GET /models/rca.obj -> HTTP 200 (88,232 bytes)`

### 5. Live Inference API Integration
```bash
POST http://127.0.0.1:8000/api/predict
```
**Result:** Returned HTTP 200 with complete `PredictionResponse`:
- `Cath`: 0.9626 (`CAD`, LogisticRegression)
- `LAD`: 0.7720 (`Stenotic`, RandomForestClassifier) $\rightarrow$ mapped to LAD
- `LCX`: 0.5116 (`Stenotic`, RandomForestClassifier) $\rightarrow$ mapped to LCX
- `RCA`: 0.5031 (`Stenotic`, LogisticRegression) $\rightarrow$ mapped to RCA

---

## 5. Known Anatomical Limitations

1. **Whole-Heart Base Mesh Absence:** The 188 source OBJ files discovered in BodyParts3D contain regional cardiac components but lack a unified, verified whole-heart organ mesh. As mandated by safety guidelines, no synthetic whole-heart mesh was fabricated. The visualization renders the isolated arterial tree.
2. **Trunk Segments:** The canonical assets represent the primary trunk segments of the LAD, LCX, and RCA. Distal branches and microvascular beds are not modeled.
3. **Non-Clinical Prototype:** CardioSight is an educational prototype. Model outputs are machine-learning probability estimates and must never be used for diagnosis or treatment.
