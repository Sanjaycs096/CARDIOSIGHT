'use client';

import React from 'react';
import { PatientInputFormData } from '../../types/prediction';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  formData: PatientInputFormData;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  formData,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 229, 255, 0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
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
              Step 2 • Input Review & Normalization
            </span>
            <h3 id="review-modal-title" style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px' }}>
              Review Synthetic Feature Payload
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              fontSize: '20px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content Table */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              fontSize: '12px',
              color: '#f59e0b',
              lineHeight: 1.5,
            }}
          >
            <strong>Educational Demonstration Notice:</strong> The features below represent a synthetic, non-patient test case.
            Model-estimated probabilities are uncalibrated experimental outputs and do not replace professional medical evaluation,
            clinical diagnosis, or patient triage.
          </div>

          {/* Group 1: Demographics */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '8px' }}>
              1. Demographics & Anthropometrics
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', fontSize: '13px' }}>
              <div style={{ padding: '8px 12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Age:</span> <strong>{formData.Age} yrs</strong>
              </div>
              <div style={{ padding: '8px 12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Sex:</span> <strong>{formData.Sex}</strong>
              </div>
              <div style={{ padding: '8px 12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>BMI:</span> <strong>{formData.BMI.toFixed(2)} kg/m²</strong>
              </div>
            </div>
          </div>

          {/* Group 2: Medical History */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '8px' }}>
              2. Medical History & Risk Factors
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', fontSize: '12px' }}>
              <div>DM: <strong>{formData.DM ? 'Yes (1)' : 'No (0)'}</strong></div>
              <div>HTN: <strong>{formData.HTN ? 'Yes (1)' : 'No (0)'}</strong></div>
              <div>Current Smoker: <strong>{formData.Current_Smoker ? 'Yes (1)' : 'No (0)'}</strong></div>
              <div>EX-Smoker: <strong>{formData.EX_Smoker ? 'Yes (1)' : 'No (0)'}</strong></div>
              <div>Family History: <strong>{formData.FH ? 'Yes (1)' : 'No (0)'}</strong></div>
              <div>Obesity: <strong>{formData.Obesity}</strong></div>
              <div>CRF: <strong>{formData.CRF}</strong></div>
              <div>CVA: <strong>{formData.CVA}</strong></div>
              <div>Airway Disease: <strong>{formData.Airway_disease}</strong></div>
              <div>Thyroid Disease: <strong>{formData.Thyroid_Disease}</strong></div>
              <div>CHF: <strong>{formData.CHF}</strong></div>
              <div>Dyslipidemia: <strong>{formData.DLP}</strong></div>
            </div>
          </div>

          {/* Group 3: Symptoms & Exam */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '8px' }}>
              3. Symptoms & Physical Examination
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', fontSize: '12px' }}>
              <div>BP: <strong>{formData.BP} mmHg</strong></div>
              <div>Pulse Rate: <strong>{formData.PR} bpm</strong></div>
              <div>Typical Chest Pain: <strong>{formData.Typical_Chest_Pain ? 'Yes (1)' : 'No (0)'}</strong></div>
              <div>Dyspnea: <strong>{formData.Dyspnea}</strong></div>
              <div>Function Class: <strong>Class {formData.Function_Class}</strong></div>
              <div>Atypical Pain: <strong>{formData.Atypical}</strong></div>
              <div>Nonanginal: <strong>{formData.Nonanginal}</strong></div>
              <div>Edema: <strong>{formData.Edema ? 'Yes (1)' : 'No (0)'}</strong></div>
            </div>
          </div>

          {/* Group 4: ECG & Labs */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '8px' }}>
              4. Electrocardiogram (ECG) & Laboratory Values
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', fontSize: '12px' }}>
              <div>Q Wave: <strong>{formData.Q_Wave ? 'Yes (1)' : 'No (0)'}</strong></div>
              <div>ST Elevation: <strong>{formData.St_Elevation ? 'Yes (1)' : 'No (0)'}</strong></div>
              <div>ST Depression: <strong>{formData.St_Depression ? 'Yes (1)' : 'No (0)'}</strong></div>
              <div>T Inversion: <strong>{formData.Tinversion ? 'Yes (1)' : 'No (0)'}</strong></div>
              <div>BBB: <strong>{formData.BBB}</strong></div>
              <div>FBS: <strong>{formData.FBS} mg/dL</strong></div>
              <div>Creatinine: <strong>{formData.CR} mg/dL</strong></div>
              <div>TG: <strong>{formData.TG} mg/dL</strong></div>
              <div>LDL: <strong>{formData.LDL} mg/dL</strong></div>
              <div>HDL: <strong>{formData.HDL} mg/dL</strong></div>
              <div>BUN: <strong>{formData.BUN} mg/dL</strong></div>
              <div>Hemoglobin: <strong>{formData.HB} g/dL</strong></div>
              <div>WBC: <strong>{formData.WBC} /µL</strong></div>
              <div>Platelets: <strong>{formData.PLT} x10³/µL</strong></div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(8, 11, 17, 0.4)',
          }}
        >
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            ← Back to Edit
          </button>

          <button
            id="btn-confirm-run-inference"
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ff3366, #ff6b8b)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: '0 0 15px rgba(255, 51, 102, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? (
              <>
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: '2px solid #ffffff',
                    borderTopColor: 'transparent',
                    animation: 'spin 1s linear infinite',
                    display: 'inline-block',
                  }}
                />
                Running Inference...
              </>
            ) : (
              'Confirm & Run Model Inference →'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
