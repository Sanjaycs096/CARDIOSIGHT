'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VesselId, VesselVisualizationData } from '../../types/prediction';

interface CoronarySceneProps {
  vessels: Record<VesselId, VesselVisualizationData>;
  selectedVessel: VesselId | null;
  onSelectVessel: (vessel: VesselId | null) => void;
  onLoadingProgress: (loaded: number, total: number) => void;
  onLoadComplete: (success: boolean, error?: string) => void;
  autoRotate: boolean;
  resetSignal: number;
  zoomSignal: 'in' | 'out' | null;
}

interface LoadedVesselMesh {
  id: VesselId;
  group: THREE.Group;
  rawCenter: THREE.Vector3;
  localCenter: THREE.Vector3;
  materials: THREE.MeshStandardMaterial[];
}

export const CoronaryScene: React.FC<CoronarySceneProps> = ({
  vessels,
  selectedVessel,
  onSelectVessel,
  onLoadingProgress,
  onLoadComplete,
  autoRotate,
  resetSignal,
  zoomSignal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const vesselGroupRef = useRef<THREE.Group | null>(null);
  const loadedMeshesRef = useRef<Map<VesselId, LoadedVesselMesh>>(new Map());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const pointerRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Stable refs for props to avoid teardown cycles
  const vesselsRef = useRef(vessels);
  vesselsRef.current = vessels;
  const onLoadCompleteRef = useRef(onLoadComplete);
  onLoadCompleteRef.current = onLoadComplete;
  const onLoadingProgressRef = useRef(onLoadingProgress);
  onLoadingProgressRef.current = onLoadingProgress;

  const [hoveredVessel, setHoveredVessel] = useState<VesselId | null>(null);
  const [labelCoords, setLabelCoords] = useState<
    Array<{ id: VesselId; x: number; y: number; visible: boolean }>
  >([]);

  // Default optimal camera parameters: centered at Y=0 with ample framing distance
  const initialCamPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 150));
  const initialCamTarget = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // Initialize Three.js scene (Runs ONCE on mount)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera with suitable clipping planes (0.5 to 2000)
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 2000);
    camera.position.copy(initialCamPos.current);
    cameraRef.current = camera;

    // 3. Renderer with antialiasing and high pixel ratio
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (e) {
      onLoadCompleteRef.current(false, `WebGL initialization failed: ${e instanceof Error ? e.message : 'Unknown'}`);
      return;
    }

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 25;
    controls.maxDistance = 350;
    controls.target.copy(initialCamTarget.current);
    controlsRef.current = controls;

    // 5. Lighting: Balanced clinical scientific illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight1.position.set(60, 100, 80);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00e5ff, 1.0);
    dirLight2.position.set(-80, -40, -60);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xff3366, 0.8);
    dirLight3.position.set(0, -80, 50);
    scene.add(dirLight3);

    // 6. Two-tier Hierarchy for Correct Centering & Anatomical Orientation:
    // rootGroup (positioned at 0,0,0, rotated to anterior view)
    //   └── vesselGroup (translated by -combinedCenter to center raw BodyParts3D coordinates at local 0,0,0)
    //         ├── LAD mesh
    //         ├── LCX mesh
    //         └── RCA mesh
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    rootGroupRef.current = rootGroup;

    const vesselGroup = new THREE.Group();
    rootGroup.add(vesselGroup);
    vesselGroupRef.current = vesselGroup;

    // 7. Load canonical OBJ models
    const objLoader = new OBJLoader();
    const vesselList: VesselId[] = ['LAD', 'LCX', 'RCA'];
    let loadedCount = 0;

    vesselList.forEach((id) => {
      const vData = vesselsRef.current[id] || { modelFile: `/models/${id.toLowerCase()}.obj`, colorHex: '#94a3b8' };
      objLoader.load(
        vData.modelFile,
        (obj) => {
          // Compute bounding box for this individual mesh in its local coordinate space
          const meshBox = new THREE.Box3().setFromObject(obj);
          const rawCenter = new THREE.Vector3();
          meshBox.getCenter(rawCenter);

          // Apply high-fidelity material to all mesh children with DoubleSide
          const materials: THREE.MeshStandardMaterial[] = [];
          obj.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              const currentVData = vesselsRef.current[id];
              const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(currentVData ? currentVData.colorHex : '#94a3b8'),
                roughness: 0.35,
                metalness: 0.15,
                side: THREE.DoubleSide,
                emissive: new THREE.Color(0x000000),
                emissiveIntensity: 0.0,
              });
              mesh.material = mat;
              materials.push(mat);
              mesh.userData = { vesselId: id };
            }
          });

          obj.userData = { vesselId: id };
          vesselGroup.add(obj);

          loadedMeshesRef.current.set(id, {
            id,
            group: obj,
            rawCenter,
            localCenter: rawCenter.clone(),
            materials,
          });

          loadedCount += 1;
          onLoadingProgressRef.current(loadedCount, vesselList.length);

          // Once all 3 vessels are loaded, compute combined anatomical bounds and frame camera
          if (loadedCount === vesselList.length) {
            const combinedBox = new THREE.Box3().setFromObject(vesselGroup);
            const combinedCenter = new THREE.Vector3();
            combinedBox.getCenter(combinedCenter);

            // Shift vesselGroup so anatomical center is at (0, 0, 0) relative to rootGroup
            vesselGroup.position.set(-combinedCenter.x, -combinedCenter.y, -combinedCenter.z);

            // Orient model naturally for anatomical viewing (anterior view)
            // BodyParts3D orientation: Y is posterior/anterior (-Y is anterior), Z is superior/inferior (+Z is superior).
            // Rotating around X axis by -Math.PI / 2 maps:
            // Superior (+Z) -> Up (+Y in Three.js)
            // Anterior (-Y) -> Front (+Z in Three.js facing camera)
            // Patient Left (+X) -> Screen Right (+X in Three.js)
            rootGroup.rotation.x = -Math.PI / 2;
            rootGroup.position.set(0, 0, 0);
            rootGroup.updateMatrixWorld(true);

            // Cache local centers relative to rootGroup for 2D label tracking
            loadedMeshesRef.current.forEach((item) => {
              item.localCenter = item.rawCenter.clone().sub(combinedCenter);
            });

            // Frame camera comfortably based on actual geometry dimensions
            const worldBox = new THREE.Box3().setFromObject(rootGroup);
            const worldSize = new THREE.Vector3();
            worldBox.getSize(worldSize);
            const maxDim = Math.max(worldSize.x, worldSize.y, worldSize.z, 60);

            const fovRad = camera.fov * (Math.PI / 180);
            const optimalDistance = Math.round((maxDim / 2) / Math.tan(fovRad / 2) * 1.85);

            initialCamPos.current.set(0, 0, Math.max(145, optimalDistance));
            initialCamTarget.current.set(0, 0, 0);

            camera.position.copy(initialCamPos.current);
            controls.target.copy(initialCamTarget.current);
            controls.update();

            onLoadCompleteRef.current(true);
          }
        },
        undefined,
        (err) => {
          console.error(`Error loading canonical model for ${id}:`, err);
          onLoadCompleteRef.current(false, `Failed to load canonical mesh: ${vData.modelFile}`);
        }
      );
    });

    // 8. Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      // Update 2D screen positions for floating artery labels
      if (cameraRef.current && rootGroupRef.current && containerRef.current) {
        const cam = cameraRef.current;
        const cont = containerRef.current;
        const w = cont.clientWidth;
        const h = cont.clientHeight;

        if (w > 0 && h > 0) {
          const coords: Array<{ id: VesselId; x: number; y: number; visible: boolean }> = [];

          loadedMeshesRef.current.forEach((item, vid) => {
            const worldPos = item.localCenter.clone();
            worldPos.applyMatrix4(rootGroupRef.current!.matrixWorld);
            worldPos.project(cam);

            // Check if within visible frustum and in front of camera
            const isVisible = worldPos.z > -1.0 && worldPos.z < 1.0;
            const x = (worldPos.x * 0.5 + 0.5) * w;
            const y = (-(worldPos.y * 0.5) + 0.5) * h;

            coords.push({
              id: vid,
              x,
              y,
              visible: isVisible,
            });
          });

          setLabelCoords(coords);
        }
      }
    };
    animate();

    // 9. ResizeObserver and window listener for rock-solid responsive sizing
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      if (newW === 0 || newH === 0) return;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 10. Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();

      // Dispose loaded meshes
      loadedMeshesRef.current.forEach((item) => {
        item.group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material?.dispose();
            }
          }
        });
      });
      loadedMeshesRef.current.clear();

      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update materials smoothly when vessels prop or selection/hover changes (WITHOUT reloading scene)
  useEffect(() => {
    loadedMeshesRef.current.forEach((item, vid) => {
      const vData = vessels[vid];
      if (!vData) return;
      const isSelected = selectedVessel === vid;
      const isHovered = hoveredVessel === vid;

      const baseColor = new THREE.Color(vData.colorHex);

      item.materials.forEach((mat) => {
        mat.color.copy(baseColor);

        if (isSelected) {
          mat.emissive.copy(baseColor);
          mat.emissiveIntensity = 0.5;
          mat.roughness = 0.2;
        } else if (isHovered) {
          mat.emissive.set(0xffffff);
          mat.emissiveIntensity = 0.25;
          mat.roughness = 0.25;
        } else {
          mat.emissive.set(0x000000);
          mat.emissiveIntensity = 0.0;
          mat.roughness = 0.35;
        }
      });
    });
  }, [vessels, selectedVessel, hoveredVessel]);

  // Auto-rotate controls update
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      controlsRef.current.autoRotateSpeed = 1.5;
    }
  }, [autoRotate]);

  // Reset Camera action
  useEffect(() => {
    if (resetSignal > 0 && cameraRef.current && controlsRef.current) {
      cameraRef.current.position.copy(initialCamPos.current);
      controlsRef.current.target.copy(initialCamTarget.current);
      controlsRef.current.update();
    }
  }, [resetSignal]);

  // Zoom +/- action
  useEffect(() => {
    if (!zoomSignal || !cameraRef.current || !controlsRef.current) return;
    const factor = zoomSignal === 'in' ? 0.82 : 1.22;
    cameraRef.current.position.multiplyScalar(factor);
    controlsRef.current.update();
  }, [zoomSignal]);

  // Raycasting for pointer interaction & mesh selection
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      const camera = cameraRef.current;
      const rootGroup = rootGroupRef.current;
      if (!container || !camera || !rootGroup) return;

      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      pointerRef.current.set(x, y);
      raycasterRef.current.setFromCamera(pointerRef.current, camera);

      const intersects = raycasterRef.current.intersectObjects(rootGroup.children, true);
      if (intersects.length > 0) {
        let currentObj: THREE.Object3D | null = intersects[0].object;
        let foundId: VesselId | null = null;
        while (currentObj && currentObj !== rootGroup) {
          if (currentObj.userData?.vesselId) {
            foundId = currentObj.userData.vesselId as VesselId;
            break;
          }
          currentObj = currentObj.parent;
        }
        setHoveredVessel(foundId);
        container.style.cursor = foundId ? 'pointer' : 'default';
      } else {
        setHoveredVessel(null);
        container.style.cursor = 'default';
      }
    },
    []
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      const camera = cameraRef.current;
      const rootGroup = rootGroupRef.current;
      if (!container || !camera || !rootGroup) return;

      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      pointerRef.current.set(x, y);
      raycasterRef.current.setFromCamera(pointerRef.current, camera);

      const intersects = raycasterRef.current.intersectObjects(rootGroup.children, true);
      if (intersects.length > 0) {
        let currentObj: THREE.Object3D | null = intersects[0].object;
        let foundId: VesselId | null = null;
        while (currentObj && currentObj !== rootGroup) {
          if (currentObj.userData?.vesselId) {
            foundId = currentObj.userData.vesselId as VesselId;
            break;
          }
          currentObj = currentObj.parent;
        }
        if (foundId) {
          onSelectVessel(selectedVessel === foundId ? null : foundId);
        }
      }
    },
    [onSelectVessel, selectedVessel]
  );

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '440px',
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      {/* 2D Interactive Vessel Labels Floating in 3D Space */}
      {labelCoords.map((lbl) => {
        if (!lbl.visible) return null;
        const vData = vessels[lbl.id];
        if (!vData) return null;
        const isSelected = selectedVessel === lbl.id;
        const isHovered = hoveredVessel === lbl.id;

        return (
          <button
            key={lbl.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectVessel(selectedVessel === lbl.id ? null : lbl.id);
            }}
            style={{
              position: 'absolute',
              left: `${lbl.x}px`,
              top: `${lbl.y}px`,
              transform: 'translate(-50%, -100%) translateY(-10px)',
              pointerEvents: 'auto',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: isSelected
                ? 'rgba(0, 229, 255, 0.95)'
                : isHovered
                ? 'rgba(30, 41, 59, 0.95)'
                : 'rgba(15, 23, 42, 0.85)',
              color: isSelected ? '#080b11' : '#ffffff',
              border: `1.5px solid ${vData.colorHex}`,
              boxShadow: `0 2px 10px rgba(0, 0, 0, 0.5), 0 0 10px ${vData.colorHex}66`,
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 10,
              cursor: 'pointer',
              transition: 'transform 0.15s ease, background-color 0.15s ease',
            }}
            aria-label={`Focus ${lbl.id}`}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: vData.colorHex,
              }}
            />
            <span>{lbl.id}</span>
            {vData.probability !== null && (
              <span
                style={{
                  color: isSelected ? '#080b11' : vData.colorHex,
                  fontWeight: 800,
                  fontSize: '10px',
                }}
              >
                {(vData.probability * 100).toFixed(0)}%
              </span>
            )}
          </button>
        );
      })}

      {/* Subtle interaction watermark / guide */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '14px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          backgroundColor: 'rgba(8, 11, 17, 0.75)',
          padding: '4px 8px',
          borderRadius: '6px',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        Left Click: Orbit • Right Click: Pan • Scroll: Zoom • Click Vessel: Inspect
      </div>
    </div>
  );
};
