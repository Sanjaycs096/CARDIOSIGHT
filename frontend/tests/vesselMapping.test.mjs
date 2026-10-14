import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_COLOR_CONFIG,
  VESSEL_METADATA,
  isValidProbability,
  getProbabilityColor,
  mapPredictionToVessels,
} from '../src/utils/vesselMapping.ts';

test('1. isValidProbability accepts valid finite numbers in [0.0, 1.0]', () => {
  assert.equal(isValidProbability(0.0), true);
  assert.equal(isValidProbability(0.5), true);
  assert.equal(isValidProbability(1.0), true);
  assert.equal(isValidProbability(0.772), true);

  assert.equal(isValidProbability(-0.01), false);
  assert.equal(isValidProbability(1.01), false);
  assert.equal(isValidProbability(NaN), false);
  assert.equal(isValidProbability(Infinity), false);
  assert.equal(isValidProbability(-Infinity), false);
  assert.equal(isValidProbability(null), false);
  assert.equal(isValidProbability(undefined), false);
  assert.equal(isValidProbability('0.5'), false);
});

test('2. getProbabilityColor maps probabilities to correct color bands', () => {
  // Neutral / null
  const neutral = getProbabilityColor(null);
  assert.equal(neutral.colorHex, DEFAULT_COLOR_CONFIG.previewColor);
  assert.equal(neutral.bandCategory, 'neutral_preview');

  // Cool band (< 0.40)
  const cool = getProbabilityColor(0.25);
  assert.equal(cool.colorHex, DEFAULT_COLOR_CONFIG.coolColor);
  assert.equal(cool.bandCategory, 'cool_neutral');

  // Amber intermediate band (0.40 <= p <= 0.60)
  const amber1 = getProbabilityColor(0.40);
  assert.equal(amber1.colorHex, DEFAULT_COLOR_CONFIG.amberColor);
  assert.equal(amber1.bandCategory, 'intermediate_amber');

  const amber2 = getProbabilityColor(0.55);
  assert.equal(amber2.colorHex, DEFAULT_COLOR_CONFIG.amberColor);
  assert.equal(amber2.bandCategory, 'intermediate_amber');

  const amber3 = getProbabilityColor(0.60);
  assert.equal(amber3.colorHex, DEFAULT_COLOR_CONFIG.amberColor);
  assert.equal(amber3.bandCategory, 'intermediate_amber');

  // Warm elevated band (> 0.60)
  const warm = getProbabilityColor(0.78);
  assert.equal(warm.colorHex, DEFAULT_COLOR_CONFIG.warmColor);
  assert.equal(warm.bandCategory, 'warm_elevated');
});

test('3. mapPredictionToVessels returns neutral preview when response is null', () => {
  const result = mapPredictionToVessels(null);
  assert.equal(result.isPredictionActive, false);
  assert.equal(result.validationError, null);
  assert.equal(result.overallCadPrediction, null);

  for (const vid of ['LAD', 'LCX', 'RCA']) {
    assert.equal(result.vessels[vid].probability, null);
    assert.equal(result.vessels[vid].colorHex, DEFAULT_COLOR_CONFIG.previewColor);
    assert.equal(result.vessels[vid].bandCategory, 'neutral_preview');
  }
});

test('4. mapPredictionToVessels maps targets correctly when valid PredictionResponse is supplied', () => {
  const mockResponse = {
    predictions: {
      Cath: {
        target: 'Cath',
        description: 'Overall CAD',
        positive_class_label: 'CAD',
        negative_class_label: 'Normal',
        positive_probability: 0.95,
        negative_probability: 0.05,
        probability_sum: 1.0,
        binary_prediction: 1,
        predicted_label: 'CAD',
        model_type: 'LogisticRegression',
      },
      LAD: {
        target: 'LAD',
        description: 'LAD Stenosis',
        positive_class_label: 'Stenotic',
        negative_class_label: 'Normal',
        positive_probability: 0.75,
        negative_probability: 0.25,
        probability_sum: 1.0,
        binary_prediction: 1,
        predicted_label: 'Stenotic',
        model_type: 'RandomForestClassifier',
      },
      LCX: {
        target: 'LCX',
        description: 'LCX Stenosis',
        positive_class_label: 'Stenotic',
        negative_class_label: 'Normal',
        positive_probability: 0.45,
        negative_probability: 0.55,
        probability_sum: 1.0,
        binary_prediction: 0,
        predicted_label: 'Normal',
        model_type: 'RandomForestClassifier',
      },
      RCA: {
        target: 'RCA',
        description: 'RCA Stenosis',
        positive_class_label: 'Stenotic',
        negative_class_label: 'Normal',
        positive_probability: 0.20,
        negative_probability: 0.80,
        probability_sum: 1.0,
        binary_prediction: 0,
        predicted_label: 'Normal',
        model_type: 'LogisticRegression',
      },
    },
    high_risk_targets: ['Cath', 'LAD'],
    disclaimer: 'Educational disclaimer',
  };

  const result = mapPredictionToVessels(mockResponse);
  assert.equal(result.isPredictionActive, true);
  assert.equal(result.validationError, null);

  // Check LAD mapping (>0.60 -> warm)
  assert.equal(result.vessels.LAD.probability, 0.75);
  assert.equal(result.vessels.LAD.bandCategory, 'warm_elevated');
  assert.equal(result.vessels.LAD.colorHex, DEFAULT_COLOR_CONFIG.warmColor);
  assert.equal(result.vessels.LAD.predictedLabel, 'Stenotic');

  // Check LCX mapping (0.45 -> amber)
  assert.equal(result.vessels.LCX.probability, 0.45);
  assert.equal(result.vessels.LCX.bandCategory, 'intermediate_amber');
  assert.equal(result.vessels.LCX.colorHex, DEFAULT_COLOR_CONFIG.amberColor);
  assert.equal(result.vessels.LCX.predictedLabel, 'Normal');

  // Check RCA mapping (0.20 -> cool)
  assert.equal(result.vessels.RCA.probability, 0.20);
  assert.equal(result.vessels.RCA.bandCategory, 'cool_neutral');
  assert.equal(result.vessels.RCA.colorHex, DEFAULT_COLOR_CONFIG.coolColor);
  assert.equal(result.vessels.RCA.predictedLabel, 'Normal');

  // Guard verification: Cath must NEVER be mapped to LAD, LCX, or RCA
  assert.notEqual(result.vessels.LAD.probability, 0.95);
  assert.notEqual(result.vessels.LCX.probability, 0.95);
  assert.notEqual(result.vessels.RCA.probability, 0.95);

  // But Cath is captured in overallCadPrediction
  assert.notEqual(result.overallCadPrediction, null);
  assert.equal(result.overallCadPrediction?.positiveProbability, 0.95);
});

test('5. mapPredictionToVessels handles incomplete predictions gracefully', () => {
  const incompleteResponse = {
    predictions: {
      LAD: {
        target: 'LAD',
        description: 'LAD Stenosis',
        positive_class_label: 'Stenotic',
        negative_class_label: 'Normal',
        positive_probability: 0.75,
        negative_probability: 0.25,
        probability_sum: 1.0,
        binary_prediction: 1,
        predicted_label: 'Stenotic',
        model_type: 'RandomForestClassifier',
      },
      // LCX and RCA missing
    },
    high_risk_targets: ['LAD'],
    disclaimer: 'Educational disclaimer',
  };

  const result = mapPredictionToVessels(incompleteResponse);
  assert.equal(result.isPredictionActive, false);
  assert.match(result.validationError || '', /Missing targets: LCX, RCA/);
  // Must revert all vessels to neutral
  for (const vid of ['LAD', 'LCX', 'RCA']) {
    assert.equal(result.vessels[vid].probability, null);
    assert.equal(result.vessels[vid].bandCategory, 'neutral_preview');
  }
});

test('6. mapPredictionToVessels handles invalid/out-of-range probabilities gracefully', () => {
  const invalidResponse = {
    predictions: {
      LAD: {
        target: 'LAD',
        description: 'LAD Stenosis',
        positive_class_label: 'Stenotic',
        negative_class_label: 'Normal',
        positive_probability: 1.85, // INVALID: > 1.0
        negative_probability: -0.85,
        probability_sum: 1.0,
        binary_prediction: 1,
        predicted_label: 'Stenotic',
        model_type: 'RandomForestClassifier',
      },
      LCX: {
        target: 'LCX',
        description: 'LCX Stenosis',
        positive_class_label: 'Stenotic',
        negative_class_label: 'Normal',
        positive_probability: 0.45,
        negative_probability: 0.55,
        probability_sum: 1.0,
        binary_prediction: 0,
        predicted_label: 'Normal',
        model_type: 'RandomForestClassifier',
      },
      RCA: {
        target: 'RCA',
        description: 'RCA Stenosis',
        positive_class_label: 'Stenotic',
        negative_class_label: 'Normal',
        positive_probability: 0.20,
        negative_probability: 0.80,
        probability_sum: 1.0,
        binary_prediction: 0,
        predicted_label: 'Normal',
        model_type: 'LogisticRegression',
      },
    },
    high_risk_targets: ['LAD'],
    disclaimer: 'Educational disclaimer',
  };

  const result = mapPredictionToVessels(invalidResponse);
  assert.equal(result.isPredictionActive, false);
  assert.match(result.validationError || '', /Invalid probabilities: LAD/);
  // Must revert to neutral preview
  assert.equal(result.vessels.LAD.probability, null);
  assert.equal(result.vessels.LAD.bandCategory, 'neutral_preview');
});

test('7. Canonical OBJ file paths and metadata are valid', () => {
  assert.equal(VESSEL_METADATA.LAD.modelFile, '/models/lad.obj');
  assert.equal(VESSEL_METADATA.LCX.modelFile, '/models/lcx.obj');
  assert.equal(VESSEL_METADATA.RCA.modelFile, '/models/rca.obj');
});
