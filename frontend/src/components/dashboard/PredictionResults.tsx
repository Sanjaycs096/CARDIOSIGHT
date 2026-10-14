'use client';

import React from 'react';
import { PredictionResponse, VesselId } from '../../types/prediction';
import { getProbabilityColor } from '../../utils/vesselMapping';

interface PredictionResultsProps {
  prediction: PredictionResponse | null;
  isLoading: boolean;
  isFormDirty: boolean;
  onSelectVessel?: (vessel: VesselId | null) => void;
  selectedVessel?: VesselId | null;
}

export const PredictionResults: React.FC<PredictionResultsProps> = ({
  prediction,
  isLoading,
  isFormDirty,
  onSelectVessel,
  selectedVessel,
}) => {
  if (isLoading) {
    return (
      <div
        style={{
          padding: '32px',
          borderRadius: '16px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '32px',
        }}
      >
        <span
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: '2px solid var(--accent-red)',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite',
            display: 'inline-block',
          }}
        />
        <strong style={{ color: 'var(--text-primary)' }}>Computing Model Predictions...</strong>
        <p style={{ fontSize: '13px' }}>Executing Phase 2 inference across Cath, LAD, LCX, and RCA pipelines.</p>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div
        style={{
          padding: '24px',
          borderRadius: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px dashed var(--border-color)',
          marginBottom: '32px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
        }}
      >
        <strong>No Model Predictions Computed Yet</strong>
        <p style={{ marginTop: '4px' }}>
          Complete the clinical demonstration inputs above and click &quot;Review Inputs &amp; Predict&quot; to compute experimental model probability estimates.
        </p>
      </div>
    );
  }

  const cathPred = prediction.predictions['Cath'];
  const vesselIds: VesselId[] = ['LAD', 'LCX', 'RCA'];

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        marginBottom: '32px',
      }}
      aria-label="Model Prediction Results"
    >
      {/* Dirty Warning if form was edited after prediction */}
      {isFormDirty && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⚠️</span>
          <span>
            <strong>Inputs modified:</strong> Form entries have been altered since the last inference run.
            The predictions displayed below reflect the previously submitted payload.
          </span>
        </div>
      )}

      {/* Medical Safety & Prototype Notice */}
      <div
        style={{
          padding: '10px 16px',
          borderRadius: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}
      >
        <strong>Medical Safety Notice:</strong> Model outputs reflect machine-learning probability estimates on single-center study data ($N=303$).
        These values are uncalibrated experimental classifications and do not constitute a clinical diagnosis, risk assessment, or treatment directive.
      </div>

      {/* Target 1: Cath Overall CAD Summary Card */}
      {cathPred && (
        <div
          style={{
            padding: '24px',
            borderRadius: '16px',
            backgroundColor: 'rgba(18, 24, 38, 0.85)',
            border: `1.5px solid ${cathPred.positive_probability >= 0.5 ? 'rgba(255, 51, 102, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
            backdropFilter: 'blur(12px)',
            boxShadow: `0 8px 30px ${cathPred.positive_probability >= 0.5 ? 'rgba(255, 51, 102, 0.15)' : 'rgba(16, 185, 129, 0.15)'}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 51, 102, 0.15)',
                    color: 'var(--accent-red)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Patient-Level Model Target
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Evaluated at Patient Level • Excluded from 3D Artery Coloring
                </span>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px' }}>
                Overall Coronary Artery Disease (Cath Prediction)
              </h3>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: '6px 14px',
                  borderRadius: '20px',
                  backgroundColor: cathPred.positive_probability >= 0.5 ? 'rgba(255, 51, 102, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: cathPred.positive_probability >= 0.5 ? 'var(--accent-red)' : '#10b981',
                  border: `1px solid ${cathPred.positive_probability >= 0.5 ? 'var(--accent-red)' : '#10b981'}`,
                }}
              >
                Model Output: {cathPred.predicted_label}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Model-Estimated Probability (CAD)
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: cathPred.positive_probability >= 0.5 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                {(cathPred.positive_probability * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Decision Threshold: 50.0% (Uncalibrated)
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Negative Class Probability (Normal)
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                {(cathPred.negative_probability * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Sum: {(cathPred.probability_sum).toFixed(4)}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Model Pipeline
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {cathPred.model_type}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-emerald)', marginTop: '2px' }}>
                Standardized L2 Regularized
              </div>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            <strong>Angiography Target Note:</strong> Corresponds to binary catheterization finding (&ge; 50% stenosis in any major vessel).
            This patient-level model output is evaluated separately from individual 3D branch geometries to prevent misleading visual mapping.
            Outputs represent uncalibrated statistical model estimates, not clinical diagnoses.
          </div>
        </div>
      )}

      {/* Target 2, 3, 4: Vessel-Specific Prediction Cards */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Coronary Artery Model Probabilities (3D Mapped)
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>
            Mapped directly to 3D LAD, LCX, and RCA Artery Meshes
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {vesselIds.map((vid) => {
            const vData = prediction.predictions[vid];
            if (!vData) return null;

            const band = getProbabilityColor(vData.positive_probability);
            const isSelected = selectedVessel === vid;

            return (
              <div
                key={vid}
                onClick={() => onSelectVessel?.(isSelected ? null : vid)}
                style={{
                  padding: '20px',
                  borderRadius: '14px',
                  backgroundColor: 'var(--bg-card)',
                  border: `1.5px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 0 20px rgba(0, 229, 255, 0.2)' : 'none',
                }}
                role="button"
                tabIndex={0}
                aria-label={`Select ${vid} prediction card`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: band.colorHex, boxShadow: `0 0 8px ${band.colorHex}` }} />
                    <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{vid}</span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: vData.positive_probability >= 0.5 ? 'var(--accent-red)' : 'var(--text-secondary)',
                      fontWeight: 700,
                    }}
                  >
                    Model: {vData.predicted_label}
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', minHeight: '34px', marginBottom: '14px' }}>
                  {vData.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Model Probability:</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: band.colorHex }}>
                      {(vData.positive_probability * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Negative Class:</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {(vData.negative_probability * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '8px' }}>
                  <span>Model: <strong>{vData.model_type}</strong></span>
                  <span>{isSelected ? 'Focused in 3D' : 'Click to Focus'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
