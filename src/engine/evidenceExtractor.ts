import { LearnerEvidence } from '../services/ps6Types';

export interface ExtractedInteractionEvidence {
  concepts_mentioned: string[];
  primary_concept: string;
  evidence_type: LearnerEvidence['evidence_type'];
  correctness_score: number;
  confidence_score: number;
  is_doubt_interruption: boolean;
  doubt_prerequisite?: string;
  has_misconception_signal: boolean;
  misconception_text?: string;
}

export function extractEvidenceFromConversation(
  userPrompt: string
): ExtractedInteractionEvidence {
  // Concept Extraction Regex / Heuristics
  const topicMatch = userPrompt.match(/(?:learn|teach me|explain|understand|about|help me with|working on)\s+([a-zA-Z0-9_\s]{3,30})/i);
  let primaryConcept = topicMatch ? topicMatch[1].trim().split(/\.|\?|,|and/)[0] : 'General Learning';
  
  // Clean up primary concept name
  primaryConcept = primaryConcept.replace(/^(the|a|an)\s+/i, '').replace(/concept|topic|problem/i, '').trim();
  if (!primaryConcept || primaryConcept.length < 2) primaryConcept = 'General Knowledge';
  primaryConcept = primaryConcept.charAt(0).toUpperCase() + primaryConcept.slice(1);

  // Doubt detection (e.g. "Wait, what is attention?", "I don't get derivatives")
  const isDoubt = /\b(wait|hold on|don't understand|what is|what are|why does|confused about|what does.*mean)\b/i.test(userPrompt);
  let doubtPrereq: string | undefined;
  if (isDoubt) {
    const prereqMatch = userPrompt.match(/(?:what is|what are|confused about|explain)\s+([a-zA-Z0-9_\s]{3,25})/i);
    if (prereqMatch) doubtPrereq = prereqMatch[1].trim();
  }

  // Evidence type detection
  let evidenceType: LearnerEvidence['evidence_type'] = 'chat_explanation';
  if (/\b(code|python|function|def|bug|error|failing|class|const)\b/i.test(userPrompt)) {
    evidenceType = 'code';
  } else if (/\b(why|how|because|my understanding is|so basically)\b/i.test(userPrompt)) {
    evidenceType = 'chat_explanation';
  } else if (/\b(solve|calculate|result|answer is)\b/i.test(userPrompt)) {
    evidenceType = 'problem_solving';
  } else if (isDoubt) {
    evidenceType = 'question';
  }

  // Correctness & Confidence estimation
  let correctness = 0.6;
  if (/\b(don't understand|confused|wrong|failing|help|stuck|error)\b/i.test(userPrompt)) {
    correctness = 0.25;
  } else if (/\b(i get it|makes sense|got it|understand now|ah okay|correct)\b/i.test(userPrompt)) {
    correctness = 0.90;
  }

  let confidence = 0.5;
  if (/\b(definitely|surely|obviously|i know|certainly)\b/i.test(userPrompt)) {
    confidence = 0.85;
  } else if (/\b(maybe|not sure|guess|possibly|think)\b/i.test(userPrompt)) {
    confidence = 0.35;
  }

  // Misconception Signals (high confidence + low correctness)
  const hasMisconceptionSignal = confidence > 0.7 && correctness < 0.4;
  const misconceptionText = hasMisconceptionSignal
    ? `Possible misconception on ${primaryConcept}: high confidence answer with incorrect conceptual basis.`
    : undefined;

  return {
    concepts_mentioned: [primaryConcept],
    primary_concept: primaryConcept,
    evidence_type: evidenceType,
    correctness_score: correctness,
    confidence_score: confidence,
    is_doubt_interruption: isDoubt,
    doubt_prerequisite: doubtPrereq,
    has_misconception_signal: hasMisconceptionSignal,
    misconception_text: misconceptionText,
  };
}
