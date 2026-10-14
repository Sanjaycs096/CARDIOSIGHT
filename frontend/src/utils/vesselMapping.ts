/**
 * CardioSight Phase 3A - Vessel Mapping & Color Encoding Logic
 * Adheres strictly to the prediction visualization contract:
 * - LAD -> 'LAD' target positive_probability
 * - LCX -> 'LCX' target positive_probability
 * - RCA -> 'RCA' target positive_probability
 * - Cath represents overall CAD and is strictly EXCLUDED from individual vessels.
 */

import {
  VesselId,
  PredictionResponse,
  ColorBandConfig,
  ColorBandCategory,
  VesselVisualizationData,
} from '../types/prediction';

export const DEFAULT_COLOR_CONFIG: ColorBandConfig = {
  lowThreshold: 0.40,
  highThreshold: 0.60,
  coolColor: '#38bdf8',       // Cool cyan / sky blue for lower score (< 0.40)
  amberColor: '#f59e0b',      // Amber tone for intermediate score (0.40 - 0.60)
  warmColor: '#ff3366',       // Warm crimson tone for elevated score (> 0.60)
  previewColor: '#94a3b8',    // Neutral slate for preview mode
};

export const VESSEL_METADATA: Record<VesselId, {
  name: string;
  anatomicalName: string;
  modelFile: string;
  description: string;
}> = {
  LAD: {
    name: 'LAD',
    anatomicalName: 'Left Anterior Descending Artery',
    modelFile: '/models/lad.obj',
    description: 'Anterior interventricular branch supplying anterior left ventricle & septum.',
  },
  LCX: {
    name: 'LCX',
    anatomicalName: 'Left Circumflex Artery',
    modelFile: '/models/lcx.obj',
    description: 'Circumflex branch supplying lateral & posterior aspects of the left ventricle.',
  },
  RCA: {
    name: 'RCA',
    anatomicalName: 'Right Coronary Artery',
    modelFile: '/models/rca.obj',
    description: 'Right coronary trunk supplying right atrium, right ventricle & inferior myocardium.',
  },
};

/**
 * Validates whether a value is a valid, finite probability in [0.0, 1.0].
 */
export function isValidProbability(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0.0 && val <= 1.0;
}

/**
 * Maps a numerical probability to its visualization color band.
 * Bands represent experimental model output ranges, not clinical risk categories.
 */
export function getProbabilityColor(
  probability: number | null,
  config: ColorBandConfig = DEFAULT_COLOR_CONFIG
): {
  colorHex: string;
  bandCategory: ColorBandCategory;
  bandLabel: string;
} {
  if (probability === null || !isValidProbability(probability)) {
    return {
      colorHex: config.previewColor,
      bandCategory: 'neutral_preview',
      bandLabel: 'Preview Mode (Unassigned)',
    };
  }

  if (probability < config.lowThreshold) {
    return {
      colorHex: config.coolColor,
      bandCategory: 'cool_neutral',
      bandLabel: `Score < ${(config.lowThreshold * 100).toFixed(0)}% (Lower Model Band)`,
    };
  } else if (probability <= config.highThreshold) {
    return {
      colorHex: config.amberColor,
      bandCategory: 'intermediate_amber',
      bandLabel: `${(config.lowThreshold * 100).toFixed(0)}%–${(config.highThreshold * 100).toFixed(0)}% (Intermediate Model Band)`,
    };
  } else {
    return {
      colorHex: config.warmColor,
      bandCategory: 'warm_elevated',
      bandLabel: `Score > ${(config.highThreshold * 100).toFixed(0)}% (Elevated Model Band)`,
    };
  }
}

export interface VesselMappingResult {
  isPredictionActive: boolean;
  validationError: string | null;
  overallCadPrediction: {
    positiveProbability: number;
    predictedLabel: string;
    binaryPrediction: number;
  } | null;
  vessels: Record<VesselId, VesselVisualizationData>;
}

/**
 * Maps a PredictionResponse to vessel visualization entities.
 * If data is null, malformed, or incomplete, reverts cleanly to neutral preview mode.
 */
export function mapPredictionToVessels(
  response: PredictionResponse | null,
  config: ColorBandConfig = DEFAULT_COLOR_CONFIG
): VesselMappingResult {
  const vesselIds: VesselId[] = ['LAD', 'LCX', 'RCA'];

  // Base state: Neutral Preview
  const buildNeutralVessels = (): Record<VesselId, VesselVisualizationData> => {
    const neutral: Partial<Record<VesselId, VesselVisualizationData>> = {};
    for (const id of vesselIds) {
      const meta = VESSEL_METADATA[id];
      neutral[id] = {
        id,
        name: meta.name,
        anatomicalName: meta.anatomicalName,
        modelFile: meta.modelFile,
        targetKey: id,
        probability: null,
        predictedLabel: null,
        binaryPrediction: null,
        colorHex: config.previewColor,
        bandCategory: 'neutral_preview',
        modelType: null,
        description: meta.description,
      };
    }
    return neutral as Record<VesselId, VesselVisualizationData>;
  };

  if (!response || !response.predictions) {
    return {
      isPredictionActive: false,
      validationError: null,
      overallCadPrediction: null,
      vessels: buildNeutralVessels(),
    };
  }

  // Validate that all expected vessel targets are present and valid
  const missingTargets: string[] = [];
  const invalidProbabilities: string[] = [];

  for (const id of vesselIds) {
    const targetData = response.predictions[id];
    if (!targetData) {
      missingTargets.push(id);
    } else if (!isValidProbability(targetData.positive_probability)) {
      invalidProbabilities.push(`${id} (val=${targetData.positive_probability})`);
    }
  }

  if (missingTargets.length > 0 || invalidProbabilities.length > 0) {
    const errorMsg = [
      missingTargets.length > 0 ? `Missing targets: ${missingTargets.join(', ')}` : '',
      invalidProbabilities.length > 0 ? `Invalid probabilities: ${invalidProbabilities.join(', ')}` : '',
    ].filter(Boolean).join('. ');

    return {
      isPredictionActive: false,
      validationError: `Malformed prediction data: ${errorMsg}. Reverted to neutral preview.`,
      overallCadPrediction: null,
      vessels: buildNeutralVessels(),
    };
  }

  // Map each vessel to its corresponding target
  const mappedVessels: Partial<Record<VesselId, VesselVisualizationData>> = {};
  for (const id of vesselIds) {
    const targetData = response.predictions[id];
    const prob = targetData.positive_probability;
    const bandInfo = getProbabilityColor(prob, config);
    const meta = VESSEL_METADATA[id];

    mappedVessels[id] = {
      id,
      name: meta.name,
      anatomicalName: meta.anatomicalName,
      modelFile: meta.modelFile,
      targetKey: id,
      probability: prob,
      predictedLabel: targetData.predicted_label,
      binaryPrediction: targetData.binary_prediction,
      colorHex: bandInfo.colorHex,
      bandCategory: bandInfo.bandCategory,
      modelType: targetData.model_type,
      description: meta.description,
    };
  }

  // Extract Cath target separately (DO NOT map to any vessel)
  let overallCad: VesselMappingResult['overallCadPrediction'] = null;
  const cathData = response.predictions['Cath'];
  if (cathData && isValidProbability(cathData.positive_probability)) {
    overallCad = {
      positiveProbability: cathData.positive_probability,
      predictedLabel: cathData.predicted_label,
      binaryPrediction: cathData.binary_prediction,
    };
  }

  return {
    isPredictionActive: true,
    validationError: null,
    overallCadPrediction: overallCad,
    vessels: mappedVessels as Record<VesselId, VesselVisualizationData>,
  };
}
