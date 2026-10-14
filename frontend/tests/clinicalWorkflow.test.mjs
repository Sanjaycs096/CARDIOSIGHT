import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatPatientPayload,
  ApiError,
} from '../src/utils/apiClient.ts';
import {
  INITIAL_BLANK_FORM,
  DEMO_PROFILE_ELEVATED,
  DEMO_PROFILE_LOW_RISK,
  validateClinicalForm,
} from '../src/utils/clinicalFormDefaults.ts';

test('1. DEMO_PROFILE_ELEVATED and DEMO_PROFILE_LOW_RISK pass clinical validation with zero errors', () => {
  const issuesElevated = validateClinicalForm(DEMO_PROFILE_ELEVATED);
  assert.equal(issuesElevated.length, 0, 'Profile Alpha should have 0 validation issues');

  const issuesLow = validateClinicalForm(DEMO_PROFILE_LOW_RISK);
  assert.equal(issuesLow.length, 0, 'Profile Beta should have 0 validation issues');
});

test('2. validateClinicalForm catches out-of-bounds fields correctly', () => {
  const invalidForm = {
    ...DEMO_PROFILE_ELEVATED,
    Age: 15,          // Below minimum 18
    BMI: 85.0,        // Above maximum 70
    BP: 45,           // Below minimum 60
    PR: 280,          // Above maximum 220
    FBS: 20,          // Below minimum 40
  };

  const issues = validateClinicalForm(invalidForm);
  assert.ok(issues.length >= 5);
  const fields = issues.map((i) => i.field);
  assert.ok(fields.includes('Age'));
  assert.ok(fields.includes('BMI'));
  assert.ok(fields.includes('BP'));
  assert.ok(fields.includes('PR'));
  assert.ok(fields.includes('FBS'));
});

test('3. formatPatientPayload excludes Weight and Length when BMI is present', () => {
  const payload = formatPatientPayload({
    ...DEMO_PROFILE_ELEVATED,
    Weight: 80,
    Length: 175,
  });

  assert.equal('Weight' in payload, false, 'Weight must not be in model payload');
  assert.equal('Length' in payload, false, 'Length must not be in model payload');
  assert.equal(payload['BMI'], DEMO_PROFILE_ELEVATED.BMI);
});

test('4. formatPatientPayload normalizes underscored aliases to schema column names', () => {
  const payload = formatPatientPayload(DEMO_PROFILE_ELEVATED);

  assert.equal('Current Smoker' in payload, true);
  assert.equal('Current_Smoker' in payload, false);

  assert.equal('EX-Smoker' in payload, true);
  assert.equal('EX_Smoker' in payload, false);

  assert.equal('Airway disease' in payload, true);
  assert.equal('Airway_disease' in payload, false);

  assert.equal('Thyroid Disease' in payload, true);
  assert.equal('Thyroid_Disease' in payload, false);

  assert.equal('Weak Peripheral Pulse' in payload, true);
  assert.equal('Weak_Peripheral_Pulse' in payload, false);

  assert.equal('Typical Chest Pain' in payload, true);
  assert.equal('Typical_Chest_Pain' in payload, false);

  assert.equal('Poor R Progression' in payload, true);
  assert.equal('Poor_R_Progression' in payload, false);
});

test('5. Leakage Prevention: Form schemas and payloads strictly exclude forbidden columns', () => {
  const forbidden = [
    'Cath', 'cath',
    'LAD', 'lad',
    'LCX', 'lcx',
    'RCA', 'rca',
    'EF-TTE', 'ef-tte', 'EF_TTE',
    'Region RWMA', 'Region_RWMA',
    'VHD', 'vhd',
    'Exertional CP', 'Exertional_CP',
  ];

  for (const f of forbidden) {
    assert.equal(f in INITIAL_BLANK_FORM, false, `Forbidden column ${f} must not be in INITIAL_BLANK_FORM`);
    assert.equal(f in DEMO_PROFILE_ELEVATED, false, `Forbidden column ${f} must not be in DEMO_PROFILE_ELEVATED`);
    assert.equal(f in DEMO_PROFILE_LOW_RISK, false, `Forbidden column ${f} must not be in DEMO_PROFILE_LOW_RISK`);
  }

  const formattedPayload = formatPatientPayload(DEMO_PROFILE_ELEVATED);
  for (const f of forbidden) {
    assert.equal(f in formattedPayload, false, `Forbidden column ${f} must not be in formatted payload`);
  }
});

test('6. ApiError correctly represents error status and detail context', () => {
  const err = new ApiError('Inference service unreachable', 503, { code: 'CONN_REFUSED' });
  assert.equal(err.name, 'ApiError');
  assert.equal(err.status, 503);
  assert.equal(err.message, 'Inference service unreachable');
  assert.deepEqual(err.details, { code: 'CONN_REFUSED' });
});

test('7. INITIAL_BLANK_FORM ensures clean reset with zero leaked attributes', () => {
  assert.equal(INITIAL_BLANK_FORM.Age, 55);
  assert.equal(INITIAL_BLANK_FORM.Sex, 'Male');
  assert.equal('Cath' in INITIAL_BLANK_FORM, false);
  assert.equal('LAD' in INITIAL_BLANK_FORM, false);
  assert.equal('EF-TTE' in INITIAL_BLANK_FORM, false);
  assert.equal('Weight' in INITIAL_BLANK_FORM, true);
  assert.equal('Length' in INITIAL_BLANK_FORM, true);
});

test('8. validateClinicalForm catches NaN, undefined, or missing required fields', () => {
  const nanForm = {
    ...DEMO_PROFILE_ELEVATED,
    Age: NaN,
    BMI: NaN,
  };
  const issues = validateClinicalForm(nanForm);
  assert.ok(issues.length >= 2);
  const fields = issues.map((i) => i.field);
  assert.ok(fields.includes('Age'));
  assert.ok(fields.includes('BMI'));
});
