'use client';

import React, { useState } from 'react';
import { PatientInputFormData } from '../../types/prediction';
import {
  INITIAL_BLANK_FORM,
  DEMO_PROFILE_ELEVATED,
  DEMO_PROFILE_LOW_RISK,
  validateClinicalForm,
  ValidationIssue,
} from '../../utils/clinicalFormDefaults';
import { ReviewModal } from './ReviewModal';

interface ClinicalInputFormProps {
  onSubmitInference: (data: PatientInputFormData) => Promise<void>;
  isLoading: boolean;
  onFormDirtyChange?: (isDirty: boolean) => void;
  onReset?: () => void;
}

export const ClinicalInputForm: React.FC<ClinicalInputFormProps> = ({
  onSubmitInference,
  isLoading,
  onFormDirtyChange,
  onReset,
}) => {
  const [formData, setFormData] = useState<PatientInputFormData>(DEMO_PROFILE_ELEVATED);
  const [activeTab, setActiveTab] = useState<number>(1);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [useDerivedBmi, setUseDerivedBmi] = useState(false);
  const [activePreset, setActivePreset] = useState<'alpha' | 'beta' | 'custom'>('alpha');

  // Input change handler
  const handleNumericChange = (field: keyof PatientInputFormData, val: string) => {
    const num = parseFloat(val);
    setFormData((prev) => {
      const updated = { ...prev, [field]: isNaN(num) ? 0 : num };
      return updated;
    });
    onFormDirtyChange?.(true);
    setActivePreset('custom');
  };

  const handleStringChange = (field: keyof PatientInputFormData, val: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    onFormDirtyChange?.(true);
    setActivePreset('custom');
  };

  // BMI auto-calculator from Weight (kg) and Length (cm)
  const handleWeightLengthChange = (weightVal?: number, lengthVal?: number) => {
    const w = weightVal ?? formData.Weight ?? 70;
    const l = lengthVal ?? formData.Length ?? 170;
    if (l > 0 && w > 0) {
      const derivedBmi = Number((w / Math.pow(l / 100, 2)).toFixed(2));
      setFormData((prev) => ({
        ...prev,
        Weight: w,
        Length: l,
        BMI: derivedBmi,
      }));
    }
  };

  const handleOpenReview = (e: React.FormEvent) => {
    e.preventDefault();
    const issues = validateClinicalForm(formData);
    setValidationIssues(issues);
    if (issues.length === 0) {
      setIsReviewOpen(true);
    }
  };

  const handleConfirmSubmission = async () => {
    await onSubmitInference(formData);
    setIsReviewOpen(false);
  };

  const handleLoadDemo = (profile: PatientInputFormData, preset: 'alpha' | 'beta') => {
    setFormData(profile);
    setValidationIssues([]);
    setActivePreset(preset);
    onFormDirtyChange?.(false);
  };

  const handleReset = () => {
    setFormData(INITIAL_BLANK_FORM);
    setValidationIssues([]);
    setActivePreset('custom');
    onFormDirtyChange?.(false);
    onReset?.();
  };

  const getFieldError = (fieldName: string) => {
    return validationIssues.find((i) => i.field === fieldName)?.message;
  };

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
      aria-label="Clinical Input Workflow"
    >
      {/* Header and Preset Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 51, 102, 0.15)',
                color: 'var(--accent-red)',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              Phase 3B • Clinical Input
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Validated 49-Feature Clinical Schema
            </span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800 }}>
            Clinical Demonstration Feature Entry &amp; Review
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '720px', marginTop: '4px' }}>
            Enter synthetic demographic, physical examination, electrocardiographic (ECG), and laboratory biomarker parameters.
            All fields correspond to the approved, leakage-safe model contract (Set A - BMI Only).
          </p>
        </div>

        {/* Technical Demonstration Preset Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Synthetic Presets (Non-Patient):</span>
          <button
            type="button"
            onClick={() => handleLoadDemo(DEMO_PROFILE_ELEVATED, 'alpha')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: activePreset === 'alpha' ? 'rgba(255, 51, 102, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: activePreset === 'alpha' ? 'var(--accent-red)' : 'var(--text-secondary)',
              border: `1px solid ${activePreset === 'alpha' ? 'var(--accent-red)' : 'rgba(255, 255, 255, 0.1)'}`,
            }}
            title="Load synthetic demonstration profile A (non-patient example with elevated probability)"
          >
            Synthetic Alpha (Elevated)
          </button>
          <button
            type="button"
            onClick={() => handleLoadDemo(DEMO_PROFILE_LOW_RISK, 'beta')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: activePreset === 'beta' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: activePreset === 'beta' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              border: `1px solid ${activePreset === 'beta' ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)'}`,
            }}
            title="Load synthetic demonstration profile B (non-patient example with lower probability)"
          >
            Synthetic Beta (Lower Score)
          </button>
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
            title="Reset all form inputs"
          >
            Reset Form
          </button>
        </div>
      </div>

      {/* Validation Warning Alert */}
      {validationIssues.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '13px',
            marginBottom: '20px',
          }}
          role="alert"
        >
          <strong>Please resolve the following input validation issues:</strong>
          <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
            {validationIssues.map((issue, idx) => (
              <li key={idx}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '12px',
          marginBottom: '24px',
          overflowX: 'auto',
        }}
        role="tablist"
      >
        {[
          { id: 1, label: '1. Demographics & BMI' },
          { id: 2, label: '2. Medical History (12)' },
          { id: 3, label: '3. Symptoms & Exam (13)' },
          { id: 4, label: '4. ECG Findings (7)' },
          { id: 5, label: '5. Lab Biomarkers (14)' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: activeTab === t.id ? 'rgba(0, 229, 255, 0.12)' : 'transparent',
              color: activeTab === t.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              border: `1px solid ${activeTab === t.id ? 'var(--accent-cyan)' : 'transparent'}`,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleOpenReview}>
        {/* Section 1: Demographics & Anthropometrics */}
        {activeTab === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Age (years)
              </label>
              <input
                type="number"
                value={formData.Age}
                onChange={(e) => handleNumericChange('Age', e.target.value)}
                min={18}
                max={120}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(15, 20, 34, 0.8)',
                  border: `1px solid ${getFieldError('Age') ? '#ef4444' : 'var(--border-color)'}`,
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Range: 18 – 120 yrs</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Biological Sex
              </label>
              <select
                value={formData.Sex}
                onChange={(e) => handleStringChange('Sex', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(15, 20, 34, 0.8)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Normalized automatically</span>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  BMI (kg/m²)
                </label>
                <button
                  type="button"
                  onClick={() => setUseDerivedBmi(!useDerivedBmi)}
                  style={{ fontSize: '11px', color: 'var(--accent-cyan)', textDecoration: 'underline' }}
                >
                  {useDerivedBmi ? 'Direct BMI Input' : 'Derive from Wt/Ht'}
                </button>
              </div>

              <input
                type="number"
                step="0.01"
                value={formData.BMI}
                onChange={(e) => handleNumericChange('BMI', e.target.value)}
                min={10}
                max={70}
                required
                disabled={useDerivedBmi}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: useDerivedBmi ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 20, 34, 0.8)',
                  border: `1px solid ${getFieldError('BMI') ? '#ef4444' : 'var(--border-color)'}`,
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Range: 10.0 – 70.0 kg/m²</span>

              {useDerivedBmi && (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'rgba(0, 229, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                    Anthropometric BMI Derivation Helper:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Weight (kg)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.Weight ?? 70}
                        onChange={(e) => handleWeightLengthChange(parseFloat(e.target.value), formData.Length)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'rgba(15, 20, 34, 0.9)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Height (cm)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.Length ?? 170}
                        onChange={(e) => handleWeightLengthChange(formData.Weight, parseFloat(e.target.value))}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'rgba(15, 20, 34, 0.9)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Calculated: <strong>{formData.BMI} kg/m²</strong> (Weight & Height excluded from model payload)
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 2: Medical History & Risk Factors */}
        {activeTab === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { key: 'DM', label: 'Diabetes Mellitus (DM)', type: 'binary01' },
              { key: 'HTN', label: 'Hypertension (HTN)', type: 'binary01' },
              { key: 'Current_Smoker', label: 'Current Smoker', type: 'binary01' },
              { key: 'EX_Smoker', label: 'Ex-Smoker', type: 'binary01' },
              { key: 'FH', label: 'Family History (FH)', type: 'binary01' },
              { key: 'Obesity', label: 'Obesity Flag', type: 'binaryYN' },
              { key: 'CRF', label: 'Chronic Renal Failure (CRF)', type: 'binaryYN' },
              { key: 'CVA', label: 'Cerebrovascular Accident (CVA)', type: 'binaryYN' },
              { key: 'Airway_disease', label: 'Airway Disease', type: 'binaryYN' },
              { key: 'Thyroid_Disease', label: 'Thyroid Disease', type: 'binaryYN' },
              { key: 'CHF', label: 'Congestive Heart Failure', type: 'binaryYN' },
              { key: 'DLP', label: 'Dyslipidemia (DLP)', type: 'binaryYN' },
            ].map((f) => (
              <div key={f.key} style={{ padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {f.label}
                </label>
                {f.type === 'binary01' ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleNumericChange(f.key as keyof PatientInputFormData, '0')}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: (formData[f.key as keyof PatientInputFormData] as number) === 0 ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        color: (formData[f.key as keyof PatientInputFormData] as number) === 0 ? 'var(--accent-cyan)' : 'var(--text-muted)',
                        border: `1px solid ${(formData[f.key as keyof PatientInputFormData] as number) === 0 ? 'var(--accent-cyan)' : 'transparent'}`,
                      }}
                    >
                      No (0)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumericChange(f.key as keyof PatientInputFormData, '1')}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: (formData[f.key as keyof PatientInputFormData] as number) === 1 ? 'rgba(255, 51, 102, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        color: (formData[f.key as keyof PatientInputFormData] as number) === 1 ? 'var(--accent-red)' : 'var(--text-muted)',
                        border: `1px solid ${(formData[f.key as keyof PatientInputFormData] as number) === 1 ? 'var(--accent-red)' : 'transparent'}`,
                      }}
                    >
                      Yes (1)
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleStringChange(f.key as keyof PatientInputFormData, 'N')}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: (formData[f.key as keyof PatientInputFormData] as string) === 'N' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        color: (formData[f.key as keyof PatientInputFormData] as string) === 'N' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                        border: `1px solid ${(formData[f.key as keyof PatientInputFormData] as string) === 'N' ? 'var(--accent-cyan)' : 'transparent'}`,
                      }}
                    >
                      N
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStringChange(f.key as keyof PatientInputFormData, 'Y')}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: (formData[f.key as keyof PatientInputFormData] as string) === 'Y' ? 'rgba(255, 51, 102, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        color: (formData[f.key as keyof PatientInputFormData] as string) === 'Y' ? 'var(--accent-red)' : 'var(--text-muted)',
                        border: `1px solid ${(formData[f.key as keyof PatientInputFormData] as string) === 'Y' ? 'var(--accent-red)' : 'transparent'}`,
                      }}
                    >
                      Y
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Section 3: Symptoms & Physical Exam */}
        {activeTab === 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Systolic BP (mmHg)
              </label>
              <input
                type="number"
                value={formData.BP}
                onChange={(e) => handleNumericChange('BP', e.target.value)}
                min={60}
                max={260}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Pulse Rate (bpm)
              </label>
              <input
                type="number"
                value={formData.PR}
                onChange={(e) => handleNumericChange('PR', e.target.value)}
                min={30}
                max={220}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Typical Chest Pain
              </label>
              <select
                value={formData.Typical_Chest_Pain}
                onChange={(e) => handleNumericChange('Typical_Chest_Pain', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              >
                <option value={0}>No (0)</option>
                <option value={1}>Yes (1)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Dyspnea
              </label>
              <select
                value={formData.Dyspnea}
                onChange={(e) => handleStringChange('Dyspnea', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              >
                <option value="N">No (N)</option>
                <option value="Y">Yes (Y)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Function Class
              </label>
              <select
                value={formData.Function_Class}
                onChange={(e) => handleNumericChange('Function_Class', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              >
                <option value={0}>Class 0</option>
                <option value={1}>Class 1</option>
                <option value={2}>Class 2</option>
                <option value={3}>Class 3</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Atypical Chest Pain
              </label>
              <select
                value={formData.Atypical}
                onChange={(e) => handleStringChange('Atypical', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              >
                <option value="N">N</option>
                <option value="Y">Y</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Nonanginal Chest Pain
              </label>
              <select
                value={formData.Nonanginal}
                onChange={(e) => handleStringChange('Nonanginal', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              >
                <option value="N">N</option>
                <option value="Y">Y</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                LowTH Angina
              </label>
              <select
                value={formData.LowTH_Ang}
                onChange={(e) => handleStringChange('LowTH_Ang', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              >
                <option value="N">N</option>
                <option value="Y">Y</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Weak Peripheral Pulse
              </label>
              <select
                value={formData.Weak_Peripheral_Pulse}
                onChange={(e) => handleStringChange('Weak_Peripheral_Pulse', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              >
                <option value="N">N</option>
                <option value="Y">Y</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Lung Rales
              </label>
              <select
                value={formData.Lung_rales}
                onChange={(e) => handleStringChange('Lung_rales', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              >
                <option value="N">N</option>
                <option value="Y">Y</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Systolic Murmur
              </label>
              <select
                value={formData.Systolic_Murmur}
                onChange={(e) => handleStringChange('Systolic_Murmur', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              >
                <option value="N">N</option>
                <option value="Y">Y</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Diastolic Murmur
              </label>
              <select
                value={formData.Diastolic_Murmur}
                onChange={(e) => handleStringChange('Diastolic_Murmur', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              >
                <option value="N">N</option>
                <option value="Y">Y</option>
              </select>
            </div>
          </div>
        )}

        {/* Section 4: ECG Findings */}
        {activeTab === 4 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Q Wave (0/1)
              </label>
              <select
                value={formData.Q_Wave}
                onChange={(e) => handleNumericChange('Q_Wave', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              >
                <option value={0}>0 (No)</option>
                <option value={1}>1 (Yes)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                ST Elevation (0/1)
              </label>
              <select
                value={formData.St_Elevation}
                onChange={(e) => handleNumericChange('St_Elevation', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              >
                <option value={0}>0 (No)</option>
                <option value={1}>1 (Yes)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                ST Depression (0/1)
              </label>
              <select
                value={formData.St_Depression}
                onChange={(e) => handleNumericChange('St_Depression', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              >
                <option value={0}>0 (No)</option>
                <option value={1}>1 (Yes)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                T Inversion (0/1)
              </label>
              <select
                value={formData.Tinversion}
                onChange={(e) => handleNumericChange('Tinversion', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              >
                <option value={0}>0 (No)</option>
                <option value={1}>1 (Yes)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                LVH (Left Ventricular Hypertrophy)
              </label>
              <select
                value={formData.LVH}
                onChange={(e) => handleStringChange('LVH', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              >
                <option value="N">N</option>
                <option value="Y">Y</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Poor R Progression
              </label>
              <select
                value={formData.Poor_R_Progression}
                onChange={(e) => handleStringChange('Poor_R_Progression', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              >
                <option value="N">N</option>
                <option value="Y">Y</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Bundle Branch Block (BBB)
              </label>
              <select
                value={formData.BBB}
                onChange={(e) => handleStringChange('BBB', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(15, 20, 34, 0.8)', border: '1px solid var(--border-color)', color: '#fff' }}
              >
                <option value="N">None (N)</option>
                <option value="LBBB">LBBB</option>
                <option value="RBBB">RBBB</option>
              </select>
            </div>
          </div>
        )}

        {/* Section 5: Laboratory Biomarkers */}
        {activeTab === 5 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            {[
              { key: 'FBS', label: 'FBS (mg/dL)', min: 40, max: 500, step: 1 },
              { key: 'CR', label: 'Creatinine (mg/dL)', min: 0.2, max: 15.0, step: 0.1 },
              { key: 'TG', label: 'Triglycerides (mg/dL)', min: 20, max: 1500, step: 1 },
              { key: 'LDL', label: 'LDL (mg/dL)', min: 10, max: 400, step: 1 },
              { key: 'HDL', label: 'HDL (mg/dL)', min: 10, max: 150, step: 0.5 },
              { key: 'BUN', label: 'BUN (mg/dL)', min: 2, max: 100, step: 1 },
              { key: 'ESR', label: 'ESR (mm/hr)', min: 0, max: 150, step: 1 },
              { key: 'HB', label: 'Hemoglobin (g/dL)', min: 5, max: 25, step: 0.1 },
              { key: 'K', label: 'Potassium K (mEq/L)', min: 2.0, max: 8.0, step: 0.1 },
              { key: 'Na', label: 'Sodium Na (mEq/L)', min: 100, max: 180, step: 1 },
              { key: 'WBC', label: 'WBC (/µL)', min: 1000, max: 40000, step: 100 },
              { key: 'Lymph', label: 'Lymphocytes (%)', min: 1, max: 90, step: 1 },
              { key: 'Neut', label: 'Neutrophils (%)', min: 10, max: 95, step: 1 },
              { key: 'PLT', label: 'Platelets (x10³/µL)', min: 10, max: 1000, step: 5 },
            ].map((f) => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {f.label}
                </label>
                <input
                  type="number"
                  step={f.step}
                  value={formData[f.key as keyof PatientInputFormData] as number}
                  onChange={(e) => handleNumericChange(f.key as keyof PatientInputFormData, e.target.value)}
                  min={f.min}
                  max={f.max}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(15, 20, 34, 0.8)',
                    border: `1px solid ${getFieldError(f.key) ? '#ef4444' : 'var(--border-color)'}`,
                    color: '#fff',
                    fontSize: '13px',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Form Bottom Submission Bar */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            {activeTab > 1 && (
              <button
                type="button"
                onClick={() => setActiveTab(activeTab - 1)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                ← Previous Section
              </button>
            )}
            {activeTab < 5 && (
              <button
                type="button"
                onClick={() => setActiveTab(activeTab + 1)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0, 229, 255, 0.1)',
                  color: 'var(--accent-cyan)',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid rgba(0, 229, 255, 0.25)',
                }}
              >
                Next Section →
              </button>
            )}
          </div>

          <button
            id="btn-review-and-predict"
            type="submit"
            disabled={isLoading}
            style={{
              padding: '12px 28px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ff3366, #ff6b8b)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 800,
              boxShadow: '0 0 20px rgba(255, 51, 102, 0.4)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Review Inputs & Run Inference →
          </button>
        </div>
      </form>

      {/* Review Modal */}
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onConfirm={handleConfirmSubmission}
        isLoading={isLoading}
        formData={formData}
      />
    </section>
  );
};
