'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CoronaryViewer } from '../components/3d';
import { ClinicalInputForm } from '../components/clinical';
import {
  PredictionResults,
  ExplainabilityDashboard,
  MetricsDashboard,
  SystemStatusBar,
} from '../components/dashboard';
import {
  PatientInputFormData,
  PredictionResponse,
  ExplanationResponse,
  EvaluationMetricsResponse,
  ModelStatusResponse,
  VesselId,
} from '../types/prediction';
import {
  fetchHealth,
  fetchModelStatus,
  fetchEvaluationMetrics,
  predictCardiovascularRisk,
  explainCardiovascularRisk,
} from '../utils/apiClient';

export default function Home() {
  // Service and health state
  const [healthStatus, setHealthStatus] = useState<{
    status?: string;
    service?: string;
    version?: string;
    environment?: { python_version?: string; platform?: string };
  } | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [metricsData, setMetricsData] = useState<EvaluationMetricsResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Prediction and explainability state
  const [predictionData, setPredictionData] = useState<PredictionResponse | null>(null);
  const [explanationData, setExplanationData] = useState<ExplanationResponse | null>(null);
  const [inferenceLoading, setInferenceLoading] = useState(false);
  const [lastInferenceStatus, setLastInferenceStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [inferenceError, setInferenceError] = useState<string | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState<VesselId | null>(null);

  // Initial load of backend health, status, and metrics
  useEffect(() => {
    async function initSystem() {
      try {
        setHealthLoading(true);
        const [health, models] = await Promise.all([
          fetchHealth().catch((err) => {
            setHealthError(err.message);
            return null;
          }),
          fetchModelStatus().catch(() => null),
        ]);
        setHealthStatus(health);
        setModelStatus(models);
      } finally {
        setHealthLoading(false);
      }

      try {
        setMetricsLoading(true);
        const metrics = await fetchEvaluationMetrics().catch(() => null);
        setMetricsData(metrics);
      } finally {
        setMetricsLoading(false);
      }
    }

    initSystem();
  }, []);

  // Handle clinical form submission: runs live predict and explain endpoints
  const handleClinicalSubmit = useCallback(async (formData: PatientInputFormData) => {
    try {
      setInferenceLoading(true);
      setLastInferenceStatus('loading');
      setInferenceError(null);

      // Run predict first
      const predResult = await predictCardiovascularRisk(formData);
      setPredictionData(predResult);
      setLastInferenceStatus('success');
      setIsFormDirty(false);

      // Run explain concurrently / sequentially
      try {
        const expResult = await explainCardiovascularRisk(formData, 'all', 8);
        setExplanationData(expResult);
      } catch (expErr: unknown) {
        console.warn('Explainability computation notice:', expErr);
      }
    } catch (err: unknown) {
      setPredictionData(null);
      setExplanationData(null);
      const errMsg = err instanceof Error ? err.message : 'Inference request failed';
      setInferenceError(errMsg);
      setLastInferenceStatus('error');
    } finally {
      setInferenceLoading(false);
    }
  }, []);

  // Handle form reset: clears active predictions and explainability data
  const handleFormReset = useCallback(() => {
    setPredictionData(null);
    setExplanationData(null);
    setLastInferenceStatus('idle');
    setInferenceError(null);
    setIsFormDirty(false);
  }, []);

  return (
    <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Top Header */}
      <header style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ff3366, #ff6b8b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 25px rgba(255, 51, 102, 0.45)',
                  fontSize: '22px',
                }}
              >
                ❤️
              </div>
              <h1 style={{ fontSize: '34px', fontWeight: 800, letterSpacing: '-0.5px' }}>
                Cardio<span style={{ color: '#ff3366' }}>Sight</span>
              </h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              Educational Cardiovascular ML Probability Estimation, Interactive 3D Digital Twin &amp; SHAP Interpretability Platform
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: 'rgba(0, 229, 255, 0.12)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                color: '#00e5ff',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00e5ff' }}></span>
              Phase 3B + 3C Fully Integrated
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
              FastAPI &bull; 4 Pipelines Online
            </span>
          </div>
        </div>
      </header>

      {/* System Infrastructure Status Bar */}
      <SystemStatusBar
        healthStatus={healthStatus}
        modelStatus={modelStatus}
        healthLoading={healthLoading}
        healthError={healthError}
        lastInferenceStatus={lastInferenceStatus}
        lastInferenceError={inferenceError}
      />

      {/* SECTION B: CLINICAL INPUT & REVIEW WORKFLOW (PHASE 3B) */}
      <ClinicalInputForm
        onSubmitInference={handleClinicalSubmit}
        isLoading={inferenceLoading}
        onFormDirtyChange={setIsFormDirty}
        onReset={handleFormReset}
      />

      {/* SECTION C: PREDICTION RESULTS SUMMARY (PHASE 3B) */}
      <PredictionResults
        prediction={predictionData}
        isLoading={inferenceLoading}
        isFormDirty={isFormDirty}
        onSelectVessel={setSelectedVessel}
        selectedVessel={selectedVessel}
      />

      {/* SECTION D: INTERACTIVE 3D CORONARY ARTERY TWIN (PHASE 3A) */}
      <CoronaryViewer
        predictionResponse={predictionData}
      />

      {/* SECTION E: SHAP MODEL EXPLAINABILITY DASHBOARD (PHASE 3C) */}
      <ExplainabilityDashboard
        explanationData={explanationData}
        isLoading={inferenceLoading}
      />

      {/* SECTION F: AUTHORITATIVE BENCHMARK EVALUATION METRICS (PHASE 3C) */}
      <MetricsDashboard
        metricsData={metricsData}
        isLoading={metricsLoading}
      />

      {/* Target Ground-Truth Summary Section */}
      <section
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '28px',
          marginBottom: '32px',
          backdropFilter: 'blur(12px)',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
          Clinical Prediction Targets &amp; Class Distributions
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
          Ground-truth angiography diagnostic targets verified from the Z-Alizadeh Sani clinical cohort ($N=303$).
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, color: '#ff3366', fontSize: '16px' }}>Cath</span>
              <span style={{ fontSize: '11px', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>PASS</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Overall CAD Catheterization Finding (Patient Level)</div>
            <div style={{ fontSize: '13px' }}>
              <div><strong>CAD:</strong> 216 patients (71.3%)</div>
              <div><strong>Normal:</strong> 87 patients (28.7%)</div>
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, color: '#00e5ff', fontSize: '16px' }}>LAD</span>
              <span style={{ fontSize: '11px', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>PASS</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Left Anterior Descending</div>
            <div style={{ fontSize: '13px' }}>
              <div><strong>Stenotic:</strong> 177 patients (58.4%)</div>
              <div><strong>Normal:</strong> 126 patients (41.6%)</div>
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, color: '#00e5ff', fontSize: '16px' }}>LCX</span>
              <span style={{ fontSize: '11px', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>PASS</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Left Circumflex Artery</div>
            <div style={{ fontSize: '13px' }}>
              <div><strong>Normal:</strong> 184 patients (60.7%)</div>
              <div><strong>Stenotic:</strong> 119 patients (39.3%)</div>
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, color: '#00e5ff', fontSize: '16px' }}>RCA</span>
              <span style={{ fontSize: '11px', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>PASS</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Right Coronary Artery</div>
            <div style={{ fontSize: '13px' }}>
              <div><strong>Normal:</strong> 189 patients (62.4%)</div>
              <div><strong>Stenotic:</strong> 114 patients (37.6%)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          padding: '24px 0',
          color: 'var(--text-muted)',
          fontSize: '13px',
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <p>
          CardioSight &bull; Experimental Educational Demonstration Platform.
          Models trained on single-center Z-Alizadeh Sani clinical dataset ($N=303$).
          Not a certified medical device and not approved for clinical diagnostic or treatment directives.
        </p>
      </footer>
    </main>
  );
}
