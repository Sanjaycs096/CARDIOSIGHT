'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  VesselId,
  PredictionResponse,
  ColorBandConfig,
} from '../../types/prediction';
import {
  mapPredictionToVessels,
  DEFAULT_COLOR_CONFIG,
} from '../../utils/vesselMapping';
import { VisualizationStatus } from './VisualizationStatus';
import { SceneControls } from './SceneControls';
import { VesselLegend } from './VesselLegend';
import { VesselDetails } from './VesselDetails';

// Dynamically import Three.js scene with ssr: false to prevent SSR canvas errors
const CoronaryScene = dynamic(
  () => import('./CoronaryScene').then((mod) => mod.CoronaryScene),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: '480px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 20, 34, 0.4)',
          borderRadius: '16px',
          color: 'var(--text-secondary)',
          gap: '12px',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: '2px solid var(--accent-cyan)',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite',
          }}
        />
        <span>Initializing 3D WebGL Engine...</span>
      </div>
    ),
  }
);

interface CoronaryViewerProps {
  predictionResponse?: PredictionResponse | null;
  colorConfig?: ColorBandConfig;
}

export const CoronaryViewer: React.FC<CoronaryViewerProps> = ({
  predictionResponse = null,
  colorConfig = DEFAULT_COLOR_CONFIG,
}) => {
  const [selectedVessel, setSelectedVessel] = useState<VesselId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedCount, setLoadedCount] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [zoomSignal, setZoomSignal] = useState<'in' | 'out' | null>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  // Check WebGL availability
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        setLoadError('WebGL is not supported or disabled in your browser.');
      }
    } catch {
      setWebglSupported(false);
      setLoadError('WebGL detection failed.');
    }
  }, []);

  // Compute mapped vessel visualization data
  const mappingResult = useMemo(
    () => mapPredictionToVessels(predictionResponse, colorConfig),
    [predictionResponse, colorConfig]
  );

  const handleLoadingProgress = useCallback((loaded: number) => {
    setLoadedCount(loaded);
  }, []);

  const handleLoadComplete = useCallback((success: boolean, error?: string) => {
    setIsLoading(false);
    if (!success && error) {
      setLoadError(error);
    }
  }, []);

  const handleResetCamera = useCallback(() => {
    setResetSignal((prev) => prev + 1);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomSignal('in');
    setTimeout(() => setZoomSignal(null), 100);
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomSignal('out');
    setTimeout(() => setZoomSignal(null), 100);
  }, []);

  const handleToggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => !prev);
  }, []);

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        marginBottom: '32px',
      }}
      aria-label="3D Coronary Artery Digital Twin Visualization"
    >
      {/* Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '12px',
                backgroundColor: 'rgba(0, 229, 255, 0.15)',
                color: 'var(--accent-cyan)',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              Phase 3A • 3D Anatomical Twin
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              BodyParts3D Canonical Geometry
            </span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
            Interactive 3D Coronary Artery Visualization
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '780px', marginTop: '4px' }}>
            Explore canonical high-resolution coronary arterial geometry for the Left Anterior Descending (LAD),
            Left Circumflex (LCX), and Right Coronary Artery (RCA). Orbit, pan, and inspect individual vessels.
          </p>
        </div>
      </div>

      {/* Status Bar */}
      <VisualizationStatus
        isLoading={isLoading}
        isPredictionActive={mappingResult.isPredictionActive}
        validationError={mappingResult.validationError}
        loadError={loadError}
        loadedVesselsCount={loadedCount}
        totalVesselsCount={3}
      />

      {/* Main 3D Viewport Area */}
      <div
        style={{
          position: 'relative',
          backgroundColor: 'rgba(10, 14, 24, 0.75)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(0, 229, 255, 0.02)',
        }}
      >
        {/* Subtle grid backdrop */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 50% 50%, rgba(0, 229, 255, 0.03) 0%, transparent 60%), linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
            backgroundSize: '100% 100%, 30px 30px, 30px 30px',
            pointerEvents: 'none',
          }}
        />

        {/* Top Controls Bar */}
        <div style={{ position: 'relative', zIndex: 10, padding: '16px 16px 0 16px' }}>
          <SceneControls
            selectedVessel={selectedVessel}
            onSelectVessel={setSelectedVessel}
            onResetCamera={handleResetCamera}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            isAutoRotate={autoRotate}
            onToggleAutoRotate={handleToggleAutoRotate}
          />
        </div>

        {/* 3D Canvas or WebGL fallback */}
        <div style={{ width: '100%', height: '520px', position: 'relative' }}>
          {webglSupported ? (
            <CoronaryScene
              vessels={mappingResult.vessels}
              selectedVessel={selectedVessel}
              onSelectVessel={setSelectedVessel}
              onLoadingProgress={handleLoadingProgress}
              onLoadComplete={handleLoadComplete}
              autoRotate={autoRotate}
              resetSignal={resetSignal}
              zoomSignal={zoomSignal}
            />
          ) : (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                gap: '8px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '32px' }}>🖥️</span>
              <strong style={{ color: 'var(--text-primary)' }}>WebGL Acceleration Unavailable</strong>
              <p style={{ maxWidth: '400px', fontSize: '13px' }}>
                Your browser or device does not have hardware-accelerated WebGL enabled.
                Please ensure graphics drivers and WebGL permissions are active.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Legend & Selected Vessel Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        <VesselLegend
          config={colorConfig}
          isPredictionActive={mappingResult.isPredictionActive}
        />
        <VesselDetails
          selectedVessel={selectedVessel}
          vessels={mappingResult.vessels}
          isPredictionActive={mappingResult.isPredictionActive}
          overallCadPrediction={mappingResult.overallCadPrediction}
          onSelectVessel={setSelectedVessel}
        />
      </div>

      {/* Educational & Anatomical Disclaimer */}
      <div
        style={{
          padding: '12px 18px',
          borderRadius: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          lineHeight: 1.5,
        }}
      >
        <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>🔬</span>
        <div>
          <strong>Phase 3A Scientific Visualization Scope:</strong> This interactive 3D coronary model renders
          unmodified canonical segment meshes (LAD, LCX, RCA) derived from the BodyParts3D open anatomical dataset.
          In accordance with Phase 1 verification findings, the repository currently lacks a verified whole-heart organ asset;
          therefore, only isolated coronary vessels are rendered in their true shared relative coordinates.
          Model probability bands are illustrative outputs from Phase 2 machine-learning pipelines and must not be used for clinical decision-making.
        </div>
      </div>
    </section>
  );
};
