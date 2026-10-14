'use client';

import React, { useState } from 'react';
import { ExplanationResponse } from '../../types/prediction';

interface ExplainabilityDashboardProps {
  explanationData: ExplanationResponse | null;
  isLoading: boolean;
}

export const ExplainabilityDashboard: React.FC<ExplainabilityDashboardProps> = ({
  explanationData,
  isLoading,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<'Cath' | 'LAD' | 'LCX' | 'RCA'>('LAD');
  const [activeView, setActiveView] = useState<'local' | 'global'>('local');

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
            border: '2px solid var(--accent-cyan)',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite',
            display: 'inline-block',
          }}
        />
        <strong style={{ color: 'var(--text-primary)' }}>Computing Mathematical SHAP Values...</strong>
        <p style={{ fontSize: '13px' }}>Executing TreeExplainer / LinearExplainer across pipeline transformations.</p>
      </div>
    );
  }

  if (!explanationData || !explanationData.explanations) {
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
        <strong>Explainability Dashboard Idle</strong>
        <p style={{ marginTop: '4px' }}>
          Submit patient clinical inputs above to view personalized SHAP feature attributions and global model rankings.
        </p>
      </div>
    );
  }

  const targetExplanation = explanationData.explanations[selectedTarget];
  const maxLocalContrib = targetExplanation?.features?.length
    ? Math.max(...targetExplanation.features.map((f) => Math.abs(f.contribution)), 0.001)
    : 1;

  const maxGlobalImportance = targetExplanation?.global_importance?.length
    ? Math.max(...targetExplanation.global_importance.map((g) => g.mean_abs_shap), 0.001)
    : 1;

  return (
    <section
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '28px',
        backdropFilter: 'blur(12px)',
        marginBottom: '32px',
      }}
      aria-label="SHAP Model Explainability Dashboard"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 229, 255, 0.15)',
                color: 'var(--accent-cyan)',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              Phase 3C • Explainable AI
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              SHAP Shapley Additive Explanations
            </span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800 }}>
            Model Interpretability &amp; Feature Attribution
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '780px', marginTop: '4px' }}>
            Inspect mathematically verified SHAP values illustrating how individual patient features contributed to the
            risk prediction, alongside population-level global feature importance computed across the training cohort.
          </p>
        </div>

        {/* Local vs Global Toggle */}
        <div style={{ display: 'flex', gap: '6px', backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => setActiveView('local')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: activeView === 'local' ? 'var(--accent-cyan)' : 'transparent',
              color: activeView === 'local' ? '#080b11' : 'var(--text-secondary)',
            }}
          >
            Local Patient Attribution
          </button>
          <button
            type="button"
            onClick={() => setActiveView('global')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: activeView === 'global' ? 'var(--accent-cyan)' : 'transparent',
              color: activeView === 'global' ? '#080b11' : 'var(--text-secondary)',
            }}
          >
            Global Cohort Importance
          </button>
        </div>
      </div>

      {/* Target Selector Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {(['Cath', 'LAD', 'LCX', 'RCA'] as const).map((t) => {
          const isSelected = selectedTarget === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTarget(t)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.08)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{t}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                ({explanationData.explanations[t]?.model_type || 'Model'})
              </span>
            </button>
          );
        })}
      </div>

      {/* Target Details Badge */}
      {targetExplanation && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '12px',
            marginBottom: '20px',
          }}
        >
          <div>
            <strong>{targetExplanation.target}:</strong> {targetExplanation.target_description}
          </div>
          <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)' }}>
            <span>Method: <strong style={{ color: 'var(--accent-cyan)' }}>{targetExplanation.method}</strong></span>
            <span>Base Expected Value: <strong>{targetExplanation.base_value}</strong></span>
            <span>Positive Target: <strong>{targetExplanation.positive_class_label}</strong></span>
          </div>
        </div>
      )}

      {/* Chart: Local Patient SHAP Attribution */}
      {activeView === 'local' && targetExplanation && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Patient Feature Contributions (Positive Class: {targetExplanation.positive_class_label})
            </h4>
            <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--accent-red)', borderRadius: '2px' }} />
                Increases Estimated Risk (+)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--accent-emerald)', borderRadius: '2px' }} />
                Decreases Estimated Risk (−)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {targetExplanation.features.map((feat, idx) => {
              const isPositive = feat.contribution >= 0;
              const barWidthPercent = Math.min(100, Math.round((Math.abs(feat.contribution) / maxLocalContrib) * 100));
              const color = isPositive ? 'var(--accent-red)' : 'var(--accent-emerald)';

              return (
                <div
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(15, 20, 34, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '13px' }}>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{feat.feature_name}</strong>{' '}
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                        (Patient Value: <code>{String(feat.patient_value)}</code>)
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, color, fontFamily: 'monospace' }}>
                      {isPositive ? `+${feat.contribution.toFixed(4)}` : feat.contribution.toFixed(4)}
                    </span>
                  </div>

                  {/* Horizontal Bar */}
                  <div
                    style={{
                      height: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: `${barWidthPercent}%`,
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: '3px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart: Global Feature Importance */}
      {activeView === 'global' && targetExplanation && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Population-Level Global Feature Importance (Mean |SHAP| across Training Split)
            </h4>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Computed on N=242 Patients
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(targetExplanation.global_importance || []).map((item, idx) => {
              const barWidthPercent = Math.min(100, Math.round((item.mean_abs_shap / maxGlobalImportance) * 100));

              return (
                <div
                  key={idx}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(15, 20, 34, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '13px' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{item.feature}</strong>
                    <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>
                      {item.mean_abs_shap.toFixed(4)}
                    </span>
                  </div>

                  <div
                    style={{
                      height: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${barWidthPercent}%`,
                        height: '100%',
                        backgroundColor: 'var(--accent-cyan)',
                        borderRadius: '3px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scientific & Causality Disclaimer */}
      <div
        style={{
          marginTop: '20px',
          padding: '12px 16px',
          borderRadius: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}
      >
        <strong>Predictive Correlation vs Causality Notice:</strong> SHAP values quantify how much each input feature shifted
        the model&apos;s output relative to the expected baseline within this specific algorithm. High positive or negative
        attribution demonstrates mathematical feature dependency in the trained pipeline, NOT biological etiology, disease causality,
        or pharmacological mechanism.
      </div>
    </section>
  );
};
