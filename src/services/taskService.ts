/**
 * Task Tracking & Subject Milestones Service for LearnForge ALSE
 * Provides full task lifecycle, progress tracking, dynamic milestone generation,
 * and persistent storage for every individual learning subject.
 */

import { ProjectItem } from './database';

export type TaskType =
  | 'concept_mastery'
  | 'diagnostic_quiz'
  | 'story_challenge'
  | 'hands_on_coding'
  | 'prerequisite_review'
  | 'reflection';

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface SubjectTask {
  id: string;
  project_id: string;
  title: string;
  description: string;
  concept_id?: string;
  concept_name?: string;
  type: TaskType;
  difficulty: TaskDifficulty;
  status: TaskStatus;
  priority: TaskPriority;
  estimated_minutes: number;
  learning_gain_target?: number;
  completed_at?: string;
  created_at: string;
  action_payload?: {
    type: 'chat' | 'assessment' | 'story';
    prompt?: string;
    concept_id?: string;
  };
}

export interface SubjectTaskStats {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  progressPercent: number;
  totalEstimatedMinutes: number;
  remainingMinutes: number;
  highPriorityRemaining: number;
}

const STORAGE_PREFIX = 'learnforge_subject_tasks_';

function getStorageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId || 'general'}`;
}

// ── Built-in Curriculum Milestone Blueprints ─────────────────────────────────

const CURRICULUM_TASK_BLUEPRINTS: Record<string, Omit<SubjectTask, 'id' | 'project_id' | 'created_at' | 'status'>[]> = {
  'comm-linear-equations': [
    {
      title: 'C1: Variables & Algebraic Expressions Mastery',
      description: 'Understand letters as unknown numerical quantities rather than labels or physical objects. Overcome Misconception M1 (Letter-as-Object).',
      concept_id: 'c1_variables',
      concept_name: 'Variables & Expressions',
      type: 'concept_mastery',
      difficulty: 'beginner',
      priority: 'high',
      estimated_minutes: 15,
      learning_gain_target: 0.18,
      action_payload: {
        type: 'chat',
        prompt: 'Explain Concept C1 (Variables & Expressions) from pre-algebra. Focus on treating variables as unknown numbers rather than objects (3a != 3 apples). Give 3 diagnostic examples.',
        concept_id: 'c1_variables',
      },
    },
    {
      title: 'C2: Variable Substitution & Evaluation Diagnostic',
      description: 'Practice replacing variable placeholders with concrete rational and negative values to compute exact expressions.',
      concept_id: 'c2_substitution',
      concept_name: 'Substitution & Evaluation',
      type: 'diagnostic_quiz',
      difficulty: 'beginner',
      priority: 'medium',
      estimated_minutes: 10,
      learning_gain_target: 0.12,
      action_payload: {
        type: 'assessment',
        prompt: 'Generate 3 evaluation problems testing variable substitution with negative integers and fractions.',
        concept_id: 'c2_substitution',
      },
    },
    {
      title: 'C3: Equality & The Balance Scale Mental Model',
      description: 'Internalize the principle that "=" asserts equal weights; whatever algebraic operation is performed on one side must be performed on the other (M6 prevention).',
      concept_id: 'c3_equality',
      concept_name: 'Equality & Balance Model',
      type: 'concept_mastery',
      difficulty: 'intermediate',
      priority: 'high',
      estimated_minutes: 15,
      learning_gain_target: 0.20,
      action_payload: {
        type: 'chat',
        prompt: 'Teach the Balance Model of Equality (Concept C3). Explain why operating on only one side produces invalid equations (Misconception M6).',
        concept_id: 'c3_equality',
      },
    },
    {
      title: 'C4: Inverse Operations & One-Step Isolation',
      description: 'Apply exact opposite mathematical operations (+ vs -, * vs /) to isolate the variable without sign confusion (M2 & M4 remediation).',
      concept_id: 'c4_inverse_ops',
      concept_name: 'Inverse Operations',
      type: 'hands_on_coding',
      difficulty: 'intermediate',
      priority: 'high',
      estimated_minutes: 20,
      learning_gain_target: 0.22,
      action_payload: {
        type: 'chat',
        prompt: 'Give me 4 one-step equation challenges where inverse operations are often confused (e.g., -3x = 12 or x/(-2) = 5). Let me solve them step-by-step.',
        concept_id: 'c4_inverse_ops',
      },
    },
    {
      title: 'C5: Two-Step Equation Sequencing Strategy',
      description: 'Master the proper order of undoing operations: eliminate constants first before clearing coefficients.',
      concept_id: 'c5_two_step',
      concept_name: 'Two-Step Equations',
      type: 'concept_mastery',
      difficulty: 'intermediate',
      priority: 'high',
      estimated_minutes: 20,
      learning_gain_target: 0.24,
      action_payload: {
        type: 'assessment',
        prompt: 'Create a 2-step linear equation diagnostic quiz testing 2x + 7 = 19 and 5 - 3x = -10.',
        concept_id: 'c5_two_step',
      },
    },
    {
      title: 'C6: Combining Like Terms Remediation',
      description: 'Combine only terms with identical variable bases. Extinguish Misconception M5 (Illicit term combinations such as 3x + 2 = 5x).',
      concept_id: 'c6_like_terms',
      concept_name: 'Combining Like Terms',
      type: 'prerequisite_review',
      difficulty: 'beginner',
      priority: 'medium',
      estimated_minutes: 15,
      learning_gain_target: 0.16,
      action_payload: {
        type: 'chat',
        prompt: 'Explain why 3x + 2 cannot be simplified to 5x. Provide visual geometric representations using algebra tiles.',
        concept_id: 'c6_like_terms',
      },
    },
    {
      title: 'C7: Distributive Property & Bracket Clearing',
      description: 'Apply a(b + c) = ab + ac to every single term inside parentheses without omitting downstream signs (M3 remediation).',
      concept_id: 'c7_distributive',
      concept_name: 'Distributive Property',
      type: 'hands_on_coding',
      difficulty: 'intermediate',
      priority: 'high',
      estimated_minutes: 20,
      learning_gain_target: 0.22,
      action_payload: {
        type: 'chat',
        prompt: 'Give me practice exercises on expanding negative brackets such as -4(2x - 5) = 12 and verify each step.',
        concept_id: 'c7_distributive',
      },
    },
    {
      title: 'C8: Variables on Both Sides Synthesis Challenge',
      description: 'Collect all variable terms onto one side and constant terms onto the opposite side cleanly.',
      concept_id: 'c8_variables_both_sides',
      concept_name: 'Variables on Both Sides',
      type: 'story_challenge',
      difficulty: 'advanced',
      priority: 'high',
      estimated_minutes: 25,
      learning_gain_target: 0.28,
      action_payload: {
        type: 'story',
        prompt: 'Start an adaptive story challenge involving balancing automated inventory rates modeled by 5x + 12 = 2x + 39.',
        concept_id: 'c8_variables_both_sides',
      },
    },
    {
      title: 'C9: Equations with Fractions & LCD Clearing',
      description: 'Multiply every single term by the lowest common denominator to eliminate rational fractions cleanly (M7 remediation).',
      concept_id: 'c9_fractions',
      concept_name: 'Equations with Fractions',
      type: 'hands_on_coding',
      difficulty: 'advanced',
      priority: 'medium',
      estimated_minutes: 25,
      learning_gain_target: 0.25,
      action_payload: {
        type: 'chat',
        prompt: 'Walk through clearing denominators in (x/3) + (x/4) = 7 step-by-step and test my solution.',
        concept_id: 'c9_fractions',
      },
    },
    {
      title: 'C10: Word Problems to Linear Formulations',
      description: 'Translate realistic real-world relationships and rate problems into valid single-variable equations without reversal errors (M8).',
      concept_id: 'c10_word_problems',
      concept_name: 'Word Problems to Equations',
      type: 'reflection',
      difficulty: 'advanced',
      priority: 'high',
      estimated_minutes: 30,
      learning_gain_target: 0.30,
      action_payload: {
        type: 'chat',
        prompt: 'Present 3 real-world word problems (age, motion, mixture) and guide me through identifying variables, relations, and algebraic equations.',
        concept_id: 'c10_word_problems',
      },
    },
  ],

  'comm-dl-backprop': [
    {
      title: 'Scalar Loss Jacobians & Reverse-Mode AutoDiff',
      description: 'Derive vector-Jacobian products and understand why reverse-mode automatic differentiation computes all parameter gradients in O(1) time.',
      concept_id: 'autodiff_jacobians',
      concept_name: 'Automatic Differentiation',
      type: 'concept_mastery',
      difficulty: 'intermediate',
      priority: 'high',
      estimated_minutes: 20,
      learning_gain_target: 0.25,
      action_payload: {
        type: 'chat',
        prompt: 'Derive the computational complexity of reverse-mode automatic differentiation vs forward-mode for scalar loss functions in deep neural networks.',
      },
    },
    {
      title: 'Vanishing Gradient Diagnostic in Deep MLPs',
      description: 'Analyze why 12-layer sigmoid MLPs fail to train and contrast with modern ReLU/GELU activation dynamics and residual skip connections.',
      concept_id: 'vanishing_gradients',
      concept_name: 'Vanishing & Exploding Gradients',
      type: 'diagnostic_quiz',
      difficulty: 'intermediate',
      priority: 'high',
      estimated_minutes: 15,
      learning_gain_target: 0.20,
      action_payload: {
        type: 'assessment',
        prompt: 'Generate an assessment on vanishing gradient mathematical proofs and remedies in deep architectures.',
      },
    },
    {
      title: 'Adam vs SGD Optimizer Tuning Dilemma',
      description: 'Compare first-moment momentum and second-moment squared gradient scaling in Adam against SGD with Nesterov momentum.',
      concept_id: 'optimizer_algorithms',
      concept_name: 'Optimizers & Learning Rates',
      type: 'story_challenge',
      difficulty: 'advanced',
      priority: 'high',
      estimated_minutes: 25,
      learning_gain_target: 0.28,
      action_payload: {
        type: 'story',
        prompt: 'Start the Deep Learning Story Challenge focusing on training convergence collapse and optimizer selection.',
      },
    },
    {
      title: 'PyTorch Custom Autograd Function Implementation',
      description: 'Implement a custom PyTorch autograd.Function with explicit forward and backward tensor vector-Jacobian calculations.',
      concept_id: 'pytorch_autograd',
      concept_name: 'PyTorch Autograd Engine',
      type: 'hands_on_coding',
      difficulty: 'advanced',
      priority: 'medium',
      estimated_minutes: 30,
      learning_gain_target: 0.26,
      action_payload: {
        type: 'chat',
        prompt: 'Show me how to write a production PyTorch custom autograd Function in Python with unit tests verifying gradcheck.',
      },
    },
    {
      title: 'Loss Landscapes & Cross-Entropy Numerical Stability',
      description: 'Study log-sum-exp numerical stabilization and softmax probability saturation in multi-class classification objectives.',
      concept_id: 'loss_landscapes',
      concept_name: 'Loss Landscapes & Stability',
      type: 'reflection',
      difficulty: 'intermediate',
      priority: 'medium',
      estimated_minutes: 15,
      learning_gain_target: 0.18,
      action_payload: {
        type: 'chat',
        prompt: 'Explain the LogSumExp trick in cross-entropy loss calculation and why naive softmax exponentiation causes floating-point overflow.',
      },
    },
  ],

  'comm-os-concurrency': [
    {
      title: 'POSIX Mutex & Race Condition Prevention Checkpoint',
      description: 'Identify critical section hazards in multi-threaded C/C++ and apply pthread mutexes and atomics safely.',
      concept_id: 'race_conditions',
      concept_name: 'Race Conditions & Synchronization',
      type: 'concept_mastery',
      difficulty: 'intermediate',
      priority: 'high',
      estimated_minutes: 20,
      learning_gain_target: 0.24,
      action_payload: {
        type: 'chat',
        prompt: 'Explain race conditions in POSIX multi-threading and show a code example with before/after mutex synchronization.',
      },
    },
    {
      title: "Banker's Algorithm & Deadlock Avoidance Challenge",
      description: "Evaluate Dijkstra's Banker's algorithm, resource allocation graphs, and Coffman deadlock conditions.",
      concept_id: 'deadlocks',
      concept_name: 'Deadlock Detection & Avoidance',
      type: 'story_challenge',
      difficulty: 'advanced',
      priority: 'high',
      estimated_minutes: 25,
      learning_gain_target: 0.28,
      action_payload: {
        type: 'story',
        prompt: 'Launch an operating system scenario challenge on kernel thread deadlocks and priority inversion.',
      },
    },
    {
      title: 'Virtual Memory Multi-Level Paging & TLB Optimization',
      description: 'Calculate physical address translation from virtual addresses, page table entries, and TLB hit ratios.',
      concept_id: 'virtual_memory',
      concept_name: 'Virtual Memory & Paging',
      type: 'diagnostic_quiz',
      difficulty: 'advanced',
      priority: 'high',
      estimated_minutes: 20,
      learning_gain_target: 0.22,
      action_payload: {
        type: 'assessment',
        prompt: 'Test my knowledge on multi-level page tables, page faults, and TLB miss handling in Linux x86_64.',
      },
    },
    {
      title: 'Multi-Level Feedback Queue (MLFQ) CPU Scheduling',
      description: 'Analyze time-slice preemption, interactive I/O prioritization, and CPU starvation prevention mechanisms.',
      concept_id: 'cpu_scheduling',
      concept_name: 'CPU Scheduling Algorithms',
      type: 'hands_on_coding',
      difficulty: 'intermediate',
      priority: 'medium',
      estimated_minutes: 20,
      learning_gain_target: 0.20,
      action_payload: {
        type: 'chat',
        prompt: 'Design a simulation of a Multi-Level Feedback Queue scheduler in Python with priority decay and boost rules.',
      },
    },
    {
      title: 'Producer-Consumer Synchronization with Semaphores',
      description: 'Implement bounded buffer synchronization using binary and counting semaphores with condition variables.',
      concept_id: 'semaphores',
      concept_name: 'Semaphores & Monitors',
      type: 'hands_on_coding',
      difficulty: 'intermediate',
      priority: 'medium',
      estimated_minutes: 25,
      learning_gain_target: 0.24,
      action_payload: {
        type: 'chat',
        prompt: 'Implement the classical Producer-Consumer problem using POSIX semaphores and condition variables in C.',
      },
    },
  ],

  'comm-system-design-raft': [
    {
      title: 'Raft Leader Election & Randomized Timeout Verification',
      description: 'Understand heartbeats, term monotonicity, candidate states, and majority quorum election mechanics.',
      concept_id: 'leader_election',
      concept_name: 'Raft Leader Election',
      type: 'concept_mastery',
      difficulty: 'intermediate',
      priority: 'high',
      estimated_minutes: 20,
      learning_gain_target: 0.25,
      action_payload: {
        type: 'chat',
        prompt: 'Explain the Raft leader election algorithm, election timeouts, and how split votes are resolved cleanly.',
      },
    },
    {
      title: 'Log Replication & State Machine Safety Invariants',
      description: 'Trace AppendEntries RPCs, commitIndex advancement, and log matching property proofs.',
      concept_id: 'log_replication',
      concept_name: 'Log Replication & Safety',
      type: 'diagnostic_quiz',
      difficulty: 'advanced',
      priority: 'high',
      estimated_minutes: 20,
      learning_gain_target: 0.24,
      action_payload: {
        type: 'assessment',
        prompt: 'Generate an assessment on Raft log replication invariants, log inconsistencies, and recovery protocols.',
      },
    },
    {
      title: 'Network Partition & Split-Brain Cluster Reconciliation',
      description: 'Simulate a 5-node cluster partition (3 nodes vs 2 nodes) and prove why the minority partition rejects writes.',
      concept_id: 'network_partitions',
      concept_name: 'Cluster Partitions & Recovery',
      type: 'story_challenge',
      difficulty: 'advanced',
      priority: 'high',
      estimated_minutes: 25,
      learning_gain_target: 0.30,
      action_payload: {
        type: 'story',
        prompt: 'Start an interactive distributed systems story challenge involving network partitions and leader unreachability.',
      },
    },
    {
      title: 'Vector Clocks vs Lamport Timestamps Causal Ordering',
      description: 'Calculate partial ordering of events, concurrent message detection, and conflict resolution in distributed key-value stores.',
      concept_id: 'vector_clocks',
      concept_name: 'Causality & Vector Clocks',
      type: 'hands_on_coding',
      difficulty: 'intermediate',
      priority: 'medium',
      estimated_minutes: 20,
      learning_gain_target: 0.22,
      action_payload: {
        type: 'chat',
        prompt: 'Write a Python implementation of Vector Clocks demonstrating concurrent message detection and causality violation.',
      },
    },
    {
      title: 'Distributed Transactions: 2PC vs Paxos/Raft Consensus',
      description: 'Analyze coordinator failure modes in Two-Phase Commit and contrast with consensus-backed transactional logs.',
      concept_id: 'distributed_transactions',
      concept_name: 'Distributed Commit Protocols',
      type: 'reflection',
      difficulty: 'advanced',
      priority: 'medium',
      estimated_minutes: 20,
      learning_gain_target: 0.22,
      action_payload: {
        type: 'chat',
        prompt: 'Contrast Two-Phase Commit (2PC) with Raft/Paxos consensus for high-throughput distributed database transactions.',
      },
    },
  ],

  'comm-quantum-mechanics': [
    {
      title: 'Qubit Superposition & Bloch Sphere State Vectors',
      description: 'Master Dirac ket notation, probability amplitude normalization |alpha|^2 + |beta|^2 = 1, and geometric sphere representation.',
      concept_id: 'qubit_superposition',
      concept_name: 'Qubits & Superposition',
      type: 'concept_mastery',
      difficulty: 'intermediate',
      priority: 'high',
      estimated_minutes: 20,
      learning_gain_target: 0.25,
      action_payload: {
        type: 'chat',
        prompt: 'Explain quantum superposition, the Bloch sphere representation of single-qubit states, and normalization constraints.',
      },
    },
    {
      title: 'Quantum Logic Gates & Unitary Matrix Operations',
      description: 'Compute matrix multiplications for Hadamard (H), Pauli-X/Y/Z, and Phase (S/T) reversible quantum operators.',
      concept_id: 'quantum_gates',
      concept_name: 'Quantum Gates & Unitaries',
      type: 'diagnostic_quiz',
      difficulty: 'intermediate',
      priority: 'high',
      estimated_minutes: 20,
      learning_gain_target: 0.22,
      action_payload: {
        type: 'assessment',
        prompt: 'Generate an assessment testing unitary matrix representations of quantum logic gates and composite circuit states.',
      },
    },
    {
      title: 'Quantum Entanglement & Bell State Generation',
      description: 'Construct the 4 maximally entangled Bell states using Hadamard and Controlled-NOT (CNOT) gate pairs.',
      concept_id: 'entanglement',
      concept_name: 'Entanglement & Bell States',
      type: 'hands_on_coding',
      difficulty: 'advanced',
      priority: 'high',
      estimated_minutes: 25,
      learning_gain_target: 0.28,
      action_payload: {
        type: 'chat',
        prompt: 'Write Qiskit / Cirq Python code to prepare the 4 Bell states and verify entanglement via statevector simulation.',
      },
    },
    {
      title: 'Quantum Teleportation Protocol Verification',
      description: 'Step through the 3-qubit teleportation protocol utilizing shared entanglement, Bell measurement, and classical correction gates.',
      concept_id: 'quantum_teleportation',
      concept_name: 'Quantum Protocols',
      type: 'story_challenge',
      difficulty: 'advanced',
      priority: 'high',
      estimated_minutes: 30,
      learning_gain_target: 0.30,
      action_payload: {
        type: 'story',
        prompt: 'Launch a quantum mechanics story challenge verifying the no-cloning theorem and quantum teleportation fidelity.',
      },
    },
    {
      title: 'Measurement Collapse & Expectation Value Calculations',
      description: 'Calculate Hermitian operator measurement outcomes, eigenvalue probabilities, and post-measurement state collapse.',
      concept_id: 'quantum_measurement',
      concept_name: 'Measurement & Observables',
      type: 'reflection',
      difficulty: 'intermediate',
      priority: 'medium',
      estimated_minutes: 15,
      learning_gain_target: 0.20,
      action_payload: {
        type: 'chat',
        prompt: 'Guide me through computing expectation values <psi|M|psi> for Pauli spin observables on mixed states.',
      },
    },
  ],
};

// ── Domain & Depth Taxonomy Detection ────────────────────────────────────────

export type SubjectDomain =
  | 'humanities_social'   // History, Social, Geography, Civics, Politics, Sociology, Philosophy, Law, Literature
  | 'computer_science'    // Python, AI, ML, Deep Learning, Networks, OS, Data Structures, Algorithms, Cloud
  | 'mathematics'         // Linear Equations, Algebra, Calculus, Statistics, Geometry, Math
  | 'natural_sciences'    // Physics, Chemistry, Biology, Medicine, Astronomy, Genetics
  | 'business_finance'    // Economics, Finance, Accounting, Marketing, Management, Strategy
  | 'languages'           // English, Spanish, Grammar, French, Linguistics
  | 'general_applied';    // Multidisciplinary / General

export interface DepthConfig {
  level: 'introductory' | 'standard' | 'deep' | 'mastery_specialization';
  taskCount: number;
  label: string;
}

export function detectSubjectDomain(project: Partial<ProjectItem>): SubjectDomain {
  const combinedText = `${project.name || ''} ${project.topic || ''} ${project.description || ''} ${(project.tags || []).join(' ')}`.toLowerCase();

  // 1. Social Sciences & Humanities
  if (
    /\b(social|history|historical|geography|civics|political|politics|sociology|philosophy|humanities|government|constitution|law|legal|literature|civilization|culture|archaeology|ethics|anthropology|world war|revolutions|dynasty|colonial|ancient)\b/i.test(
      combinedText
    )
  ) {
    return 'humanities_social';
  }

  // 2. Computer Science & Software
  if (
    /\b(python|javascript|typescript|c\+\+|java|rust|golang|sql|react|node|docker|kubernetes|linux|kernel|operating system|concurrency|networking|network|backpropagation|neural network|machine learning|deep learning|data structure|algorithm|distributed system|raft|cloud|cybersecurity|software|database|devops|backend|frontend|api)\b/i.test(
      combinedText
    )
  ) {
    return 'computer_science';
  }

  // 3. Mathematics
  if (
    /\b(math|mathematics|algebra|linear equation|calculus|derivative|integral|matrix|matrices|geometry|trigonometry|statistics|probability|discrete|number theory|equation|arithmetic|pre-algebra)\b/i.test(
      combinedText
    )
  ) {
    return 'mathematics';
  }

  // 4. Natural Sciences
  if (
    /\b(physics|quantum|mechanics|thermodynamics|chemistry|organic|inorganic|biology|biological|genetics|dna|ecology|cell|anatomy|pathology|medicine|biochemistry|astronomy|neuroscience)\b/i.test(
      combinedText
    )
  ) {
    return 'natural_sciences';
  }

  // 5. Business & Economics
  if (
    /\b(economics|economic|finance|financial|accounting|marketing|business|management|valuation|entrepreneurship|commerce|macroeconomics|microeconomics|corporate|investment)\b/i.test(
      combinedText
    )
  ) {
    return 'business_finance';
  }

  // 6. Languages & Linguistics
  if (
    /\b(english|grammar|spanish|french|german|japanese|chinese|vocabulary|linguistics|composition|writing skills|literature analysis|phonetics)\b/i.test(
      combinedText
    )
  ) {
    return 'languages';
  }

  return 'general_applied';
}

export function detectTopicDepth(project: Partial<ProjectItem>): DepthConfig {
  const combinedText = `${project.name || ''} ${project.topic || ''} ${project.description || ''} ${project.goal || ''} ${(project.tags || []).join(' ')}`.toLowerCase();
  const budget = project.learning_budget || 35;

  const hasSpecialization = /\b(advanced|deep dive|comprehensive|specialization|distributed|backprop|quantum|mastery|kernel|operating systems|macroeconomics|constitutional law|calculus iii|internals|in-depth|architecture)\b/i.test(
    combinedText
  );
  const hasIntro = /\b(intro|introduction|basics|beginner|fundamentals 101|quickstart|overview|crash course|essentials)\b/i.test(
    combinedText
  );

  if (budget >= 50 || (hasSpecialization && budget >= 35)) {
    return { level: 'mastery_specialization', taskCount: 8, label: 'Deep Specialization (8 Milestones)' };
  } else if (budget >= 40 || hasSpecialization) {
    return { level: 'deep', taskCount: 6, label: 'Comprehensive (6 Milestones)' };
  } else if (budget <= 15 || (hasIntro && budget <= 25)) {
    return { level: 'introductory', taskCount: 3, label: 'Introductory Core (3 Milestones)' };
  } else {
    return { level: 'standard', taskCount: 5, label: 'Standard Curriculum (5 Milestones)' };
  }
}

/**
 * Procedurally generates domain-appropriate, depth-scaled curriculum tasks for any subject.
 */
export function generateDefaultTasksForSubject(project: ProjectItem): SubjectTask[] {
  const now = new Date().toISOString();
  const titleName = project.name || 'Core Domain';
  const topicName = project.topic || titleName;
  const domain = detectSubjectDomain(project);
  const depth = detectTopicDepth(project);

  type RawTask = Omit<SubjectTask, 'id' | 'project_id' | 'created_at' | 'status'>;
  let pool: RawTask[] = [];

  switch (domain) {
    case 'humanities_social':
      pool = [
        {
          title: `Historical & Geographical Context of ${titleName}`,
          description: `Establish chronological context, geographical background, and core definitions for ${topicName}.`,
          concept_name: 'Historical Foundations',
          type: 'concept_mastery',
          difficulty: 'beginner',
          priority: 'high',
          estimated_minutes: 15,
          learning_gain_target: 0.18,
          action_payload: {
            type: 'chat',
            prompt: `Introduce the foundational historical and social context, timeline milestones, and key terminology for ${titleName}. Explain the underlying causes and geographical factors.`,
          },
        },
        {
          title: `Primary Source Analysis & Evidence Evaluation`,
          description: `Critically evaluate historical documents, treaties, speeches, maps, or records related to ${topicName}. Identify perspective and bias.`,
          concept_name: 'Source Analysis',
          type: 'concept_mastery',
          difficulty: 'intermediate',
          priority: 'high',
          estimated_minutes: 20,
          learning_gain_target: 0.22,
          action_payload: {
            type: 'chat',
            prompt: `Provide a critical primary source excerpt or key historical evidence related to ${titleName}. Guide me through analyzing historical perspectives, motives, and reliability.`,
          },
        },
        {
          title: `Diagnostic Assessment on Events, Institutions & Causes`,
          description: `Test understanding of key historical dates, institutional frameworks, social movements, and decisive turning points in ${topicName}.`,
          concept_name: 'Diagnostic Baseline',
          type: 'diagnostic_quiz',
          difficulty: 'intermediate',
          priority: 'high',
          estimated_minutes: 15,
          learning_gain_target: 0.20,
          action_payload: {
            type: 'assessment',
            prompt: `Generate a 4-question conceptual and analytical diagnostic quiz evaluating major events, causes, and societal consequences in ${titleName}.`,
          },
        },
        {
          title: `Pivotal Turning Points & Socio-Political Dilemma`,
          description: `Analyze historical trade-offs, conflicting stakeholder viewpoints, and consequence chains during critical moments in ${topicName}.`,
          concept_name: 'Historical Decision Simulation',
          type: 'story_challenge',
          difficulty: 'advanced',
          priority: 'high',
          estimated_minutes: 25,
          learning_gain_target: 0.26,
          action_payload: {
            type: 'story',
            prompt: `Start an interactive historical scenario challenge where I examine a pivotal dilemma, conflicting interests, and alternative outcomes in ${titleName}.`,
          },
        },
        {
          title: `Historiographical Debate & Competing Perspectives`,
          description: `Contrast different scholarly interpretations, economic drivers, and social dynamics shaping ${topicName}.`,
          concept_name: 'Historiographical Analysis',
          type: 'concept_mastery',
          difficulty: 'advanced',
          priority: 'medium',
          estimated_minutes: 20,
          learning_gain_target: 0.24,
          action_payload: {
            type: 'chat',
            prompt: `Examine competing historical interpretations or sociological frameworks regarding ${titleName}. Compare political vs socio-economic viewpoints.`,
          },
        },
        {
          title: `Comparative Cross-Era & Regional Case Study`,
          description: `Examine parallels, constitutional models, and institutional developments across different regions or epochs in ${topicName}.`,
          concept_name: 'Comparative Synthesis',
          type: 'story_challenge',
          difficulty: 'advanced',
          priority: 'medium',
          estimated_minutes: 25,
          learning_gain_target: 0.27,
          action_payload: {
            type: 'story',
            prompt: `Launch a comparative case study challenge contrasting the policies, governance, and societal impacts of ${titleName} with related historical movements.`,
          },
        },
        {
          title: `Ethical, Cultural & Constitutional Legacy Review`,
          description: `Analyze long-term human rights developments, constitutional precedents, and enduring cultural impacts of ${topicName}.`,
          concept_name: 'Institutional Legacy',
          type: 'reflection',
          difficulty: 'advanced',
          priority: 'medium',
          estimated_minutes: 20,
          learning_gain_target: 0.25,
          action_payload: {
            type: 'chat',
            prompt: `Deconstruct the enduring institutional, ethical, and cultural legacy of ${titleName}. What lasting impact did it leave on modern governance and society?`,
          },
        },
        {
          title: `Capstone Historical Synthesis & Thesis Defense`,
          description: `Synthesize comprehensive mastery across all themes of ${titleName}. Formulate an evidence-backed thesis on its historical significance.`,
          concept_name: 'Capstone Synthesis',
          type: 'reflection',
          difficulty: 'advanced',
          priority: 'high',
          estimated_minutes: 30,
          learning_gain_target: 0.30,
          action_payload: {
            type: 'chat',
            prompt: `Conduct a capstone oral defense and synthesis on ${titleName}. Ask me comprehensive analytical questions to evaluate my historical reasoning.`,
          },
        },
      ];
      break;

    case 'computer_science':
      pool = [
        {
          title: `Foundations & Architectural Mental Models of ${titleName}`,
          description: `Establish core definitions, underlying protocols, data models, and system abstractions in ${topicName}.`,
          concept_name: 'Core Foundations',
          type: 'concept_mastery',
          difficulty: 'beginner',
          priority: 'high',
          estimated_minutes: 15,
          learning_gain_target: 0.20,
          action_payload: {
            type: 'chat',
            prompt: `Teach me the fundamental architecture, mental models, and core execution mechanisms of ${titleName}.`,
          },
        },
        {
          title: `Diagnostic Code & Protocol Assessment on ${titleName}`,
          description: `Test understanding of syntax, control flows, data structures, and edge-case invariants in ${topicName}.`,
          concept_name: 'Diagnostic Baseline',
          type: 'diagnostic_quiz',
          difficulty: 'intermediate',
          priority: 'high',
          estimated_minutes: 15,
          learning_gain_target: 0.18,
          action_payload: {
            type: 'assessment',
            prompt: `Generate a 4-question technical assessment evaluating algorithmic logic and code comprehension in ${titleName}.`,
          },
        },
        {
          title: `Hands-on Implementation & Algorithmic Practice`,
          description: `Implement core algorithms, data processing pipelines, or system components in ${topicName}.`,
          concept_name: 'Hands-on Implementation',
          type: 'hands_on_coding',
          difficulty: 'intermediate',
          priority: 'high',
          estimated_minutes: 25,
          learning_gain_target: 0.25,
          action_payload: {
            type: 'chat',
            prompt: `Give me a hands-on programming challenge for ${titleName}. Let me write the solution step-by-step with your review.`,
          },
        },
        {
          title: `Concurrency, Boundary Cases & Bug Remediation`,
          description: `Diagnose subtle race conditions, off-by-one errors, memory leaks, or network traps in ${topicName}.`,
          concept_name: 'Debugging & Edge Cases',
          type: 'story_challenge',
          difficulty: 'advanced',
          priority: 'high',
          estimated_minutes: 25,
          learning_gain_target: 0.28,
          action_payload: {
            type: 'story',
            prompt: `Launch an interactive debugging story challenge involving system edge cases and failure modes in ${titleName}.`,
          },
        },
        {
          title: `Performance Profiling & Scalability Optimization`,
          description: `Analyze asymptotic complexity, caching strategies, and latency/throughput bottlenecks in ${topicName}.`,
          concept_name: 'Performance Optimization',
          type: 'hands_on_coding',
          difficulty: 'advanced',
          priority: 'medium',
          estimated_minutes: 25,
          learning_gain_target: 0.26,
          action_payload: {
            type: 'chat',
            prompt: `Walk me through benchmarking and optimizing algorithmic performance and resource efficiency in ${titleName}.`,
          },
        },
        {
          title: `Fault Tolerance & Distributed Resilience Simulation`,
          description: `Simulate node crashes, partition recovery, and state synchronization challenges in ${topicName}.`,
          concept_name: 'Resilience Engineering',
          type: 'story_challenge',
          difficulty: 'advanced',
          priority: 'high',
          estimated_minutes: 30,
          learning_gain_target: 0.30,
          action_payload: {
            type: 'story',
            prompt: `Simulate a critical infrastructure failover and recovery scenario in ${titleName}.`,
          },
        },
        {
          title: `Production Deployment & Security Hardening`,
          description: `Review secure API boundaries, authentication invariants, and telemetry instrumentation for ${topicName}.`,
          concept_name: 'Security & Production',
          type: 'concept_mastery',
          difficulty: 'advanced',
          priority: 'medium',
          estimated_minutes: 20,
          learning_gain_target: 0.24,
          action_payload: {
            type: 'chat',
            prompt: `Explain production security best practices, vulnerability vectors, and monitoring patterns in ${titleName}.`,
          },
        },
        {
          title: `Capstone System Architecture & Design Review`,
          description: `Synthesize comprehensive mastery across all modules of ${titleName}. Formulate scalable architecture trade-offs.`,
          concept_name: 'Capstone Architecture',
          type: 'reflection',
          difficulty: 'advanced',
          priority: 'high',
          estimated_minutes: 30,
          learning_gain_target: 0.30,
          action_payload: {
            type: 'chat',
            prompt: `Conduct a comprehensive system design review of ${titleName}. Ask me architectural questions to prove mastery.`,
          },
        },
      ];
      break;

    case 'mathematics':
      pool = [
        {
          title: `Axiomatic Foundations & Mental Models of ${titleName}`,
          description: `Understand mathematical notations, basis definitions, and visual mental models for ${topicName}.`,
          concept_name: 'Mathematical Foundations',
          type: 'concept_mastery',
          difficulty: 'beginner',
          priority: 'high',
          estimated_minutes: 15,
          learning_gain_target: 0.18,
          action_payload: {
            type: 'chat',
            prompt: `Teach me the fundamental axioms, definitions, and geometric/algebraic intuition behind ${titleName}.`,
          },
        },
        {
          title: `Symbolic & Formulaic Diagnostic Quiz on ${titleName}`,
          description: `Test precision in manipulating formulas, evaluating terms, and applying algebraic identities in ${topicName}.`,
          concept_name: 'Diagnostic Baseline',
          type: 'diagnostic_quiz',
          difficulty: 'intermediate',
          priority: 'high',
          estimated_minutes: 15,
          learning_gain_target: 0.20,
          action_payload: {
            type: 'assessment',
            prompt: `Generate a 4-question calculation and concept assessment evaluating fundamental equations in ${titleName}.`,
          },
        },
        {
          title: `Step-by-Step Proofs & Algebraic Derivations`,
          description: `Practice rigorous step-by-step transformations, variable isolation, and theorem proofs in ${topicName}.`,
          concept_name: 'Analytical Proofs',
          type: 'concept_mastery',
          difficulty: 'intermediate',
          priority: 'high',
          estimated_minutes: 20,
          learning_gain_target: 0.24,
          action_payload: {
            type: 'chat',
            prompt: `Walk me through proving and deriving core formulas in ${titleName} with full intermediate explanations.`,
          },
        },
        {
          title: `Applied Problem Solving & Multi-Step Calculations`,
          description: `Solve complex multi-step problems and contextual equations in ${topicName}.`,
          concept_name: 'Problem Solving Drills',
          type: 'concept_mastery',
          difficulty: 'intermediate',
          priority: 'high',
          estimated_minutes: 25,
          learning_gain_target: 0.25,
          action_payload: {
            type: 'chat',
            prompt: `Give me 3 multi-step calculation problems for ${titleName}. Check each step of my solution.`,
          },
        },
        {
          title: `Boundary Cases & Mathematical Misconception Traps`,
          description: `Identify division by zero, sign errors, extraneous roots, and subtle false assumptions in ${topicName}.`,
          concept_name: 'Misconception Prevention',
          type: 'story_challenge',
          difficulty: 'advanced',
          priority: 'high',
          estimated_minutes: 20,
          learning_gain_target: 0.26,
          action_payload: {
            type: 'story',
            prompt: `Create a mathematical scenario with subtle algebraic flaws in ${titleName} and guide me to identify and correct them.`,
          },
        },
        {
          title: `Real-World Mathematical Modeling & Word Problems`,
          description: `Translate physical phenomena and rate relations into formal equations in ${topicName}.`,
          concept_name: 'Mathematical Modeling',
          type: 'reflection',
          difficulty: 'advanced',
          priority: 'high',
          estimated_minutes: 25,
          learning_gain_target: 0.28,
          action_payload: {
            type: 'chat',
            prompt: `Present real-world modeling word problems based on ${titleName} and evaluate my formulation.`,
          },
        },
        {
          title: `Capstone Analytical Synthesis & Theorem Mastery`,
          description: `Synthesize end-to-end mathematical understanding across all units of ${titleName}.`,
          concept_name: 'Capstone Mastery',
          type: 'reflection',
          difficulty: 'advanced',
          priority: 'high',
          estimated_minutes: 30,
          learning_gain_target: 0.30,
          action_payload: {
            type: 'chat',
            prompt: `Conduct a capstone mathematical review of ${titleName} with advanced analytical questions.`,
          },
        },
      ];
      break;

    case 'natural_sciences':
      pool = [
        {
          title: `Fundamental Physical Laws & Mechanisms of ${titleName}`,
          description: `Master core principles, physical laws, and empirical observations governing ${topicName}.`,
          concept_name: 'Scientific Foundations',
          type: 'concept_mastery',
          difficulty: 'beginner',
          priority: 'high',
          estimated_minutes: 15,
          learning_gain_target: 0.20,
          action_payload: {
            type: 'chat',
            prompt: `Explain the fundamental laws, governing equations, and molecular/physical mechanisms of ${titleName}.`,
          },
        },
        {
          title: `Mechanistic & Quantitative Diagnostic Quiz on ${titleName}`,
          description: `Test understanding of units, reaction pathways, force diagrams, or biological cycles in ${topicName}.`,
          concept_name: 'Diagnostic Baseline',
          type: 'diagnostic_quiz',
          difficulty: 'intermediate',
          priority: 'high',
          estimated_minutes: 15,
          learning_gain_target: 0.20,
          action_payload: {
            type: 'assessment',
            prompt: `Generate a 4-question scientific diagnostic quiz testing mechanisms and quantitative relations in ${titleName}.`,
          },
        },
        {
          title: `Experimental Hypothesis & Laboratory Data Analysis`,
          description: `Interpret experimental graphs, calculate rates of change, and test scientific hypotheses in ${topicName}.`,
          concept_name: 'Experimental Analysis',
          type: 'concept_mastery',
          difficulty: 'intermediate',
          priority: 'high',
          estimated_minutes: 20,
          learning_gain_target: 0.24,
          action_payload: {
            type: 'chat',
            prompt: `Provide empirical experimental data for ${titleName} and guide me through analyzing variables, controls, and conclusions.`,
          },
        },
        {
          title: `Real-World Anomaly & Environmental Story Challenge`,
          description: `Investigate a complex natural anomaly or experimental failure scenario in ${topicName}.`,
          concept_name: 'Scientific Investigation',
          type: 'story_challenge',
          difficulty: 'advanced',
          priority: 'high',
          estimated_minutes: 25,
          learning_gain_target: 0.28,
          action_payload: {
            type: 'story',
            prompt: `Start a scientific story challenge investigating an anomalous experimental observation in ${titleName}.`,
          },
        },
        {
          title: `Thermodynamic & Pathway Equilibrium Modeling`,
          description: `Analyze conservation laws, dynamic equilibrium, and feedback loops in ${topicName}.`,
          concept_name: 'System Dynamics',
          type: 'concept_mastery',
          difficulty: 'advanced',
          priority: 'medium',
          estimated_minutes: 25,
          learning_gain_target: 0.26,
          action_payload: {
            type: 'chat',
            prompt: `Walk me through modeling equilibrium states and conservation equations in ${titleName}.`,
          },
        },
        {
          title: `Capstone Scientific Frontier & Synthesis Review`,
          description: `Synthesize comprehensive theoretical mastery and modern research breakthroughs in ${titleName}.`,
          concept_name: 'Capstone Synthesis',
          type: 'reflection',
          difficulty: 'advanced',
          priority: 'high',
          estimated_minutes: 30,
          learning_gain_target: 0.30,
          action_payload: {
            type: 'chat',
            prompt: `Conduct a capstone scientific defense on ${titleName} connecting foundational laws to modern research frontiers.`,
          },
        },
      ];
      break;

    case 'business_finance':
      pool = [
        {
          title: `Market Fundamentals & Strategic Frameworks of ${titleName}`,
          description: `Understand market dynamics, micro/macro economic models, and core principles in ${topicName}.`,
          concept_name: 'Core Principles',
          type: 'concept_mastery',
          difficulty: 'beginner',
          priority: 'high',
          estimated_minutes: 15,
          learning_gain_target: 0.20,
          action_payload: {
            type: 'chat',
            prompt: `Explain the foundational economic models, strategic frameworks, and terminology of ${titleName}.`,
          },
        },
        {
          title: `Valuation & Financial Metrics Diagnostic on ${titleName}`,
          description: `Test mastery of key ratios, balance sheets, market incentives, and metric calculations in ${topicName}.`,
          concept_name: 'Diagnostic Baseline',
          type: 'diagnostic_quiz',
          difficulty: 'intermediate',
          priority: 'high',
          estimated_minutes: 15,
          learning_gain_target: 0.20,
          action_payload: {
            type: 'assessment',
            prompt: `Generate a 4-question business and finance quiz evaluating quantitative valuation metrics in ${titleName}.`,
          },
        },
        {
          title: `Strategic Case Study & Corporate Decision Simulation`,
          description: `Analyze market competition, capital allocation trade-offs, and strategic risk in ${topicName}.`,
          concept_name: 'Business Case Study',
          type: 'story_challenge',
          difficulty: 'advanced',
          priority: 'high',
          estimated_minutes: 25,
          learning_gain_target: 0.28,
          action_payload: {
            type: 'story',
            prompt: `Launch an interactive business case simulation involving competitive market decisions and risks in ${titleName}.`,
          },
        },
        {
          title: `Quantitative Financial Modeling & Forecasting`,
          description: `Build DCF, sensitivity analysis, or supply-demand elasticity calculations for ${topicName}.`,
          concept_name: 'Financial Modeling',
          type: 'concept_mastery',
          difficulty: 'advanced',
          priority: 'medium',
          estimated_minutes: 25,
          learning_gain_target: 0.25,
          action_payload: {
            type: 'chat',
            prompt: `Guide me through quantitative modeling and financial projections for ${titleName}.`,
          },
        },
        {
          title: `Executive Strategy & Macroeconomic Synthesis`,
          description: `Synthesize comprehensive business mastery across regulatory, competitive, and financial pillars of ${titleName}.`,
          concept_name: 'Executive Synthesis',
          type: 'reflection',
          difficulty: 'advanced',
          priority: 'high',
          estimated_minutes: 30,
          learning_gain_target: 0.30,
          action_payload: {
            type: 'chat',
            prompt: `Conduct an executive strategy review of ${titleName}. Challenge my strategic and analytical recommendations.`,
          },
        },
      ];
      break;

    case 'languages':
      pool = [
        {
          title: `Grammar Rules & Syntax Foundations of ${titleName}`,
          description: `Master grammatical rules, sentence structures, and core lexicon in ${topicName}.`,
          concept_name: 'Grammar Foundations',
          type: 'concept_mastery',
          difficulty: 'beginner',
          priority: 'high',
          estimated_minutes: 15,
          learning_gain_target: 0.20,
          action_payload: {
            type: 'chat',
            prompt: `Teach me the fundamental syntax structures, grammatical conventions, and key vocabulary for ${titleName}.`,
          },
        },
        {
          title: `Morphology & Syntax Diagnostic Assessment`,
          description: `Evaluate tense conjugations, prepositions, agreement rules, and vocabulary in ${topicName}.`,
          concept_name: 'Diagnostic Baseline',
          type: 'diagnostic_quiz',
          difficulty: 'intermediate',
          priority: 'high',
          estimated_minutes: 15,
          learning_gain_target: 0.18,
          action_payload: {
            type: 'assessment',
            prompt: `Create a 4-question language diagnostic testing grammar rules and vocabulary precision in ${titleName}.`,
          },
        },
        {
          title: `Contextual Reading Comprehension & Nuance Analysis`,
          description: `Deconstruct idiomatic expressions, tone, and reading passages in ${topicName}.`,
          concept_name: 'Reading Comprehension',
          type: 'concept_mastery',
          difficulty: 'intermediate',
          priority: 'high',
          estimated_minutes: 20,
          learning_gain_target: 0.24,
          action_payload: {
            type: 'chat',
            prompt: `Provide a reading passage in ${titleName} and guide me through analyzing tone, literary devices, and nuance.`,
          },
        },
        {
          title: `Conversational Fluency & Pragmatics Simulation`,
          description: `Practice practical dialogue, persuasive reasoning, and situational speech in ${topicName}.`,
          concept_name: 'Conversational Fluency',
          type: 'story_challenge',
          difficulty: 'advanced',
          priority: 'high',
          estimated_minutes: 25,
          learning_gain_target: 0.28,
          action_payload: {
            type: 'story',
            prompt: `Launch an interactive roleplay dialogue challenge testing conversational fluency in ${titleName}.`,
          },
        },
        {
          title: `Advanced Composition & Rhetoric Synthesis`,
          description: `Synthesize comprehensive linguistic mastery through structured essay writing and rhetorical analysis in ${titleName}.`,
          concept_name: 'Composition Synthesis',
          type: 'reflection',
          difficulty: 'advanced',
          priority: 'high',
          estimated_minutes: 30,
          learning_gain_target: 0.30,
          action_payload: {
            type: 'chat',
            prompt: `Review my writing composition and evaluate rhetorical clarity and stylistic mastery in ${titleName}.`,
          },
        },
      ];
      break;

    default: // general_applied
      pool = [
        {
          title: `Core Principles & Mental Models of ${titleName}`,
          description: `Establish a solid conceptual foundation, terminology, and core principles in ${topicName}.`,
          concept_name: 'Core Foundations',
          type: 'concept_mastery',
          difficulty: 'beginner',
          priority: 'high',
          estimated_minutes: 15,
          learning_gain_target: 0.20,
          action_payload: {
            type: 'chat',
            prompt: `Teach me the fundamental principles, key terminology, and mental models of ${titleName}.`,
          },
        },
        {
          title: `Diagnostic Conceptual Assessment on ${titleName}`,
          description: `Test understanding of key terminology, mechanisms, and common misconceptions in ${topicName}.`,
          concept_name: 'Diagnostic Baseline',
          type: 'diagnostic_quiz',
          difficulty: 'intermediate',
          priority: 'high',
          estimated_minutes: 15,
          learning_gain_target: 0.18,
          action_payload: {
            type: 'assessment',
            prompt: `Generate a 4-question diagnostic quiz evaluating core concepts in ${titleName}.`,
          },
        },
        {
          title: `Practical Application & Scenario Analysis`,
          description: `Apply theoretical concepts to real-world scenarios and structured problem-solving in ${topicName}.`,
          concept_name: 'Applied Problem Solving',
          type: 'concept_mastery',
          difficulty: 'intermediate',
          priority: 'medium',
          estimated_minutes: 20,
          learning_gain_target: 0.24,
          action_payload: {
            type: 'chat',
            prompt: `Give me a realistic scenario or case study in ${titleName}. Let me analyze and solve it step-by-step.`,
          },
        },
        {
          title: `Scenario Challenge & Common Traps Investigation`,
          description: `Identify and remediate frequent mistakes and subtle misconceptions in ${topicName}.`,
          concept_name: 'Misconception Remediation',
          type: 'story_challenge',
          difficulty: 'advanced',
          priority: 'high',
          estimated_minutes: 25,
          learning_gain_target: 0.26,
          action_payload: {
            type: 'story',
            prompt: `Present a high-stakes scenario challenge testing trade-offs and edge cases in ${titleName}.`,
          },
        },
        {
          title: `Capstone Synthesis & Analytical Review`,
          description: `Synthesize comprehensive mastery across all dimensions of ${titleName}.`,
          concept_name: 'Capstone Mastery',
          type: 'reflection',
          difficulty: 'advanced',
          priority: 'high',
          estimated_minutes: 30,
          learning_gain_target: 0.30,
          action_payload: {
            type: 'chat',
            prompt: `Conduct a capstone review of ${titleName}. Ask me comprehensive questions to verify my mastery.`,
          },
        },
      ];
      break;
  }

  // Select the appropriate number of tasks matching the topic depth
  const targetCount = Math.min(depth.taskCount, pool.length);
  const selected = pool.slice(0, targetCount);

  return selected.map((raw, idx) => ({
    ...raw,
    id: `task_${project.id}_${idx + 1}`,
    project_id: project.id,
    status: 'todo',
    created_at: now,
  }));
}

// ── CRUD Operations ──────────────────────────────────────────────────────────

/**
 * Retrieves all tasks for a specific subject workspace.
 * Automatically seeds default tasks if this is the first time the subject is opened,
 * or auto-migrates outdated generic templates to domain-appropriate curriculums.
 */
export function getTasksForSubject(projectId: string, projectMeta?: ProjectItem): SubjectTask[] {
  if (!projectId) return [];
  const key = getStorageKey(projectId);
  const now = new Date().toISOString();

  const dummyProj: ProjectItem = projectMeta || {
    id: projectId,
    name: projectId.replace(/^(comm-|_|-)/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    created_at: now,
  };

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed: SubjectTask[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Detect if tasks are using the outdated generic template with coding for non-CS subjects
        const domain = detectSubjectDomain(dummyProj);
        const hasMismatchedCoding = parsed.some(
          (t) =>
            t.type === 'hands_on_coding' &&
            domain !== 'computer_science' &&
            /coding exercise|algorithm/i.test(t.action_payload?.prompt || '')
        );

        if (!hasMismatchedCoding) {
          return parsed;
        }
        // Otherwise, auto-upgrade outdated generic tasks to the domain-accurate curriculum!
      }
    }
  } catch (err) {
    console.warn(`[TaskService] Error reading tasks for project ${projectId}:`, err);
  }

  // Seed default tasks for this subject
  let seededTasks: SubjectTask[] = [];

  // Check if subject has predefined curriculum blueprints
  const blueprint = CURRICULUM_TASK_BLUEPRINTS[projectId];

  if (blueprint && blueprint.length > 0) {
    seededTasks = blueprint.map((item, idx) => ({
      ...item,
      id: `task_${projectId}_${idx + 1}`,
      project_id: projectId,
      status: 'todo',
      created_at: now,
    }));
  } else {
    // Generate domain-specific and depth-scaled tasks
    seededTasks = generateDefaultTasksForSubject(dummyProj);
  }

  // Save seeded tasks to storage
  try {
    localStorage.setItem(key, JSON.stringify(seededTasks));
  } catch (err) {
    console.warn(`[TaskService] Error saving seeded tasks for project ${projectId}:`, err);
  }

  return seededTasks;
}

/**
 * Creates and appends a new custom task to a subject.
 */
export function createSubjectTask(
  projectId: string,
  taskData: Omit<SubjectTask, 'id' | 'project_id' | 'created_at'>
): SubjectTask {
  const currentTasks = getTasksForSubject(projectId);
  const newTask: SubjectTask = {
    ...taskData,
    id: `custom_task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    project_id: projectId,
    created_at: new Date().toISOString(),
  };

  const updated = [newTask, ...currentTasks];
  localStorage.setItem(getStorageKey(projectId), JSON.stringify(updated));
  return newTask;
}

/**
 * Updates an existing task by ID.
 */
export function updateSubjectTask(
  taskId: string,
  projectId: string,
  updates: Partial<SubjectTask>
): SubjectTask | null {
  const currentTasks = getTasksForSubject(projectId);
  let updatedTask: SubjectTask | null = null;

  const updatedList = currentTasks.map((task) => {
    if (task.id === taskId) {
      const isNewlyCompleted = updates.status === 'completed' && task.status !== 'completed';
      const isUncompleted = updates.status && updates.status !== 'completed' && task.status === 'completed';

      updatedTask = {
        ...task,
        ...updates,
        completed_at: isNewlyCompleted ? new Date().toISOString() : isUncompleted ? undefined : task.completed_at,
      };
      return updatedTask;
    }
    return task;
  });

  if (updatedTask) {
    localStorage.setItem(getStorageKey(projectId), JSON.stringify(updatedList));
  }

  return updatedTask;
}

/**
 * Toggles a task's status between completed and todo.
 */
export function toggleTaskCompletion(taskId: string, projectId: string): SubjectTask | null {
  const currentTasks = getTasksForSubject(projectId);
  const target = currentTasks.find((t) => t.id === taskId);
  if (!target) return null;

  const nextStatus: TaskStatus = target.status === 'completed' ? 'todo' : 'completed';
  return updateSubjectTask(taskId, projectId, { status: nextStatus });
}

/**
 * Deletes a task from the subject workspace.
 */
export function deleteSubjectTask(taskId: string, projectId: string): boolean {
  const currentTasks = getTasksForSubject(projectId);
  const filtered = currentTasks.filter((t) => t.id !== taskId);
  if (filtered.length === currentTasks.length) return false;

  localStorage.setItem(getStorageKey(projectId), JSON.stringify(filtered));
  return true;
}

/**
 * Resets a subject's tasks back to the default curriculum milestones.
 */
export function resetSubjectTasksToDefault(projectId: string, projectMeta?: ProjectItem): SubjectTask[] {
  localStorage.removeItem(getStorageKey(projectId));
  return getTasksForSubject(projectId, projectMeta);
}

/**
 * Calculates aggregate task metrics and completion progress for a subject.
 */
export function getSubjectTaskStats(projectId: string, projectMeta?: ProjectItem): SubjectTaskStats {
  const tasks = getTasksForSubject(projectId, projectMeta);
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const todo = tasks.filter((t) => t.status === 'todo').length;

  const totalEstimatedMinutes = tasks.reduce((sum, t) => sum + (t.estimated_minutes || 15), 0);
  const remainingMinutes = tasks
    .filter((t) => t.status !== 'completed')
    .reduce((sum, t) => sum + (t.estimated_minutes || 15), 0);

  const highPriorityRemaining = tasks.filter((t) => t.status !== 'completed' && t.priority === 'high').length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    inProgress,
    todo,
    progressPercent,
    totalEstimatedMinutes,
    remainingMinutes,
    highPriorityRemaining,
  };
}
