'use client';

import React from 'react';
import { ColorBandConfig } from '../../types/prediction';
import { DEFAULT_COLOR_CONFIG } from '../../utils/vesselMapping';

interface VesselLegendProps {
  config?: ColorBandConfig;
  isPredictionActive?: boolean;
}

export const VesselLegend: React.FC<VesselLegendProps> = ({
  config = DEFAULT_COLOR_CONFIG,
  isPredictionActive = false,
}) => {
  return (
    <div
      style={{
        backgroundColor: 'rgba(15, 20, 34, 0.85)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '16px',
        backdropFilter: 'blur(10px)',
        fontSize: '12px',
      }}
      aria-label="3D Vessel Color Legend"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Visual Probability Legend
        </h4>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '10px',
            backgroundColor: isPredictionActive ? 'rgba(0, 229, 255, 0.15)' : 'rgba(148, 163, 184, 0.15)',
            color: isPredictionActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          {isPredictionActive ? 'MODE B: PREDICTION ACTIVE' : 'MODE A: PREVIEW'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '12px' }}>
        {/* Band 1: Neutral Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              backgroundColor: config.previewColor,
              boxShadow: '0 0 6px rgba(148, 163, 184, 0.4)',
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Preview / Neutral</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No model data</div>
          </div>
        </div>

        {/* Band 2: Cool / Low Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              backgroundColor: config.coolColor,
              boxShadow: `0 0 6px ${config.coolColor}66`,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>&lt; {(config.lowThreshold * 100).toFixed(0)}% Score</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lower score band</div>
          </div>
        </div>

        {/* Band 3: Amber / Intermediate */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              backgroundColor: config.amberColor,
              boxShadow: `0 0 6px ${config.amberColor}66`,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {(config.lowThreshold * 100).toFixed(0)}%–{(config.highThreshold * 100).toFixed(0)}% Score
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Intermediate band</div>
          </div>
        </div>

        {/* Band 4: Warm / Elevated */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              backgroundColor: config.warmColor,
              boxShadow: `0 0 6px ${config.warmColor}66`,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>&gt; {(config.highThreshold * 100).toFixed(0)}% Score</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Elevated score band</div>
          </div>
        </div>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '8px', lineHeight: 1.4 }}>
        <strong>Educational Notice:</strong> Color bands represent experimental model probability estimates for the positive class (stenotic vessel outcome).
        They do not represent clinically validated risk tiers or formal diagnoses.
      </div>
    </div>
  );
};
