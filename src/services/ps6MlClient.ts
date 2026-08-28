import { InterventionType } from './ps6Types';

const FASTAPI_BASE_URL = 'http://127.0.0.1:8000';

export interface EstimateStatePayload {
  correctness: number;
  recency_factor: number;
  explanation_quality: number;
  hint_count: number;
  task_difficulty: number;
  confidence: number;
  repeated_error_count: number;
}

export interface EstimateStateResponse {
  proficiency: number;
  mastery: number;
  misconception: {
    has_misconception: boolean;
    probability: number;
    status: 'none' | 'suspected' | 'active';
    severity: 'low' | 'medium' | 'high';
  };
  optimal_difficulty: number;
}

export interface RankActionsPayload {
  concept: string;
  current_mastery: number;
  learner_ability: number;
  has_misconception: boolean;
  budget_remaining: number;
  candidate_actions: InterventionType[];
}

export interface ActionCandidate {
  action: InterventionType;
  predicted_gain: number;
  cost: number;
  utility: number;
  target_difficulty: number;
  reason: string;
}

export interface RankActionsResponse {
  concept: string;
  budget_remaining: number;
  selected_intervention: ActionCandidate | null;
  all_ranked_candidates: ActionCandidate[];
}

export async function checkFastApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${FASTAPI_BASE_URL}/api/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function estimateLearnerStateML(payload: EstimateStatePayload): Promise<EstimateStateResponse> {
  try {
    const res = await fetch(`${FASTAPI_BASE_URL}/api/ml/estimate_state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.debug('[PS6 ML Client] FastAPI unavailable, using embedded TS ML estimator:', err);
  }

  // Embedded TS Fallback Estimator
  const proficiency = Math.min(0.98, Math.max(0.05, payload.correctness * 0.7 + payload.explanation_quality * 0.3));
  const hasMisc = payload.confidence > 0.6 && payload.correctness < 0.45;
  const mastery = Math.min(1.0, Math.max(0.0, payload.correctness * 0.6 + payload.explanation_quality * 0.4 - (hasMisc ? 0.2 : 0)));
  const optDiff = Math.min(0.95, Math.max(0.1, proficiency + (payload.correctness > 0.7 ? 0.15 : -0.1)));

  return {
    proficiency: Number(proficiency.toFixed(3)),
    mastery: Number(mastery.toFixed(3)),
    misconception: {
      has_misconception: hasMisc,
      probability: hasMisc ? 0.75 : 0.15,
      status: hasMisc ? (payload.repeated_error_count >= 2 ? 'active' : 'suspected') : 'none',
      severity: hasMisc ? (payload.confidence > 0.8 ? 'high' : 'medium') : 'low',
    },
    optimal_difficulty: Number(optDiff.toFixed(2)),
  };
}

export async function rankActionsML(payload: RankActionsPayload): Promise<RankActionsResponse> {
  try {
    const res = await fetch(`${FASTAPI_BASE_URL}/api/ml/rank_actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.debug('[PS6 ML Client] FastAPI unavailable, using embedded TS Action Ranker:', err);
  }

  // Embedded TS Fallback Action Ranker
  const actionCosts: Record<string, number> = {
    REVISION: 1, HINT: 1, EXPLANATION: 2, PREREQUISITE_REVIEW: 2,
    EASIER_CHALLENGE: 2, HARDER_CHALLENGE: 3, MISCONCEPTION_REMEDIATION: 3, SCENARIO_BRANCH: 3,
  };

  const ranked: ActionCandidate[] = payload.candidate_actions.map((act) => {
    const cost = actionCosts[act] || 2;
    let gain = 0.15;
    if (payload.has_misconception && act === 'MISCONCEPTION_REMEDIATION') gain = 0.38;
    else if (payload.current_mastery < 0.4 && (act === 'EXPLANATION' || act === 'PREREQUISITE_REVIEW')) gain = 0.32;
    else if (payload.current_mastery >= 0.7 && act === 'HARDER_CHALLENGE') gain = 0.28;
    else if (act === 'HINT') gain = 0.18;

    const utility = gain / cost;
    return {
      action: act,
      predicted_gain: Number(gain.toFixed(3)),
      cost,
      utility: Number(utility.toFixed(3)),
      target_difficulty: Number(Math.min(0.9, payload.learner_ability + 0.1).toFixed(2)),
      reason: `TS Engine: Recommended action '${act}' for concept '${payload.concept}' (predicted gain +${gain})`,
    };
  });

  ranked.sort((a, b) => b.utility - a.utility);

  return {
    concept: payload.concept,
    budget_remaining: payload.budget_remaining,
    selected_intervention: ranked[0] || null,
    all_ranked_candidates: ranked,
  };
}

export async function sendLearningEventToBackend(event: {
  learner_id?: string;
  session_id?: string;
  concept_id: string;
  question_difficulty?: number;
  correct: boolean;
  response_time_ms?: number;
  confidence?: number;
  intervention?: string;
  misconception_flag?: string;
}): Promise<any> {
  try {
    const res = await fetch(`${FASTAPI_BASE_URL}/api/learning/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.debug('[PS6 ML Client] Backend event sync deferred (local offline mode):', err);
  }
  return null;
}

export async function fetchBackendAnalytics(learnerId: string = 'default_learner'): Promise<any> {
  try {
    const res = await fetch(`${FASTAPI_BASE_URL}/api/analytics/${learnerId}`, {
      method: 'GET',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.debug('[PS6 ML Client] Analytics fetch fallback to local store:', err);
  }
  return null;
}

