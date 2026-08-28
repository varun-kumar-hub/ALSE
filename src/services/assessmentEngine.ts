/**
 * LearnForge Adaptive Assessment Engine
 * Generates topic/concept assessments, evaluates learner answers,
 * and updates BKT knowledge state and misconception tracking.
 */

import { ps6Db } from './ps6Database';
import { sendLearningEventToBackend } from './ps6MlClient';

export interface AssessmentQuestion {
  id: string;
  concept_id: string;
  concept_name: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  difficulty: number; // 0.1 to 1.0
  misconceptions_map?: Record<number, string>; // Maps wrong option index to misconception name
}

export interface AssessmentResult {
  totalQuestions: number;
  correctCount: number;
  scorePercent: number;
  conceptBreakdown: Record<string, { concept_name: string; correct: boolean; masteryChange: number }>;
  detectedMisconceptions: string[];
  weakConcepts: string[];
}

// Built-in question bank patterns across common CS, ML, and Software topics
const QUESTION_PATTERNS: Record<string, AssessmentQuestion[]> = {
  deep_learning: [
    {
      id: 'dl_q1',
      concept_id: 'backpropagation',
      concept_name: 'Backpropagation & Gradient Flow',
      question: 'What mathematical principle enables backpropagation to compute partial derivatives of loss with respect to early layer weights?',
      options: [
        'The Chain Rule of Calculus',
        'Euler-Maclaurin Summation',
        'Fourier Transform Decomposition',
        'Lagrangian Polynomial Interpolation',
      ],
      correct_index: 0,
      explanation: 'Backpropagation applies the multivariate chain rule backwards through computational graph nodes to calculate gradients efficiently.',
      difficulty: 0.6,
      misconceptions_map: {
        2: 'Confuses spatial frequency transforms with gradient backprop',
      },
    },
    {
      id: 'dl_q2',
      concept_id: 'neural_networks',
      concept_name: 'Non-linear Activation Functions',
      question: 'Why are non-linear activation functions (e.g. ReLU, GELU) mandatory in deep neural networks?',
      options: [
        'To speed up CPU clock cycles during matrix multiplications.',
        'Without non-linearity, stacking multiple layers collapses mathematically into a single linear transformation.',
        'To ensure all output values remain strictly positive constants.',
        'To eliminate the need for optimizer algorithms.',
      ],
      correct_index: 1,
      explanation: 'Linear combinations of linear transformations remain strictly linear. Non-linearities allow multi-layer networks to act as universal function approximators.',
      difficulty: 0.65,
      misconceptions_map: {
        0: 'Believes activations are purely hardware optimizations',
        3: 'Believes activations replace gradient optimizers',
      },
    },
    {
      id: 'dl_q3',
      concept_id: 'overfitting_regularization',
      concept_name: 'Dropout & Generalization',
      question: 'How does Dropout regularization prevent overfitting during neural network training?',
      options: [
        'By permanently deleting 50% of the dataset rows.',
        'By randomly zeroing out neuron activations at each iteration, preventing co-adaptation of features.',
        'By reducing the network learning rate to exactly zero.',
        'By running multiple models sequentially in parallel threads.',
      ],
      correct_index: 1,
      explanation: 'Randomly dropping neurons during training forces the network to learn redundant, robust representations without relying on single-feature co-adaptations.',
      difficulty: 0.55,
      misconceptions_map: {
        0: 'Confuses network dropout with data subset pruning',
      },
    },
  ],
  operating_systems: [
    {
      id: 'os_q1',
      concept_id: 'processes_vs_threads',
      concept_name: 'Processes vs Threads',
      question: 'What is the primary architectural memory difference between multiple threads of the same process and multiple distinct processes?',
      options: [
        'Threads share the same virtual address space (heap, code, global data), while processes have isolated address spaces.',
        'Processes share the CPU registers while threads require separate physical CPUs.',
        'Threads cannot execute concurrently on multi-core architectures.',
        'Processes do not require operating system scheduling.',
      ],
      correct_index: 0,
      explanation: 'Threads within a process share the same virtual memory space (heap and data), while separate processes are memory-isolated by MMU page tables.',
      difficulty: 0.5,
      misconceptions_map: {
        1: 'Confuses hardware registers with address space isolation',
      },
    },
    {
      id: 'os_q2',
      concept_id: 'deadlocks',
      concept_name: 'Deadlock Conditions',
      question: 'Which of the following is NOT one of Coffman\'s four necessary conditions for a system deadlock to occur?',
      options: [
        'Mutual Exclusion',
        'Hold and Wait',
        'Preemptive Priority Scheduling',
        'Circular Wait',
      ],
      correct_index: 2,
      explanation: 'The four necessary conditions are Mutual Exclusion, Hold & Wait, No Preemption, and Circular Wait. Preemption breaks deadlock conditions.',
      difficulty: 0.7,
      misconceptions_map: {
        1: 'Believes Hold & Wait prevents deadlocks',
      },
    },
    {
      id: 'os_q3',
      concept_id: 'synchronization',
      concept_name: 'Race Conditions & Mutexes',
      question: 'What happens when two concurrent threads execute `counter++` simultaneously without mutex synchronization?',
      options: [
        'The CPU automatically serializes memory without software locking.',
        'A Race Condition occurs because the read-modify-write operation is non-atomic, leading to lost updates.',
        'The kernel terminates both threads with a SIGKILL error.',
        'Memory addresses are duplicated across virtual RAM.',
      ],
      correct_index: 1,
      explanation: '`counter++` consists of load, increment, and store instructions. Without atomic synchronization, interleaved execution leads to lost writes.',
      difficulty: 0.6,
      misconceptions_map: {
        0: 'Assumes high-level language increments are inherently atomic',
      },
    },
  ],
  computer_networks: [
    {
      id: 'net_q1',
      concept_id: 'tcp_ip',
      concept_name: 'TCP 3-Way Handshake',
      question: 'What is the correct sequence of packet flags exchanged during a standard TCP connection establishment?',
      options: [
        'SYN -> SYN-ACK -> ACK',
        'ACK -> SYN -> ACK-FIN',
        'SYN -> ACK -> RST',
        'FIN -> FIN-ACK -> ACK',
      ],
      correct_index: 0,
      explanation: 'TCP uses SYN (client -> server), SYN-ACK (server -> client), and ACK (client -> server) to synchronize sequence numbers and establish state.',
      difficulty: 0.45,
      misconceptions_map: {
        3: 'Confuses connection teardown (FIN) with handshake (SYN)',
      },
    },
    {
      id: 'net_q2',
      concept_id: 'osi_layers',
      concept_name: 'Transport vs Network Layers',
      question: 'At which OSI layer does IP addressing and packet routing occur versus end-to-end TCP port multiplexing?',
      options: [
        'IP is Layer 3 (Network), TCP is Layer 4 (Transport)',
        'IP is Layer 4 (Transport), TCP is Layer 7 (Application)',
        'IP is Layer 2 (Data Link), TCP is Layer 3 (Network)',
        'Both operate exclusively at Layer 5 (Session)',
      ],
      correct_index: 0,
      explanation: 'The Network layer (Layer 3) handles IP packet routing across networks, while the Transport layer (Layer 4) manages port addressing and reliable stream delivery.',
      difficulty: 0.5,
      misconceptions_map: {
        1: 'Confuses Transport and Application layers',
      },
    },
  ],
  dsa: [
    {
      id: 'dsa_q1',
      concept_id: 'binary_search',
      concept_name: 'Binary Search Invariant',
      question: 'What precondition is strictly required before binary search can be applied to an array in O(log N) time?',
      options: [
        'The array elements must be monotonically sorted.',
        'The array must contain only unique positive integers.',
        'The array size must be an exact power of two.',
        'The array must be implemented as a doubly linked list.',
      ],
      correct_index: 0,
      explanation: 'Binary search relies on monotonic ordering to eliminate half of the candidate search space at each comparison.',
      difficulty: 0.4,
      misconceptions_map: {
        3: 'Believes linked lists support O(1) random index access for binary search',
      },
    },
    {
      id: 'dsa_q2',
      concept_id: 'hash_tables',
      concept_name: 'Hash Collision Handling',
      question: 'What is the worst-case time complexity of searching a hash table with separate chaining when all N keys collide into the same bucket?',
      options: ['O(1)', 'O(log N)', 'O(N)', 'O(N^2)'],
      correct_index: 2,
      explanation: 'When all keys hash to the same bucket index, the bucket degrades into a linear linked list with O(N) lookup time.',
      difficulty: 0.6,
      misconceptions_map: {
        0: 'Assumes hash tables guarantee O(1) in the worst case regardless of collisions',
      },
    },
  ],
  general: [
    {
      id: 'gen_q1',
      concept_id: 'computational_complexity',
      concept_name: 'Time Complexity',
      question: 'What is the average time complexity of searching an element in a balanced Binary Search Tree (BST)?',
      options: ['O(1)', 'O(log N)', 'O(N)', 'O(N^2)'],
      correct_index: 1,
      explanation: 'In a balanced BST, each comparison halves the remaining search space, resulting in O(log N) average time complexity.',
      difficulty: 0.5,
      misconceptions_map: {
        2: 'Assumes linear search traversal in trees',
      },
    },
    {
      id: 'gen_q2',
      concept_id: 'concurrency',
      concept_name: 'Race Conditions',
      question: 'What primary condition causes a race condition in concurrent software systems?',
      options: [
        'Multiple threads read read-only memory simultaneously.',
        'Two or more threads access shared mutable data without proper synchronization, and at least one writes.',
        'The operating system has only one single-core processor.',
        'Memory allocation exceeds available physical RAM.',
      ],
      correct_index: 1,
      explanation: 'A race condition arises when concurrent threads perform unsynchronized conflicting accesses (at least one write) to shared state.',
      difficulty: 0.65,
      misconceptions_map: {
        0: 'Believes simultaneous reads cause race conditions',
      },
    },
  ],
};

/**
 * Generate dynamic questions based on the topic and extracted concepts.
 */
export function generateAdaptiveAssessment(
  topic: string,
  extractedConcepts: string[] = []
): AssessmentQuestion[] {
  const lower = topic.toLowerCase();

  // Pick matched domain bank based on topic keywords
  if (lower.includes('deep learning') || lower.includes('neural') || lower.includes('backprop') || lower.includes('cnn') || lower.includes('transformer')) {
    return QUESTION_PATTERNS.deep_learning;
  }
  if (lower.includes('operating system') || lower.includes('os') || lower.includes('process') || lower.includes('deadlock') || lower.includes('thread') || lower.includes('kernel')) {
    return QUESTION_PATTERNS.operating_systems;
  }
  if (lower.includes('network') || lower.includes('tcp') || lower.includes('osi') || lower.includes('ip') || lower.includes('dns') || lower.includes('socket')) {
    return QUESTION_PATTERNS.computer_networks;
  }
  if (lower.includes('binary search') || lower.includes('tree') || lower.includes('graph') || lower.includes('sort') || lower.includes('algorithm') || lower.includes('data structure') || lower.includes('dsa')) {
    return QUESTION_PATTERNS.dsa;
  }
  if (lower.includes('machine learning') || lower.includes('supervised') || lower.includes('regression') || lower.includes('classification') || lower.includes('ai')) {
    return QUESTION_PATTERNS.deep_learning;
  }

  if (extractedConcepts.length > 0) {
    // Synthesize questions from extracted concepts
    return extractedConcepts.slice(0, 3).map((concept, idx) => ({
      id: `dyn_${idx}_${Date.now()}`,
      concept_id: concept.toLowerCase().replace(/\s+/g, '_'),
      concept_name: concept,
      question: `Which statement best describes the fundamental principle and operational mechanism of ${concept}?`,
      options: [
        `${concept} provides core algorithmic abstractions to solve domain problem sets efficiently and predictably.`,
        `${concept} completely eliminates all runtime computation requirements.`,
        `${concept} is strictly deprecated and cannot be used in modern architectures.`,
        `${concept} always executes in constant O(1) time complexity without constraints.`,
      ],
      correct_index: 0,
      explanation: `In standard technical implementations, ${concept} represents a core foundation enabling robust, high-performance execution.`,
      difficulty: 0.5 + idx * 0.1,
      misconceptions_map: {
        3: `Overestimates theoretical complexity limits of ${concept}`,
      },
    }));
  }

  return QUESTION_PATTERNS.general;
}

/**
 * Process submitted assessment answers, log learner evidence, and compute mastery gains.
 */
export async function submitAssessmentAnswers(
  questions: AssessmentQuestion[],
  selectedAnswers: Record<string, number>,
  responseTimes: Record<string, number>
): Promise<AssessmentResult> {
  let correctCount = 0;
  const conceptBreakdown: Record<string, { concept_name: string; correct: boolean; masteryChange: number }> = {};
  const detectedMisconceptions: string[] = [];
  const weakConcepts: string[] = [];

  for (const q of questions) {
    const selected = selectedAnswers[q.id];
    const isCorrect = selected === q.correct_index;
    const timeMs = responseTimes[q.id] || 8000;

    if (isCorrect) {
      correctCount++;
    } else {
      weakConcepts.push(q.concept_name);
      // Check if selected option maps to a specific misconception distractor
      if (q.misconceptions_map && selected !== undefined && q.misconceptions_map[selected]) {
        const miscName = q.misconceptions_map[selected];
        const nowStr = new Date().toISOString();
        detectedMisconceptions.push(`${q.concept_name}: ${miscName}`);
        ps6Db.saveMisconception({
          id: `misc_${Date.now()}_${q.concept_id}`,
          concept_id: q.concept_id,
          concept_name: q.concept_name,
          description: miscName,
          status: 'active',
          first_detected: nowStr,
          last_detected: nowStr,
          frequency: 1,
          confidence: 0.85,
          severity: 'medium',
        });
      }
    }

    // Bayesian Knowledge Tracing (BKT) update
    const currentM = ps6Db.getMasteryForConcept(q.concept_id);
    const prior = currentM?.mastery ?? 0.5;
    const pTransit = 0.15;
    const pSlip = 0.1;
    const pGuess = 0.2;

    let posterior: number;
    if (isCorrect) {
      const num = prior * (1 - pSlip);
      const denom = num + (1 - prior) * pGuess;
      posterior = num / (denom || 1);
    } else {
      const num = prior * pSlip;
      const denom = num + (1 - prior) * (1 - pGuess);
      posterior = num / (denom || 1);
    }

    const newMastery = Math.min(0.99, Math.max(0.05, posterior + (1 - posterior) * pTransit));
    const delta = newMastery - prior;

    ps6Db.saveMastery({
      concept_id: q.concept_id,
      concept_name: q.concept_name,
      mastery: newMastery,
      confidence: Math.min(0.95, (currentM?.confidence ?? 0.5) + 0.12),
      evidence_count: (currentM?.evidence_count ?? 0) + 1,
      last_interaction: new Date().toISOString(),
      status: newMastery >= 0.75 ? 'mastered' : newMastery < 0.4 ? 'struggling' : 'learning',
    });

    // Log live interaction evidence
    ps6Db.addEvidence({
      id: `ev_${Date.now()}_${q.concept_id}`,
      concept_id: q.concept_id,
      concept_name: q.concept_name,
      evidence_type: 'practice',
      correctness: isCorrect ? 1.0 : 0.0,
      confidence_statement: `Answered question in ${(timeMs / 1000).toFixed(1)}s`,
      timestamp: new Date().toISOString(),
    });

    conceptBreakdown[q.concept_id] = {
      concept_name: q.concept_name,
      correct: isCorrect,
      masteryChange: Math.round(delta * 100),
    };

    // Forward learning event to backend telemetry if available
    try {
      await sendLearningEventToBackend({
        concept_id: q.concept_id,
        correct: isCorrect,
        response_time_ms: timeMs,
        question_difficulty: q.difficulty,
        misconception_flag: q.misconceptions_map && selected !== undefined ? q.misconceptions_map[selected] : undefined,
      });
    } catch {
      // Offline fallback
    }
  }

  const scorePercent = Math.round((correctCount / Math.max(1, questions.length)) * 100);

  return {
    totalQuestions: questions.length,
    correctCount,
    scorePercent,
    conceptBreakdown,
    detectedMisconceptions,
    weakConcepts,
  };
}
