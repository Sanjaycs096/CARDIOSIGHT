/**
 * CardioSight Phase 3 - Types and Data Contracts
 * Defines API prediction response structures, vessel IDs, clinical input schema,
 * SHAP explainability responses, and evaluation metric interfaces.
 */

export type VesselId = 'LAD' | 'LCX' | 'RCA';

export interface TargetPrediction {
  target: string;
  description: string;
  positive_class_label: string;
  negative_class_label: string;
  positive_probability: number;
  negative_probability: number;
  probability_sum: number;
  binary_prediction: number;
  predicted_label: string;
  model_type: string;
}

export interface PredictionResponse {
  predictions: Record<string, TargetPrediction>;
  high_risk_targets: string[];
  disclaimer: string;
  pipeline_version?: string;
}

export type ColorBandCategory = 'cool_neutral' | 'intermediate_amber' | 'warm_elevated' | 'neutral_preview';

export interface ColorBandConfig {
  lowThreshold: number;       // Default: 0.40 (< 0.40 is cool/neutral)
  highThreshold: number;      // Default: 0.60 (> 0.60 is warm/elevated)
  coolColor: string;          // Hex for cool/neutral band (#38bdf8)
  amberColor: string;         // Hex for intermediate band (#f59e0b)
  warmColor: string;          // Hex for elevated band (#ff3366)
  previewColor: string;       // Hex for neutral preview mode (#94a3b8)
}

export interface VesselVisualizationData {
  id: VesselId;
  name: string;
  anatomicalName: string;
  modelFile: string;
  targetKey: VesselId;
  probability: number | null;
  predictedLabel: string | null;
  binaryPrediction: number | null;
  colorHex: string;
  bandCategory: ColorBandCategory;
  modelType: string | null;
  description: string;
}

/**
 * Clinical form input data matching backend PatientInput schema.
 * Note: Excludes forbidden targets (Cath, LAD, LCX, RCA) and echo exclusions.
 */
export interface PatientInputFormData {
  // Demographics & Anthropometrics
  Age: number;
  Sex: 'Male' | 'Female';
  BMI: number;
  Weight?: number;
  Length?: number;

  // Medical History & Risk Factors
  DM: 0 | 1;
  HTN: 0 | 1;
  Current_Smoker: 0 | 1;
  EX_Smoker: 0 | 1;
  FH: 0 | 1;
  Obesity: 'Y' | 'N';
  CRF: 'Y' | 'N';
  CVA: 'Y' | 'N';
  Airway_disease: 'Y' | 'N';
  Thyroid_Disease: 'Y' | 'N';
  CHF: 'Y' | 'N';
  DLP: 'Y' | 'N';

  // Physical Examination & Symptoms
  BP: number;
  PR: number;
  Edema: 0 | 1;
  Weak_Peripheral_Pulse: 'Y' | 'N';
  Lung_rales: 'Y' | 'N';
  Systolic_Murmur: 'Y' | 'N';
  Diastolic_Murmur: 'Y' | 'N';
  Typical_Chest_Pain: 0 | 1;
  Dyspnea: 'Y' | 'N';
  Function_Class: 0 | 1 | 2 | 3;
  Atypical: 'Y' | 'N';
  Nonanginal: 'Y' | 'N';
  LowTH_Ang: 'Y' | 'N';

  // Electrocardiogram (ECG) Findings
  Q_Wave: 0 | 1;
  St_Elevation: 0 | 1;
  St_Depression: 0 | 1;
  Tinversion: 0 | 1;
  LVH: 'Y' | 'N';
  Poor_R_Progression: 'Y' | 'N';
  BBB: 'N' | 'LBBB' | 'RBBB';

  // Laboratory Biomarkers
  FBS: number;
  CR: number;
  TG: number;
  LDL: number;
  HDL: number;
  BUN: number;
  ESR: number;
  HB: number;
  K: number;
  Na: number;
  WBC: number;
  Lymph: number;
  Neut: number;
  PLT: number;
}

/**
 * SHAP Explainability Interfaces (Phase 3C)
 */
export interface ExplanationFeature {
  feature_name: string;
  raw_feature_name: string;
  original_feature: string;
  patient_value: string | number;
  contribution: number;
  direction: 'increases_risk' | 'decreases_risk';
}

export interface GlobalFeatureImportance {
  feature: string;
  raw_feature: string;
  mean_abs_shap: number;
}

export interface TargetExplanation {
  target: string;
  target_description: string;
  model_type: string;
  method: string;
  positive_class_label: string;
  negative_class_label: string;
  base_value: number;
  features: ExplanationFeature[];
  global_importance?: GlobalFeatureImportance[];
}

export interface ExplanationResponse {
  explanations: Record<string, TargetExplanation>;
  disclaimer: string;
  pipeline_version?: string;
}

/**
 * Model Evaluation Metrics Interfaces
 */
export interface ConfusionMatrix {
  true_negative: number;
  false_positive: number;
  false_negative: number;
  true_positive: number;
}

export interface TargetMetricsSummary {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  confusion_matrix: ConfusionMatrix;
  sample_counts: {
    total: number;
    positive_count: number;
    negative_count: number;
    positive_proportion: number;
  };
  positive_class_label: string;
}

export interface TargetEvaluationMetrics {
  target_description: string;
  positive_class: string;
  negative_class: string;
  selected_model: string;
  selection_rationale: string;
  training_cv_metrics: {
    n_folds: number;
    mean_roc_auc: number;
    std_roc_auc: number;
    mean_f1: number;
    std_f1: number;
    mean_accuracy: number;
    std_accuracy: number;
    mean_precision: number;
    mean_recall: number;
  };
  held_out_test_metrics: TargetMetricsSummary;
}

export interface EvaluationMetricsResponse {
  metadata: {
    pipeline_version: string;
    timestamp_utc: string;
    random_seed: number;
    test_size: number;
    cv_splits: number;
    dataset_rows: number;
    selected_feature_set: string;
    feature_count: number;
    environment: {
      python_version: string;
      scikit_learn_version: string;
      platform: string;
    };
    clinical_safeguard: string;
  };
  target_evaluations: Record<string, TargetEvaluationMetrics>;
}

export interface ModelStatusResponse {
  models_loaded: boolean;
  available_targets: string[];
  total_expected: number;
  artifact_paths: Record<string, string>;
  environment: {
    python_version: string;
    platform: string;
    artifacts_dir: string;
  };
  disclaimer: string;
}
