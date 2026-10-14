'use client';

import React, { useState } from 'react';
import { EvaluationMetricsResponse } from '../../types/prediction';

interface MetricsDashboardProps {
  metricsData: EvaluationMetricsResponse | null;
  isLoading: boolean;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  metricsData,
  isLoading,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<'Cath' | 'LAD' | 'LCX' | 'RCA'>('Cath');

  if (isLoading) {
    return (
      <div
        style={{
          padding: '24px',
          borderRadius: '16px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          marginBottom: '32px',
        }}
      >
        Loading authoritative Phase 2 model evaluation metrics...
      </div>
    );
  }

  if (!metricsData || !metricsData.target_evaluations) {
    return null;
  }

  const targetEval = metricsData.target_evaluations[selectedTarget];
  const testMetrics = targetEval?.held_out_test_metrics;
  const cvMetrics = targetEval?.training_cv_metrics;
  const cm = testMetrics?.confusion_matrix;

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
      aria-label="Model Performance & Evaluation Metrics"
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
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-emerald)',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              Audited Benchmark
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Phase 2 Stratified Split (80% Train / 20% Held-Out Test)
            </span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800 }}>
            Model Evaluation &amp; Validation Performance
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '780px', marginTop: '4px' }}>
            Empirical benchmark metrics evaluated on the clinical cohort ($N=303$). Models were selected based on
            5-fold Stratified Cross-Validation on the training split ($N=242$) and evaluated on the held-out test split ($N=61$).
          </p>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
          <div>Pipeline: <strong>v{metricsData.metadata?.pipeline_version || '1.0.0'}</strong></div>
          <div>Random Seed: <strong>42 (Reproducible)</strong></div>
        </div>
      </div>

      {/* Target Selector Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['Cath', 'LAD', 'LCX', 'RCA'] as const).map((t) => {
          const isSelected = selectedTarget === t;
          const ev = metricsData.target_evaluations[t];
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
                backgroundColor: isSelected ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)',
                border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.08)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{t}</span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981' }}>
                ROC-AUC: {(ev.held_out_test_metrics.roc_auc * 100).toFixed(1)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Primary Metrics Grid (Held-Out Test Set N=61) */}
      {targetEval && testMetrics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Held-Out ROC-AUC</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '4px' }}>
                {(testMetrics.roc_auc * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CV: {(cvMetrics.mean_roc_auc * 100).toFixed(1)}% (±{(cvMetrics.std_roc_auc * 100).toFixed(1)}%)</div>
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Accuracy</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {(testMetrics.accuracy * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CV: {(cvMetrics.mean_accuracy * 100).toFixed(1)}%</div>
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>F1 Score</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {testMetrics.f1.toFixed(3)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CV: {cvMetrics.mean_f1.toFixed(3)}</div>
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sensitivity / Recall</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {(testMetrics.recall * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Positive class detection</div>
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Precision</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {(testMetrics.precision * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Positive predictive val</div>
            </div>
          </div>

          {/* Breakdown & Confusion Matrix */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Model Architecture & Selection Rationale */}
            <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'rgba(15, 20, 34, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: 'var(--accent-cyan)' }}>
                Architecture &amp; Selection Rationale
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                {targetEval.selection_rationale}
              </p>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>Selected Model: <strong>{targetEval.selected_model}</strong></div>
                <div>Positive Class Label: <strong>{targetEval.positive_class}</strong></div>
                <div>Negative Class Label: <strong>{targetEval.negative_class}</strong></div>
              </div>
            </div>

            {/* Confusion Matrix (n=61) */}
            {cm && (
              <div style={{ padding: '18px', borderRadius: '12px', backgroundColor: 'rgba(15, 20, 34, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Held-Out Confusion Matrix (N={testMetrics.sample_counts.total})
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', textAlign: 'center' }}>
                  <div style={{ padding: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <div style={{ color: '#10b981', fontWeight: 800, fontSize: '18px' }}>{cm.true_negative}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>True Negative</div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                    <div style={{ color: '#f87171', fontWeight: 800, fontSize: '18px' }}>{cm.false_positive}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>False Positive</div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                    <div style={{ color: '#f87171', fontWeight: 800, fontSize: '18px' }}>{cm.false_negative}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>False Negative</div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <div style={{ color: '#10b981', fontWeight: 800, fontSize: '18px' }}>{cm.true_positive}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>True Positive</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scientific Notice */}
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
        <strong>Validation Scope:</strong> Metrics reflect strict leakage-safe cross-validation and held-out evaluation
        on the Z-Alizadeh Sani clinical dataset (303 records). They demonstrate algorithm performance on this study cohort
        and do not guarantee identical generalization across external clinical populations.
      </div>
    </section>
  );
};
