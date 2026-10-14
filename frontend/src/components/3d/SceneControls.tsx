'use client';

import React from 'react';
import { VesselId } from '../../types/prediction';

interface SceneControlsProps {
  selectedVessel: VesselId | null;
  onSelectVessel: (vessel: VesselId | null) => void;
  onResetCamera: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  isAutoRotate: boolean;
  onToggleAutoRotate: () => void;
}

export const SceneControls: React.FC<SceneControlsProps> = ({
  selectedVessel,
  onSelectVessel,
  onResetCamera,
  onZoomIn,
  onZoomOut,
  isAutoRotate,
  onToggleAutoRotate,
}) => {
  const vessels: VesselId[] = ['LAD', 'LCX', 'RCA'];

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: 'rgba(15, 20, 34, 0.9)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
      }}
      aria-label="3D Viewport Controls"
    >
      {/* Vessel Focus Selection */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Vessel Focus:
        </span>
        <button
          onClick={() => onSelectVessel(null)}
          style={{
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: selectedVessel === null ? 'var(--accent-red)' : 'rgba(255, 255, 255, 0.05)',
            color: selectedVessel === null ? '#fff' : 'var(--text-secondary)',
            border: `1px solid ${selectedVessel === null ? 'var(--accent-red)' : 'rgba(255, 255, 255, 0.1)'}`,
            transition: 'all 0.15s ease',
          }}
          aria-label="View all vessels"
        >
          All Vessels
        </button>
        {vessels.map((v) => {
          const isSelected = selectedVessel === v;
          return (
            <button
              key={v}
              onClick={() => onSelectVessel(v)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: isSelected ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                color: isSelected ? '#080b11' : 'var(--text-primary)',
                border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)'}`,
                transition: 'all 0.15s ease',
              }}
              aria-label={`Select ${v} vessel`}
            >
              {v}
            </button>
          );
        })}
      </div>

      {/* Camera & Navigation Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onZoomIn}
          style={{
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 700,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-primary)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            minWidth: '32px',
          }}
          title="Zoom In"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={onZoomOut}
          style={{
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 700,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-primary)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            minWidth: '32px',
          }}
          title="Zoom Out"
          aria-label="Zoom out"
        >
          −
        </button>

        <button
          onClick={onToggleAutoRotate}
          style={{
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            backgroundColor: isAutoRotate ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: isAutoRotate ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: `1px solid ${isAutoRotate ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)'}`,
          }}
          title="Toggle gentle scene rotation"
          aria-label="Toggle auto-rotate"
        >
          {isAutoRotate ? '⟳ Auto-Rotate On' : '⟳ Rotate'}
        </button>

        <button
          onClick={onResetCamera}
          style={{
            padding: '5px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: 'rgba(255, 51, 102, 0.12)',
            color: 'var(--accent-red)',
            border: '1px solid rgba(255, 51, 102, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          title="Reset camera to default view"
          aria-label="Reset Camera View"
        >
          ↺ Reset View
        </button>
      </div>
    </div>
  );
};
