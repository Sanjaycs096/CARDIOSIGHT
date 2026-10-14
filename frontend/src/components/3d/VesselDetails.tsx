'use client';

import React from 'react';
import { VesselId, VesselVisualizationData } from '../../types/prediction';

interface VesselDetailsProps {
  selectedVessel: VesselId | null;
  vessels: Record<VesselId, VesselVisualizationData>;
  isPredictionActive: boolean;
  overallCadPrediction: {
    positiveProbability: number;
    predictedLabel: string;
    binaryPrediction: number;
  } | null;
  onSelectVessel: (vessel: VesselId | null) => void;
}

export const VesselDetails: React.FC<VesselDetailsProps> = ({
  selectedVessel,
  vessels,
  isPredictionActive,
  overallCadPrediction,
  onSelectVessel,
}) => {
  const currentVessel = selectedVessel ? vessels[selectedVessel] : null;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '24px',
        backdropFilter: 'blur(12px)',
      }}
      aria-label="Vessel Prediction & Anatomical Details"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {currentVessel ? `${currentVessel.name} — ${currentVessel.anatomicalName}` : 'Coronary Vessel Tree Overview'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {currentVessel
              ? currentVessel.description
              : 'Select any individual artery mesh or button below to inspect target probabilities.'}
          </p>
        </div>

        {currentVessel && (
          <button
            onClick={() => onSelectVessel(null)}
            style={{
              fontSize: '12px',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-secondary)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            ✕ Clear Selection
          </button>
        )}
      </div>

      {/* Selected Vessel Focused View */}
      {currentVessel ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Target / Mesh Asset
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {currentVessel.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontFamily: 'monospace', marginTop: '2px' }}>
              {currentVessel.modelFile}
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Model Probability (Positive)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: currentVessel.colorHex,
                  boxShadow: `0 0 8px ${currentVessel.colorHex}`,
                }}
              />
              <span style={{ fontSize: '20px', fontWeight: 800, color: currentVessel.colorHex }}>
                {isPredictionActive && currentVessel.probability !== null
                  ? `${(currentVessel.probability * 100).toFixed(1)}%`
                  : '— (Preview)'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {isPredictionActive ? 'Positive class probability' : 'No patient inference loaded'}
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Binary Prediction
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isPredictionActive && currentVessel.predictedLabel
                ? currentVessel.predictedLabel
                : 'Preview State'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Decision threshold: 0.50
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Pipeline Architecture
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {currentVessel.modelType || 'RandomForest / LogisticReg'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--accent-emerald)', marginTop: '2px' }}>
              Phase 2 Leakage-Safe Saved Pipeline
            </div>
          </div>
        </div>
      ) : (
        /* Overview of All Three Vessels */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          {(['LAD', 'LCX', 'RCA'] as VesselId[]).map((vid) => {
            const v = vessels[vid];
            return (
              <div
                key={vid}
                onClick={() => onSelectVessel(vid)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid rgba(255, 255, 255, 0.08)`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = v.colorHex;
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                }}
                role="button"
                tabIndex={0}
                aria-label={`Select ${vid}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>
                    {v.name}
                  </span>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: v.colorHex,
                      boxShadow: `0 0 6px ${v.colorHex}`,
                    }}
                  />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', minHeight: '32px' }}>
                  {v.anatomicalName}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Score:</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: v.colorHex }}>
                    {isPredictionActive && v.probability !== null
                      ? `${(v.probability * 100).toFixed(1)}%`
                      : 'Preview'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Global CAD (Cath) Separate Display */}
      {isPredictionActive && overallCadPrediction && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 51, 102, 0.08)',
            border: '1px solid rgba(255, 51, 102, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '13px',
          }}
        >
          <div>
            <strong style={{ color: 'var(--accent-red)' }}>Overall CAD Target (Cath):</strong>{' '}
            <span>
              Estimated positive probability: <strong>{(overallCadPrediction.positiveProbability * 100).toFixed(1)}%</strong> ({overallCadPrediction.predictedLabel})
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Patient-level target — Excluded from 3D artery mesh mapping
          </span>
        </div>
      )}
    </div>
  );
};
