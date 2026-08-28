from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
import datetime

class LearningEvent(BaseModel):
    learner_id: str = "learner_default"
    session_id: str = "session_1"
    concept_id: str
    activity_id: Optional[str] = "act_general"
    timestamp: Optional[str] = None
    
    question_difficulty: float = Field(0.5, ge=0.0, le=1.0)
    correct: bool = True
    response_time_ms: int = 15000
    attempt_number: int = 1
    
    hint_used: bool = False
    explanation_used: bool = False
    confidence: float = Field(0.5, ge=0.0, le=1.0)
    intervention: Optional[str] = None
    misconception_flag: Optional[str] = None
    user_explanation: Optional[str] = None

class ConceptMasterySchema(BaseModel):
    concept_id: str
    concept_name: str
    mastery_score: float
    confidence: float
    mastery_level: Literal["Beginner", "Developing", "Intermediate", "Proficient", "Mastered"]
    evidence_count: int
    last_updated: str

class MisconceptionSchema(BaseModel):
    concept_id: str
    concept_name: str
    has_misconception: bool
    probability: float
    severity: Literal["NONE", "LOW", "MEDIUM", "HIGH"]
    misconception_type: Literal["none", "careless_error", "knowledge_gap", "persistent_misconception"]
    evidence_count: int
    description: Optional[str] = None

class DifficultyEstimateSchema(BaseModel):
    recommended_difficulty: float
    difficulty_tier: Literal["EASY", "MEDIUM", "HARD", "EXPERT"]
    expected_success_probability: float
    confidence: float
    reason: str

class InterventionScoreSchema(BaseModel):
    action: str
    predicted_gain: float
    expected_success: float
    misconception_reduction: float
    utility: float
    cost: int
    confidence: float

class RankedActionSchema(BaseModel):
    selected_action: str
    ranked_actions: List[InterventionScoreSchema]
    expected_gain: float
    confidence: float
    reasoning: List[str]

class TrajectoryPointSchema(BaseModel):
    session: str
    timestamp: str
    concept_id: str
    mastery: float
    difficulty: float
    intervention: str
    learning_gain: float
    misconception_detected: bool

class PredictedFinalMasterySchema(BaseModel):
    current_mastery: float
    predicted_final_mastery: float
    confidence: float
    estimated_sessions: int
    trajectory: List[float]
    summary: str

class BeforeAfterOutcomeSchema(BaseModel):
    concept: str
    session: str
    before_mastery: float
    after_mastery: float
    absolute_gain: float
    relative_gain: float
    intervention_used: str
    status: str

class AdaptiveDecisionResponse(BaseModel):
    concept_id: str
    concept_name: str
    learner_state: Dict[str, Any]
    misconception: MisconceptionSchema
    difficulty: DifficultyEstimateSchema
    decision: Dict[str, Any]
    ranked_actions: List[InterventionScoreSchema]
    timestamp: str
