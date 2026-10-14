# CardioSight — 3D Visualization Repair & Browser Verification Report

**Date:** October 14, 2026  
**Auditor / Engineer:** Senior Three.js/WebGL Engineer & QA Automation Lead  
**Status:** **PASS**  

---

## 1. Executive Summary & Root Cause Analysis

### Identified Root Cause
The initial application build completed successfully, but the 3D coronary artery models (`LAD`, `LCX`, `RCA`) were not visible in the WebGL canvas. A rigorous inspection of the Three.js scene graph matrix transformation pipeline revealed the precise mathematical root cause:

1. **Matrix Transformation Order Bug in Three.js Scene Graph:**
   - The canonical BodyParts3D OBJ meshes (`lad.obj`, `lcx.obj`, `rca.obj`) share an origin with the human body scan:
     - Bounding box center: $(X=17.29, Y=-117.76, Z=1218.52)$.
     - Mesh dimensions: $68.14 \times 71.48 \times 59.15\text{ mm}$.
   - The original code in `CoronaryScene.tsx` computed the combined center `combinedCenter` and executed:
     ```ts
     rootGroup.position.set(-combinedCenter.x, -combinedCenter.y, -combinedCenter.z);
     rootGroup.rotation.x = -Math.PI / 2;
     ```
   - In Three.js, an `Object3D` evaluates its local transform in the strict mathematical order: **Scale $\to$ Rotation $\to$ Translation** (`matrix = T * R * S`).
   - Consequently, child vertices at $Z \approx 1218.5$ were **first rotated** by $-90^\circ$ around the uncentered world X-axis:
     $$Y_{\text{rot}} = Z_{\text{raw}} \cdot \sin(90^\circ) \approx +1218.52$$
     $$Z_{\text{rot}} = -Y_{\text{raw}} = -(-117.76) \approx +117.76$$
   - And **then translated** by `position`:
     $$Y_{\text{final}} = Y_{\text{rot}} + (-combinedCenter.y) = 1218.52 + 117.76 = +1336.28$$
     $$Z_{\text{final}} = Z_{\text{rot}} + (-combinedCenter.z) = 117.76 - 1218.52 = -1100.76$$
   - Result: The geometry was displaced to $(X=0, Y=+1336.28, Z=-1100.76)$, over $1,700\text{ units}$ away from the camera looking at $(0, 0, 0)$ with a far clipping plane of $1000$. The models were completely outside the camera frustum and clipped out of existence.

2. **React Lifecycle & Scene Rebuild Cycle:**
   - In `CoronaryScene.tsx`, the main Three.js initialization `useEffect` listed `vessels` in its dependency array.
   - Every time prediction data was updated or parent state re-rendered, the entire WebGL renderer and scene were destroyed and rebuilt, causing state desynchronization.

3. **Material Culling & Winding:**
   - Raw medical meshes can contain varying surface polygon winding. Without `side: THREE.DoubleSide`, backfaces could be culled depending on view angle.

---

## 2. Engineering Solution & Implementation

### A. Two-Tier Hierarchical Pivot Grouping (`CoronaryScene.tsx`)
Implemented a robust two-tier hierarchy to ensure centering occurs **before** anatomical orientation:
```
scene
 └── rootGroup (position: (0,0,0), rotation.x = -Math.PI / 2)
      └── vesselGroup (position: (-cx, -cy, -cz))
           ├── LAD mesh (lad.obj)
           ├── LCX mesh (lcx.obj)
           └── RCA mesh (rca.obj)
```
- In `vesselGroup` local space, child vertices are translated by $-\text{combinedCenter}$, moving the anatomical center to $(0, 0, 0)$.
- `rootGroup` rotates around its local $(0, 0, 0)$, perfectly maintaining the anatomical center at world origin $(0, 0, 0)$.
- Anatomical orientation maps BodyParts3D axes to standard clinical anterior view:
  - Superior (base of heart, $+Z_{bp}$) $\to$ Up ($+Y$ in Three.js).
  - Anterior (front of heart, $-Y_{bp}$) $\to$ Front ($+Z$ in Three.js facing camera).
  - Patient Left ($+X_{bp}$) $\to$ Screen Right ($+X$ in Three.js).

### B. Optimal Camera Framing & Viewport Sizing
- Camera vertical FOV is $45^\circ$. For a $71.5\text{ mm}$ anatomical model:
  $$\text{optimalDistance} = \frac{\text{maxDim} / 2}{\tan(22.5^\circ)} \times 1.85 \approx 160\text{ units}$$
- Camera set to `(0, 0, 150)` with `controls.target = (0, 0, 0)`.
- Near/Far clipping planes configured to `near: 0.5`, `far: 2000`, guaranteeing zero clipping.
- Added a `ResizeObserver` on the container to dynamically handle responsive canvas resizing.

### C. Material Rendering & DoubleSide Configuration
- Configured `THREE.DoubleSide` on all `MeshStandardMaterial` instances.
- Refactored `useEffect` lifecycle: scene initialization and asset loading run **once on mount**, while dynamic prediction color updates occur in-place via a separate lightweight effect without teardown.

---

## 3. Real Browser Verification Evidence

Testing was conducted using real browser automation against the live application at `http://localhost:3000`:

1. **Neutral Preview Mode (Mode A):**
   - **Visual Proof:** [`neutral_preview_mode_a_centered_1791964793534.png`](file:///C:/Users/sanja/.gemini/antigravity-ide/brain/3dec08cd-cfdd-48cc-8076-1abf2e9d551d/neutral_preview_mode_a_centered_1791964793534.png)
   - Verified that all three coronary branches (`LAD`, `LCX`, `RCA`) are rendered in neutral silver preview shading in the exact center of the 3D viewport.
   - All three interactive floating 3D badges (`LAD`, `LCX`, `RCA`) are positioned accurately over their corresponding anatomical vessels.

2. **Prediction-Aware Mode (Mode B):**
   - **Visual Proof:** [`prediction_aware_mode_b_centered_1791965098798.png`](file:///C:/Users/sanja/.gemini/antigravity-ide/brain/3dec08cd-cfdd-48cc-8076-1abf2e9d551d/prediction_aware_mode_b_centered_1791965098798.png)
   - Tested Synthetic Profile Alpha (Elevated Risk).
   - The status bar dynamically transitions to `Mode B: Real ML Model Predictions Active`.
   - Vessel colors update instantaneously based on real model probability scores:
     - `LAD` (77.2% Model Probability) renders in **crimson red** with floating badge `LAD 77%`.
     - `LCX` (51.2% Model Probability) renders in **amber/yellow** with floating badge `LCX 51%`.
     - `RCA` (50.3% Model Probability) renders in **amber/yellow** with floating badge `RCA 50%`.

3. **Interaction & Vessel Selection:**
   - Clicking either the 3D mesh or the floating label activates the focused vessel state.
   - Selected vessel glows with emissive illumination and populates the `VesselDetails` panel with anatomical metadata and pipeline description.

---

## 4. Regression & Build Verification Results

| Suite / Check | Command | Result | Status |
| :--- | :--- | :---: | :---: |
| **Backend Tests** | `python -m pytest tests -v` | **23 passed** | **PASS** |
| **Frontend Tests** | `npm test` | **15 passed** | **PASS** |
| **Type Checking** | `npx tsc --noEmit` | **0 errors** | **PASS** |
| **Production Build** | `npm run build` | **4/4 pages static** | **PASS** |
| **Model Artifacts** | SHA-256 Hash Check (8 files) | **100% match** | **PASS** |

---

## 5. Artifact Integrity Preservation

All 8 model, schema, metadata, and SHAP artifacts were re-verified:

| Artifact | SHA-256 Hash | Size | Status |
| :--- | :--- | :---: | :---: |
| `backend/artifacts/cath_pipeline.joblib` | `7b2054a3e8c2696990a64ffd9994f0d931829ab17dca200aa748a5e65d61d3c8` | 12,471 B | UNTOUCHED |
| `backend/artifacts/lad_pipeline.joblib` | `10e4feba6f32d6c225513bfe296dac7d803cb8a60dd2bbc7d335db4a3c655acf` | 351,944 B | UNTOUCHED |
| `backend/artifacts/lcx_pipeline.joblib` | `2708c395af9b402d0e7a6571d37a1186127d4fcc15d515556af08217cb595198` | 348,744 B | UNTOUCHED |
| `backend/artifacts/rca_pipeline.joblib` | `a05270650eae0d4c9ad5c1db6504b0a4bfacce8e90562654080cee5b5a251d53` | 12,471 B | UNTOUCHED |
| `backend/artifacts/metrics.json` | `effb7faa777d257a71e25c7b9e0831b5a9a0edb163c9de6f09b85a6048499682` | 23,058 B | UNTOUCHED |
| `backend/artifacts/feature_schema.json` | `19034a1468a125424cb321026e7c6e937f022d39ae8557033ffc010724ee0ca6` | 8,807 B | UNTOUCHED |
| `backend/artifacts/training_metadata.json` | `0c6a52413c147d43d0d9312c79e2257330174089025b686c3e35035cec47c9e2` | 765 B | UNTOUCHED |
| `backend/artifacts/global_shap_importance.json` | `79d643b9e651696341d9461e62946db679f9c5cdda9dfce16940fd72f52185c6` | 32,334 B | UNTOUCHED |

---

## 6. Windows Launcher (`launch_cardiosight.bat`)

Created Windows batch script at project root:
- Automatically detects Python 3.10+ and Node.js/npm in system PATH or project virtual environments (`.venv`, `venv`, `env`).
- Checks for existence of `backend/` and `frontend/node_modules/`.
- Inspects ports 8000 and 3000, gracefully notifying the user if either port is already occupied.
- Spawns the FastAPI backend (`python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`) and Next.js frontend (`npm run dev`) in separate persistent terminal windows so logs remain readable.
- Displays clear access URLs and instructions on how to gracefully terminate the application.
