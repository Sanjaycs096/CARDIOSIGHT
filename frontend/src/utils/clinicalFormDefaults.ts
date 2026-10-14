/**
 * CardioSight Clinical Form Schema & Demonstration Fixtures
 * Derived strictly from backend/artifacts/feature_schema.json and backend/schemas.py.
 */

import { PatientInputFormData } from '../types/prediction';

export const INITIAL_BLANK_FORM: PatientInputFormData = {
  // Demographics
  Age: 55,
  Sex: 'Male',
  BMI: 25.0,
  Weight: 75,
  Length: 173,

  // Medical History
  DM: 0,
  HTN: 0,
  Current_Smoker: 0,
  EX_Smoker: 0,
  FH: 0,
  Obesity: 'N',
  CRF: 'N',
  CVA: 'N',
  Airway_disease: 'N',
  Thyroid_Disease: 'N',
  CHF: 'N',
  DLP: 'N',

  // Symptoms & Exam
  BP: 120,
  PR: 72,
  Edema: 0,
  Weak_Peripheral_Pulse: 'N',
  Lung_rales: 'N',
  Systolic_Murmur: 'N',
  Diastolic_Murmur: 'N',
  Typical_Chest_Pain: 0,
  Dyspnea: 'N',
  Function_Class: 0,
  Atypical: 'N',
  Nonanginal: 'N',
  LowTH_Ang: 'N',

  // ECG
  Q_Wave: 0,
  St_Elevation: 0,
  St_Depression: 0,
  Tinversion: 0,
  LVH: 'N',
  Poor_R_Progression: 'N',
  BBB: 'N',

  // Labs
  FBS: 95,
  CR: 1.0,
  TG: 120,
  LDL: 90,
  HDL: 45.0,
  BUN: 15,
  ESR: 12,
  HB: 13.5,
  K: 4.2,
  Na: 140,
  WBC: 6500,
  Lymph: 35,
  Neut: 58,
  PLT: 220,
};

/**
 * Technical demonstration profile (Profile Alpha - Elevated Risk)
 * Non-patient technical test fixture matching test_api.py fixture.
 */
export const DEMO_PROFILE_ELEVATED: PatientInputFormData = {
  Age: 58,
  Sex: 'Male',
  BMI: 26.78,
  Weight: 80,
  Length: 173,
  DM: 0,
  HTN: 1,
  Current_Smoker: 0,
  EX_Smoker: 0,
  FH: 0,
  Obesity: 'N',
  CRF: 'N',
  CVA: 'N',
  Airway_disease: 'N',
  Thyroid_Disease: 'N',
  CHF: 'N',
  DLP: 'N',
  BP: 130,
  PR: 75,
  Edema: 0,
  Weak_Peripheral_Pulse: 'N',
  Lung_rales: 'N',
  Systolic_Murmur: 'N',
  Diastolic_Murmur: 'N',
  Typical_Chest_Pain: 1,
  Dyspnea: 'N',
  Function_Class: 0,
  Atypical: 'N',
  Nonanginal: 'N',
  LowTH_Ang: 'N',
  Q_Wave: 0,
  St_Elevation: 0,
  St_Depression: 0,
  Tinversion: 0,
  LVH: 'N',
  Poor_R_Progression: 'N',
  BBB: 'N',
  FBS: 100,
  CR: 1.0,
  TG: 140,
  LDL: 100,
  HDL: 40.0,
  BUN: 16,
  ESR: 15,
  HB: 13.5,
  K: 4.2,
  Na: 141,
  WBC: 7200,
  Lymph: 32,
  Neut: 60,
  PLT: 220,
};

/**
 * Technical demonstration profile (Profile Beta - Lower Risk)
 */
export const DEMO_PROFILE_LOW_RISK: PatientInputFormData = {
  Age: 42,
  Sex: 'Female',
  BMI: 21.5,
  Weight: 58,
  Length: 164,
  DM: 0,
  HTN: 0,
  Current_Smoker: 0,
  EX_Smoker: 0,
  FH: 0,
  Obesity: 'N',
  CRF: 'N',
  CVA: 'N',
  Airway_disease: 'N',
  Thyroid_Disease: 'N',
  CHF: 'N',
  DLP: 'N',
  BP: 110,
  PR: 68,
  Edema: 0,
  Weak_Peripheral_Pulse: 'N',
  Lung_rales: 'N',
  Systolic_Murmur: 'N',
  Diastolic_Murmur: 'N',
  Typical_Chest_Pain: 0,
  Dyspnea: 'N',
  Function_Class: 0,
  Atypical: 'N',
  Nonanginal: 'N',
  LowTH_Ang: 'N',
  Q_Wave: 0,
  St_Elevation: 0,
  St_Depression: 0,
  Tinversion: 0,
  LVH: 'N',
  Poor_R_Progression: 'N',
  BBB: 'N',
  FBS: 85,
  CR: 0.8,
  TG: 95,
  LDL: 75,
  HDL: 62.0,
  BUN: 12,
  ESR: 8,
  HB: 14.0,
  K: 4.1,
  Na: 139,
  WBC: 5800,
  Lymph: 38,
  Neut: 52,
  PLT: 240,
};

/**
 * Validation rules and limits from feature_schema.json
 */
export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateClinicalForm(data: PatientInputFormData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Age: 18 - 120
  if (typeof data.Age !== 'number' || isNaN(data.Age) || data.Age < 18 || data.Age > 120) {
    issues.push({ field: 'Age', message: 'Age must be between 18 and 120 years' });
  }

  // BMI: 10 - 70
  if (typeof data.BMI !== 'number' || isNaN(data.BMI) || data.BMI < 10 || data.BMI > 70) {
    issues.push({ field: 'BMI', message: 'BMI must be between 10.0 and 70.0 kg/m²' });
  }

  // BP: 60 - 260
  if (typeof data.BP !== 'number' || isNaN(data.BP) || data.BP < 60 || data.BP > 260) {
    issues.push({ field: 'BP', message: 'Systolic BP must be between 60 and 260 mmHg' });
  }

  // PR: 30 - 220
  if (typeof data.PR !== 'number' || isNaN(data.PR) || data.PR < 30 || data.PR > 220) {
    issues.push({ field: 'PR', message: 'Pulse rate must be between 30 and 220 bpm' });
  }

  // FBS: 40 - 500
  if (typeof data.FBS !== 'number' || isNaN(data.FBS) || data.FBS < 40 || data.FBS > 500) {
    issues.push({ field: 'FBS', message: 'Fasting Blood Sugar must be between 40 and 500 mg/dL' });
  }

  // CR: 0.2 - 15.0
  if (typeof data.CR !== 'number' || isNaN(data.CR) || data.CR < 0.2 || data.CR > 15.0) {
    issues.push({ field: 'CR', message: 'Creatinine must be between 0.2 and 15.0 mg/dL' });
  }

  // TG: 20 - 1500
  if (typeof data.TG !== 'number' || isNaN(data.TG) || data.TG < 20 || data.TG > 1500) {
    issues.push({ field: 'TG', message: 'Triglycerides must be between 20 and 1500 mg/dL' });
  }

  // LDL: 10 - 400
  if (typeof data.LDL !== 'number' || isNaN(data.LDL) || data.LDL < 10 || data.LDL > 400) {
    issues.push({ field: 'LDL', message: 'LDL must be between 10 and 400 mg/dL' });
  }

  // HDL: 10 - 150
  if (typeof data.HDL !== 'number' || isNaN(data.HDL) || data.HDL < 10 || data.HDL > 150) {
    issues.push({ field: 'HDL', message: 'HDL must be between 10 and 150 mg/dL' });
  }

  // BUN: 2 - 100
  if (typeof data.BUN !== 'number' || isNaN(data.BUN) || data.BUN < 2 || data.BUN > 100) {
    issues.push({ field: 'BUN', message: 'BUN must be between 2 and 100 mg/dL' });
  }

  // ESR: 0 - 150
  if (typeof data.ESR !== 'number' || isNaN(data.ESR) || data.ESR < 0 || data.ESR > 150) {
    issues.push({ field: 'ESR', message: 'ESR must be between 0 and 150 mm/hr' });
  }

  // HB: 5 - 25
  if (typeof data.HB !== 'number' || isNaN(data.HB) || data.HB < 5 || data.HB > 25) {
    issues.push({ field: 'HB', message: 'Hemoglobin must be between 5.0 and 25.0 g/dL' });
  }

  // K: 2.0 - 8.0
  if (typeof data.K !== 'number' || isNaN(data.K) || data.K < 2.0 || data.K > 8.0) {
    issues.push({ field: 'K', message: 'Potassium (K) must be between 2.0 and 8.0 mEq/L' });
  }

  // Na: 100 - 180
  if (typeof data.Na !== 'number' || isNaN(data.Na) || data.Na < 100 || data.Na > 180) {
    issues.push({ field: 'Na', message: 'Sodium (Na) must be between 100 and 180 mEq/L' });
  }

  // WBC: 1000 - 40000
  if (typeof data.WBC !== 'number' || isNaN(data.WBC) || data.WBC < 1000 || data.WBC > 40000) {
    issues.push({ field: 'WBC', message: 'WBC count must be between 1,000 and 40,000 /µL' });
  }

  // PLT: 10 - 1000
  if (typeof data.PLT !== 'number' || isNaN(data.PLT) || data.PLT < 10 || data.PLT > 1000) {
    issues.push({ field: 'PLT', message: 'Platelet count must be between 10 and 1000 x10³/µL' });
  }

  return issues;
}
