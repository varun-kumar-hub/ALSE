export interface Concept {
  id: string;
  name: string;
  domain: string;
  description?: string;
  prerequisites: string[]; // Concept IDs
  difficulty: number; // 0.0 - 1.0
  created_at: string;
}

export interface ConceptRelationship {
  id: string;
  source_concept_id: string;
  target_concept_id: string;
  relationship_type: 'prerequisite' | 'related_to' | 'part_of' | 'depends_on' | 'contrasts_with';
}

export interface ConceptMastery {
  concept_id: string;
  concept_name: string;
  mastery: number; // 0.0 - 1.0
  confidence: number; // 0.0 - 1.0
  evidence_count: number;
  last_interaction: string;
  status: 'unknown' | 'learning' | 'mastered' | 'struggling';
}

export interface Misconception {
  id: string;
  concept_id: string;
  concept_name: string;
  description: string;
  status: 'suspected' | 'active' | 'under_remediation' | 'resolved';
  first_detected: string;
  last_detected: string;
  frequency: number;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
}

export interface LearnerEvidence {
  id: string;
  concept_id: string;
  concept_name: string;
  evidence_type: 'chat_explanation' | 'problem_solving' | 'code' | 'question' | 'correction' | 'practice' | 'hint_request' | 'research';
  correctness: number; // 0.0 - 1.0
  confidence_statement?: string;
  timestamp: string;
}

export type InterventionType =
  | 'REVISION'
  | 'NEW_CONCEPT'
  | 'HINT'
  | 'EXPLANATION'
  | 'EASIER_CHALLENGE'
  | 'HARDER_CHALLENGE'
  | 'SCENARIO_BRANCH'
  | 'EXAMPLE'
  | 'ANALOGY'
  | 'PRACTICE'
  | 'PREREQUISITE_REVIEW'
  | 'MISCONCEPTION_REMEDIATION'
  | 'RESEARCH'
  | 'REFLECTION';

export interface Intervention {
  id: string;
  concept_id: string;
  concept_name: string;
  type: InterventionType;
  predicted_gain: number;
  actual_gain?: number;
  target_difficulty: number;
  reason: string;
  timestamp: string;
}

export interface DecisionTrace {
  id: string;
  timestamp: string;
  concept: string;
  current_mastery: number;
  detected_gap: string;
  has_misconception: boolean;
  candidates: {
    action: InterventionType;
    predicted_gain: number;
    cost: number;
    utility: number;
    reason: string;
  }[];
  selected_action: InterventionType;
  selected_reason: string;
  outcome_gain?: number;
}

export interface StoryDecisionPoint {
  id: number;
  title: string;
  scenario: string;
  options: {
    id: string;
    text: string;
    is_correct: boolean;
    concept_id: string;
    misconception_flag?: string;
    next_point_id?: number;
  }[];
}

export interface StorySession {
  id: string;
  topic: string;
  current_step: number;
  total_steps: number;
  score: number;
  time_spent_seconds: number;
  budget_remaining: number;
  history: {
    step: number;
    selected_option_id: string;
    is_correct: boolean;
    intervention_applied: InterventionType;
    time_ms: number;
  }[];
}

export interface EvaluationResult {
  run_id: string;
  policy: 'fixed_baseline' | 'ps6_adaptive';
  learner_type: string;
  initial_mastery: number;
  final_mastery: number;
  learning_gain: number;
  interactions_count: number;
  time_spent_seconds: number;
  misconceptions_resolved: number;
}
