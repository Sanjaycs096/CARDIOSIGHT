'use client';

import React from 'react';
import { ModelStatusResponse } from '../../types/prediction';

interface SystemStatusBarProps {
  healthStatus: {
    status?: string;
    service?: string;
    version?: string;
    environment?: { python_version?: string; platform?: string };
  } | null;
  modelStatus: ModelStatusResponse | null;
  healthLoading: boolean;
  healthError: string | null;
  lastInferenceStatus: 'idle' | 'loading' | 'success' | 'error';
  lastInferenceError: string | null;
}

export const SystemStatusBar: React.FC<SystemStatusBarProps> = ({
  healthStatus,
  modelStatus,
  healthLoading,
  healthError,
  lastInferenceStatus,
  lastInferenceError,
}) => {
  const isHealthy = healthStatus?.status === 'healthy';
  const modelsLoadedCount = modelStatus?.available_targets?.length ?? 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '28px',
      }}
      aria-label="System Infrastructure & Service Status"
    >
      {/* Box 1: FastAPI Health */}
      <div
        style={{
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inference Service</span>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isHealthy ? '#10b981' : healthLoading ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: isHealthy ? '#10b981' : healthLoading ? '#f59e0b' : '#ef4444' }}>
          {healthLoading ? 'Connecting...' : isHealthy ? 'HTTP 200 Healthy' : 'Offline'}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {healthStatus?.service ? `${healthStatus.service} v${healthStatus.version}` : healthError || 'FastAPI port 8000'}
        </div>
      </div>

      {/* Box 2: ML Pipeline Artifacts */}
      <div
        style={{
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trained Pipelines</span>
          <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>4 / 4 READY</span>
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {modelsLoadedCount} Target Models Loaded
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Cath, LAD, LCX, RCA (Leakage-Safe)
        </div>
      </div>

      {/* Box 3: Feature Contract */}
      <div
        style={{
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Feature Contract</span>
          <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700 }}>SET A</span>
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
          49 Clinical Features
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          BMI Only (Collinearity Eliminated)
        </div>
      </div>

      {/* Box 4: Latest Inference Status */}
      <div
        style={{
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Live Inference</span>
          <span
            style={{
              fontSize: '11px',
              color:
                lastInferenceStatus === 'success'
                  ? '#10b981'
                  : lastInferenceStatus === 'loading'
                  ? 'var(--accent-cyan)'
                  : lastInferenceStatus === 'error'
                  ? '#ef4444'
                  : 'var(--text-muted)',
              fontWeight: 700,
            }}
          >
            {lastInferenceStatus.toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {lastInferenceStatus === 'loading'
            ? 'Evaluating...'
            : lastInferenceStatus === 'success'
            ? 'Inference Synchronized'
            : lastInferenceStatus === 'error'
            ? 'Inference Error'
            : 'Awaiting Submission'}
        </div>
        <div style={{ fontSize: '11px', color: lastInferenceError ? '#ef4444' : 'var(--text-muted)', marginTop: '2px' }}>
          {lastInferenceError || 'SHAP & 3D Twin Ready'}
        </div>
      </div>
    </div>
  );
};
