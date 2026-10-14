/**
 * CardioSight API Client
 * Typed service layer for communicating with the FastAPI inference backend.
 * Reads API base URL from NEXT_PUBLIC_API_URL or defaults to local development server.
 */

import {
  PatientInputFormData,
  PredictionResponse,
  ExplanationResponse,
  EvaluationMetricsResponse,
  ModelStatusResponse,
} from '../types/prediction';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Normalizes PatientInputFormData into the payload format expected by FastAPI schemas.
 * Converts underscores in aliases back to dataset spaces (e.g. Current_Smoker -> 'Current Smoker').
 */
export function formatPatientPayload(
  formData: PatientInputFormData
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(formData)) {
    // If Weight and Length were used to derive BMI, do NOT include Weight or Length
    // unless BMI is missing, in compliance with the trained model contract (Set_A_BMI_Only)
    if (key === 'Weight' || key === 'Length') {
      continue;
    }
    if (key === 'EX_Smoker') {
      payload['EX-Smoker'] = value;
      continue;
    }
    const apiKey = key.replace(/_/g, ' ');
    payload[apiKey] = value;
  }

  return payload;
}

/**
 * Helper to execute fetch with an AbortController timeout.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${timeoutMs / 1000}s`, 408);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Health check endpoint: GET /api/health
 */
export async function fetchHealth(): Promise<{
  status: string;
  api_online?: boolean;
  models_ready?: boolean;
  models_loaded_count?: number;
  total_models_expected?: number;
  service: string;
  version: string;
  environment: { python_version: string; platform: string };
}> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/health`, {
      cache: 'no-store',
    }, 8000);
    if (!res.ok) {
      throw new ApiError(`Health check failed: HTTP ${res.status}`, res.status);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Unable to connect to CardioSight backend API', 0, err);
  }
}

/**
 * Model status endpoint: GET /api/models/status
 */
export async function fetchModelStatus(): Promise<ModelStatusResponse> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/models/status`, {
      cache: 'no-store',
    }, 8000);
    if (!res.ok) {
      throw new ApiError(`Model status check failed: HTTP ${res.status}`, res.status);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Failed to fetch model status', 0, err);
  }
}

/**
 * Metrics endpoint: GET /api/metrics
 */
export async function fetchEvaluationMetrics(): Promise<EvaluationMetricsResponse> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/metrics`, {
      cache: 'no-store',
    }, 10000);
    if (!res.ok) {
      throw new ApiError(`Metrics fetch failed: HTTP ${res.status}`, res.status);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Failed to load evaluation metrics', 0, err);
  }
}

/**
 * Inference endpoint: POST /api/predict
 */
export async function predictCardiovascularRisk(
  formData: PatientInputFormData
): Promise<PredictionResponse> {
  const payload = formatPatientPayload(formData);

  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 15000);

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const detail = errJson?.detail
        ? typeof errJson.detail === 'string'
          ? errJson.detail
          : JSON.stringify(errJson.detail)
        : `Inference failed with status ${res.status}`;
      throw new ApiError(detail, res.status, errJson);
    }

    const data: PredictionResponse = await res.json();

    // Rigorous response validation
    if (!data || typeof data !== 'object' || !data.predictions) {
      throw new ApiError('Malformed prediction response: missing predictions object', 502);
    }

    const expectedTargets = ['Cath', 'LAD', 'LCX', 'RCA'];
    for (const target of expectedTargets) {
      const pred = data.predictions[target];
      if (!pred) {
        throw new ApiError(`Malformed prediction response: missing target '${target}'`, 502);
      }
      if (
        typeof pred.positive_probability !== 'number' ||
        !Number.isFinite(pred.positive_probability) ||
        pred.positive_probability < 0 ||
        pred.positive_probability > 1
      ) {
        throw new ApiError(`Invalid positive probability for '${target}' in prediction response`, 502);
      }
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'Network failure communicating with inference service',
      0,
      err
    );
  }
}

/**
 * Explainability endpoint: POST /api/explain
 */
export async function explainCardiovascularRisk(
  formData: PatientInputFormData,
  target: string = 'all',
  topN: number = 8
): Promise<ExplanationResponse> {
  const patientPayload = formatPatientPayload(formData);

  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient: patientPayload,
        target,
        top_n: topN,
      }),
    }, 20000);

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const detail = errJson?.detail
        ? typeof errJson.detail === 'string'
          ? errJson.detail
          : JSON.stringify(errJson.detail)
        : `Explanation failed with status ${res.status}`;
      throw new ApiError(detail, res.status, errJson);
    }

    const data: ExplanationResponse = await res.json();

    if (!data || typeof data !== 'object' || !data.explanations) {
      throw new ApiError('Malformed explain response: missing explanations object', 502);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'Failed to compute mathematical SHAP feature attribution',
      0,
      err
    );
  }
}
