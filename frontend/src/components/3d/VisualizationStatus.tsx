'use client';

import React from 'react';

interface VisualizationStatusProps {
  isLoading: boolean;
  isPredictionActive: boolean;
  validationError: string | null;
  loadError: string | null;
  loadedVesselsCount: number;
  totalVesselsCount: number;
}

export const VisualizationStatus: React.FC<VisualizationStatusProps> = ({
  isLoading,
  isPredictionActive,
  validationError,
  loadError,
  loadedVesselsCount,
  totalVesselsCount,
}) => {
  if (loadError) {
    return (
      <div
        style={{
          padding: '12px 16px',
          borderRadius: '10px',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
        role="alert"
      >
        <span style={{ fontSize: '16px' }}>⚠️</span>
        <div>
          <strong>Visualization Asset Error:</strong> {loadError}
          <div style={{ fontSize: '11px', marginTop: '2px', color: '#fca5a5' }}>
            Check that canonical OBJ files exist in /models/ (lad.obj, lcx.obj, rca.obj).
          </div>
        </div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div
        style={{
          padding: '12px 16px',
          borderRadius: '10px',
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          color: '#fbbf24',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
        role="alert"
      >
        <span style={{ fontSize: '16px' }}>⚠️</span>
        <div>
          <strong>Prediction Data Notice:</strong> {validationError}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        style={{
          padding: '10px 16px',
          borderRadius: '10px',
          backgroundColor: 'rgba(0, 229, 255, 0.08)',
          border: '1px solid rgba(0, 229, 255, 0.25)',
          color: 'var(--accent-cyan)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            border: '2px solid var(--accent-cyan)',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite',
          }}
        />
        <span>
          Loading anatomical 3D coronary meshes ({loadedVesselsCount}/{totalVesselsCount})...
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '10px 16px',
        borderRadius: '10px',
        backgroundColor: isPredictionActive
          ? 'rgba(16, 185, 129, 0.08)'
          : 'rgba(148, 163, 184, 0.08)',
        border: `1px solid ${
          isPredictionActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(148, 163, 184, 0.2)'
        }`,
        fontSize: '13px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isPredictionActive ? '#10b981' : '#94a3b8',
          }}
        />
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {isPredictionActive
            ? 'Mode B: Real ML Model Predictions Active'
            : 'Mode A: Geometry Preview Mode — No prediction data loaded'}
        </span>
      </div>

      <span
        style={{
          fontSize: '11px',
          color: 'var(--text-secondary)',
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          padding: '3px 8px',
          borderRadius: '6px',
        }}
      >
        Isolated Coronary Tree (BodyParts3D) • Whole-heart unverified
      </span>
    </div>
  );
};
