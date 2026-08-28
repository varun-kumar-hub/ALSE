import { extractEvidenceFromConversation } from './evidenceExtractor';
import { ps6Db } from '../services/ps6Database';
import { estimateLearnerStateML, rankActionsML } from '../services/ps6MlClient';
import {
  ConceptMastery,
  Misconception,
  LearnerEvidence,
  InterventionType,
  DecisionTrace,
} from '../services/ps6Types';

export interface ProcessedInteractionResult {
  primaryConcept: string;
  previousMastery: number;
  newMastery: number;
  newConfidence: number;
  isDoubtHandled: boolean;
  doubtTopic?: string;
  misconceptionDetected: boolean;
  misconceptionTitle?: string;
  selectedIntervention: InterventionType;
  interventionReason: string;
  decisionTrace: DecisionTrace;
}

export async function processLearnerInteraction(
  userPrompt: string,
  _assistantResponse: string,
  projectId?: string | null
): Promise<ProcessedInteractionResult> {
  const now = new Date().toISOString();
  
  // 1. OBSERVE & EXTRACT EVIDENCE
  const evidence = extractEvidenceFromConversation(userPrompt);
  const conceptName = evidence.primary_concept;
  const conceptId = conceptName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // Ensure concept exists in graph for active project
  let concept = ps6Db.getConcepts(projectId).find((c) => c.id === conceptId);
  if (!concept) {
    concept = {
      id: conceptId,
      name: conceptName,
      domain: 'General Learning',
      prerequisites: [],
      difficulty: 0.5,
      created_at: now,
    };
    ps6Db.saveConcept(concept, projectId);
  }

  // 2. UNDERSTAND CURRENT STATE & FETCH PRIOR MASTERY
  const existingMastery = ps6Db.getMasteryForConcept(conceptId, projectId);
  const currentMasteryVal = existingMastery ? existingMastery.mastery : 0.1;

  // 3. RUN ML ESTIMATORS (FastAPI service with local fallback)
  const mlState = await estimateLearnerStateML({
    correctness: evidence.correctness_score,
    recency_factor: 1.0,
    explanation_quality: evidence.correctness_score > 0.7 ? 0.8 : 0.3,
    hint_count: evidence.is_doubt_interruption ? 1 : 0,
    task_difficulty: concept.difficulty,
    confidence: evidence.confidence_score,
    repeated_error_count: evidence.has_misconception_signal ? 1 : 0,
  });

  // 4. UPDATE LEARNER STATE & SAVE EVIDENCE
  const evRecord: LearnerEvidence = {
    id: crypto.randomUUID(),
    concept_id: conceptId,
    concept_name: conceptName,
    evidence_type: evidence.evidence_type,
    correctness: evidence.correctness_score,
    confidence_statement: evidence.doubt_prerequisite ? `Doubt on: ${evidence.doubt_prerequisite}` : undefined,
    timestamp: now,
  };
  ps6Db.addEvidence(evRecord, projectId);

  const updatedMastery: ConceptMastery = {
    concept_id: conceptId,
    concept_name: conceptName,
    mastery: mlState.mastery,
    confidence: mlState.proficiency,
    evidence_count: (existingMastery?.evidence_count || 0) + 1,
    last_interaction: now,
    status: mlState.mastery >= 0.8 ? 'mastered' : mlState.mastery >= 0.5 ? 'learning' : 'struggling',
  };
  ps6Db.saveMastery(updatedMastery, projectId);

  // 5. MISCONCEPTION DETECTION & REMEDIATION TRACKING
  let misconceptionTitle: string | undefined;
  if (mlState.misconception.has_misconception) {
    const miscId = `misc_${conceptId}`;
    misconceptionTitle = evidence.misconception_text || `Misconception detected in ${conceptName}`;
    const newMisc: Misconception = {
      id: miscId,
      concept_id: conceptId,
      concept_name: conceptName,
      description: misconceptionTitle,
      status: mlState.misconception.status === 'none' ? 'suspected' : mlState.misconception.status,
      first_detected: now,
      last_detected: now,
      frequency: 1,
      confidence: mlState.misconception.probability,
      severity: mlState.misconception.severity,
    };
    ps6Db.saveMisconception(newMisc, projectId);
  }

  // 6. GENERATE CANDIDATE ACTIONS & RANK VIA ML MODEL
  const candidateActions: InterventionType[] = [
    'REVISION',
    'NEW_CONCEPT',
    'HINT',
    'EXPLANATION',
    'EASIER_CHALLENGE',
    'HARDER_CHALLENGE',
    'SCENARIO_BRANCH',
    'MISCONCEPTION_REMEDIATION',
    'PREREQUISITE_REVIEW',
  ];

  const rankingRes = await rankActionsML({
    concept: conceptName,
    current_mastery: mlState.mastery,
    learner_ability: mlState.proficiency,
    has_misconception: mlState.misconception.has_misconception,
    budget_remaining: 10,
    candidate_actions: candidateActions,
  });

  const selectedIntervention = rankingRes.selected_intervention
    ? rankingRes.selected_intervention.action
    : evidence.is_doubt_interruption
    ? 'PREREQUISITE_REVIEW'
    : 'EXPLANATION';

  const reason = rankingRes.selected_intervention
    ? rankingRes.selected_intervention.reason
    : 'Adaptive strategy recommendation based on observed evidence';

  // 7. RECORD DECISION TRACE (FOR JUDGE CONTROL VIEW & PROJECT HISTORY)
  const trace: DecisionTrace = {
    id: crypto.randomUUID(),
    timestamp: now,
    concept: conceptName,
    current_mastery: mlState.mastery,
    detected_gap: evidence.is_doubt_interruption
      ? `Doubt interruption on prerequisite: ${evidence.doubt_prerequisite || 'Prerequisite'}`
      : mlState.mastery < 0.5
      ? 'Low concept mastery & comprehension gap'
      : 'Ready for concept progression',
    has_misconception: mlState.misconception.has_misconception,
    candidates: rankingRes.all_ranked_candidates,
    selected_action: selectedIntervention,
    selected_reason: reason,
    outcome_gain: rankingRes.selected_intervention ? rankingRes.selected_intervention.predicted_gain : 0.2,
  };
  ps6Db.addDecisionTrace(trace, projectId);

  return {
    primaryConcept: conceptName,
    previousMastery: currentMasteryVal,
    newMastery: mlState.mastery,
    newConfidence: mlState.proficiency,
    isDoubtHandled: evidence.is_doubt_interruption,
    doubtTopic: evidence.doubt_prerequisite,
    misconceptionDetected: mlState.misconception.has_misconception,
    misconceptionTitle,
    selectedIntervention,
    interventionReason: reason,
    decisionTrace: trace,
  };
}
