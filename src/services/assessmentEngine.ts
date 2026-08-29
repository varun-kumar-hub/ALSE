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
  python: [
    {
      id: 'py_q1',
      concept_id: 'python_execution_model',
      concept_name: 'Python Execution Model & Bytecode',
      question: 'How does CPython execute standard Python source code (.py files)?',
      options: [
        'Source code is compiled into bytecode (.pyc) which is then interpreted by the Python Virtual Machine (PVM).',
        'Source code is directly translated into native CPU assembly instructions without an interpreter.',
        'Source code is executed line-by-line purely as plain text without any intermediate representation.',
        'Source code is sent to an external web service for execution.',
      ],
      correct_index: 0,
      explanation: 'CPython compiles human-readable .py source code into bytecode (.pyc instructions), which is executed by the stack-based Python Virtual Machine.',
      difficulty: 0.45,
    },
    {
      id: 'py_q2',
      concept_id: 'global_interpreter_lock',
      concept_name: 'Global Interpreter Lock (GIL)',
      question: 'What is the primary constraint imposed by the CPython Global Interpreter Lock (GIL)?',
      options: [
        'It prevents more than one native thread from executing Python bytecode simultaneously in a single process.',
        'It restricts Python programs to a maximum memory footprint of 4GB.',
        'It disables all networking and socket operations across multi-threaded applications.',
        'It forces all functions to be executed asynchronously.',
      ],
      correct_index: 0,
      explanation: 'The GIL is a mutex that protects access to Python objects, preventing multiple native threads from executing Python bytecodes concurrently on multi-core CPUs.',
      difficulty: 0.65,
    },
    {
      id: 'py_q3',
      concept_id: 'memory_management_gc',
      concept_name: 'Memory Management & Garbage Collection',
      question: 'How does CPython primarily track object lifetimes, and how are reference cycles resolved?',
      options: [
        'Reference counting is the primary mechanism, supplemented by a generational cyclic garbage collector.',
        'Pure mark-and-sweep algorithm running at fixed time intervals only.',
        'Manual malloc and free invocations managed by the programmer.',
        'Stack-only allocation where objects are destroyed on function exit.',
      ],
      correct_index: 0,
      explanation: 'CPython deallocates objects immediately when their reference count drops to zero. A generational cyclic GC periodically detects and collects unreachable reference cycles.',
      difficulty: 0.7,
    },
    {
      id: 'py_q4',
      concept_id: 'mutable_default_arguments',
      concept_name: 'Mutable Default Arguments',
      question: 'What occurs when a mutable object (e.g. `def append_to(item, target_list=[])`) is used as a default argument in Python?',
      options: [
        'The default list is instantiated once at function definition time and persists across subsequent calls.',
        'A fresh, empty list is created every time the function is invoked without that argument.',
        'Python throws a SyntaxError at compile time.',
        'The list is automatically converted into an immutable tuple.',
      ],
      correct_index: 0,
      explanation: 'Default arguments in Python are evaluated once when the function definition is executed, so the same mutable object is shared across all function calls that omit the argument.',
      difficulty: 0.55,
    },
    {
      id: 'py_q5',
      concept_id: 'context_managers',
      concept_name: 'Context Managers & with Statement',
      question: 'Which two dunder methods must an object implement to be compatible with Python\'s `with` context manager protocol?',
      options: [
        '`__enter__()` and `__exit__()`',
        '`__open__()` and `__close__()`',
        '`__start__()` and `__finish__()`',
        '`__init__()` and `__del__()`',
      ],
      correct_index: 0,
      explanation: 'The `with` statement calls `__enter__()` before entering the block and guarantees `__exit__()` is called upon leaving, even if an exception occurs.',
      difficulty: 0.5,
    },
    {
      id: 'py_q6',
      concept_id: 'generators_iterators',
      concept_name: 'Generators vs Lists',
      question: 'What is the primary operational and memory advantage of a generator function using `yield` over returning a populated list?',
      options: [
        'Generators compute values lazily on-demand, maintaining $O(1)$ memory consumption regardless of sequence length.',
        'Generators execute at native C compiled speeds with GPU acceleration.',
        'Generators can only produce integer values.',
        'Generators automatically cache all previous elements in disk memory.',
      ],
      correct_index: 0,
      explanation: 'Generators produce items one-at-a-time as requested via the iterator protocol (`__next__`), allowing traversal of massive or infinite streams in $O(1)$ memory.',
      difficulty: 0.6,
    },
    {
      id: 'py_q7',
      concept_id: 'decorators',
      concept_name: 'Decorators & Higher-Order Functions',
      question: 'What is the role of `@functools.wraps(func)` inside a custom decorator wrapper?',
      options: [
        'It preserves the original function\'s metadata such as `__name__`, `__doc__`, and signature.',
        'It compiles the decorated function into Cython C-extensions for performance.',
        'It enforces static type checking at runtime.',
        'It automatically retries failed function calls 3 times.',
      ],
      correct_index: 0,
      explanation: '`@wraps` copies over docstrings, function names, and signature metadata from the original function to the wrapper, avoiding debugging confusion.',
      difficulty: 0.6,
    },
    {
      id: 'py_q8',
      concept_id: 'concurrency_asyncio',
      concept_name: 'Asynchronous Programming (asyncio)',
      question: 'In Python\'s `asyncio` framework, what mechanism allows cooperative multitasking on a single thread?',
      options: [
        'An Event Loop that schedules and multiplexes non-blocking coroutines when they `await` I/O operations.',
        'Kernel-level preemption interrupting functions every 10 milliseconds.',
        'Multi-process fork allocation on every async function call.',
        'Hardware DMA bypassing operating system scheduling.',
      ],
      correct_index: 0,
      explanation: '`asyncio` uses a single-threaded cooperative Event Loop: tasks yield control back to the loop when awaiting non-blocking I/O operations.',
      difficulty: 0.7,
    },
  ],
  deep_learning: [
    {
      id: 'dl_q1',
      concept_id: 'backpropagation',
      concept_name: 'Backpropagation & Gradient Flow',
      question: 'What mathematical principle enables backpropagation to compute partial derivatives of loss with respect to early layer weights?',
      options: [
        'The Multivariate Chain Rule of Calculus',
        'Euler-Maclaurin Summation',
        'Fourier Transform Decomposition',
        'Lagrangian Polynomial Interpolation',
      ],
      correct_index: 0,
      explanation: 'Backpropagation applies the multivariate chain rule backwards through computational graph nodes to calculate gradients efficiently.',
      difficulty: 0.6,
    },
    {
      id: 'dl_q2',
      concept_id: 'neural_networks',
      concept_name: 'Non-linear Activation Functions',
      question: 'Why are non-linear activation functions (e.g. ReLU, GELU) mandatory in deep neural networks?',
      options: [
        'Without non-linearity, stacking multiple layers collapses mathematically into a single linear transformation.',
        'To speed up CPU clock cycles during matrix multiplications.',
        'To ensure all output values remain strictly positive constants.',
        'To eliminate the need for optimizer algorithms.',
      ],
      correct_index: 0,
      explanation: 'Linear combinations of linear transformations remain strictly linear. Non-linearities allow multi-layer networks to act as universal function approximators.',
      difficulty: 0.65,
    },
    {
      id: 'dl_q3',
      concept_id: 'overfitting_regularization',
      concept_name: 'Dropout & Generalization',
      question: 'How does Dropout regularization prevent overfitting during neural network training?',
      options: [
        'By randomly zeroing out neuron activations at each iteration, preventing co-adaptation of features.',
        'By permanently deleting 50% of the dataset rows.',
        'By reducing the network learning rate to exactly zero.',
        'By running multiple models sequentially in parallel threads.',
      ],
      correct_index: 0,
      explanation: 'Randomly dropping neurons during training forces the network to learn redundant, robust representations without relying on single-feature co-adaptations.',
      difficulty: 0.55,
    },
    {
      id: 'dl_q4',
      concept_id: 'optimizers',
      concept_name: 'Adam Optimizer Mechanics',
      question: 'How does the Adam optimizer combine the advantages of Momentum and RMSProp?',
      options: [
        'It computes exponentially decaying averages of past gradients (momentum) and squared gradients (adaptive learning rate).',
        'It computes exact second-order Hessian matrices at every step.',
        'It uses evolutionary genetic algorithms to mutate weights.',
        'It randomly alters the network architecture per batch.',
      ],
      correct_index: 0,
      explanation: 'Adam tracks both the first moment (mean of gradients for momentum) and the second raw moment (uncentered variance for adaptive scaling).',
      difficulty: 0.7,
    },
    {
      id: 'dl_q5',
      concept_id: 'vanishing_gradients',
      concept_name: 'Vanishing Gradient Problem',
      question: 'Why do deep networks using sigmoid activation functions frequently suffer from vanishing gradients in early layers?',
      options: [
        'The maximum derivative of the sigmoid function is 0.25, causing chained gradient products to shrink exponentially toward zero.',
        'Sigmoid outputs values outside the range of 32-bit floating point numbers.',
        'Sigmoid causes negative weights to be set to zero permanently.',
        'The loss function cannot calculate derivatives for smooth curves.',
      ],
      correct_index: 0,
      explanation: 'Because $\\sigma\'(x) \\le 0.25$, multiplying many such derivatives across deep layers causes the gradient signal to vanish exponentially.',
      difficulty: 0.65,
    },
    {
      id: 'dl_q6',
      concept_id: 'transformers_attention',
      concept_name: 'Self-Attention Scaling Factor',
      question: 'Why is the dot-product of Query ($Q$) and Key ($K$) scaled by $\\frac{1}{\\sqrt{d_k}}$ in Scaled Dot-Product Attention?',
      options: [
        'To prevent large dot products from pushing the softmax function into regions with extremely small gradients.',
        'To ensure the attention weights sum to 100 instead of 1.',
        'To reduce the computational complexity from $O(N^2)$ to $O(N)$.',
        'To make attention invariant to sequence order.',
      ],
      correct_index: 0,
      explanation: 'For large projection dimensions $d_k$, dot products grow large in magnitude, causing softmax outputs to saturate and gradients to vanish without $\\sqrt{d_k}$ scaling.',
      difficulty: 0.75,
    },
    {
      id: 'dl_q7',
      concept_id: 'loss_functions',
      concept_name: 'Cross-Entropy Loss',
      question: 'Why is Cross-Entropy Loss preferred over Mean Squared Error (MSE) for multi-class classification tasks?',
      options: [
        'It provides steep gradient signals for confident incorrect predictions, penalizing them heavily and accelerating convergence.',
        'It eliminates all negative numbers from the loss space.',
        'It works without requiring ground truth labels.',
        'It is strictly invariant to class probability distributions.',
      ],
      correct_index: 0,
      explanation: 'Combining Cross-Entropy with Softmax yields linear gradient errors $(p - y)$, avoiding plateau regions that slow down MSE in classification.',
      difficulty: 0.65,
    },
    {
      id: 'dl_q8',
      concept_id: 'normalization_layers',
      concept_name: 'Batch Norm vs Layer Norm',
      question: 'What is the key difference between Batch Normalization and Layer Normalization?',
      options: [
        'Batch Norm normalizes across the batch dimension per feature channel, while Layer Norm normalizes across feature dimensions per single sample.',
        'Batch Norm can only be applied to output layers, while Layer Norm is only for input layers.',
        'Layer Norm requires a minimum batch size of 128 to function.',
        'Batch Norm does not learn scale ($\\gamma$) or shift ($\\beta$) parameters.',
      ],
      correct_index: 0,
      explanation: 'Layer Norm operates independently along each sample\'s features, making it ideal for variable-length sequence models (Transformers/RNNs) and batch size 1.',
      difficulty: 0.7,
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
    },
    {
      id: 'os_q2',
      concept_id: 'deadlocks',
      concept_name: 'Deadlock Conditions',
      question: 'Which of the following is NOT one of Coffman\'s four necessary conditions for a system deadlock to occur?',
      options: [
        'Preemptive Priority Scheduling',
        'Mutual Exclusion',
        'Hold and Wait',
        'Circular Wait',
      ],
      correct_index: 0,
      explanation: 'The four necessary conditions are Mutual Exclusion, Hold & Wait, No Preemption, and Circular Wait. Preemption breaks deadlock conditions.',
      difficulty: 0.7,
    },
    {
      id: 'os_q3',
      concept_id: 'synchronization',
      concept_name: 'Race Conditions & Mutexes',
      question: 'What happens when two concurrent threads execute `counter++` simultaneously without mutex synchronization?',
      options: [
        'A Race Condition occurs because the read-modify-write operation is non-atomic, leading to lost updates.',
        'The CPU automatically serializes memory without software locking.',
        'The kernel terminates both threads with a SIGKILL error.',
        'Memory addresses are duplicated across virtual RAM.',
      ],
      correct_index: 0,
      explanation: '`counter++` consists of load, increment, and store instructions. Without atomic synchronization, interleaved execution leads to lost writes.',
      difficulty: 0.6,
    },
    {
      id: 'os_q4',
      concept_id: 'virtual_memory',
      concept_name: 'Virtual Memory & Page Faults',
      question: 'What hardware event occurs when a CPU attempts to access a virtual memory address that is valid in the process space but not loaded in physical RAM?',
      options: [
        'A Page Fault trap is generated, prompting the OS kernel to load the required page from disk swap space.',
        'The CPU immediately restarts the system motherboard.',
        'The MMU permanently destroys the process thread stack.',
        'A Segmentation Fault immediately terminates the process.',
      ],
      correct_index: 0,
      explanation: 'A Page Fault causes a hardware interrupt that invokes the OS page fault handler to read the missing page from disk into a free physical frame.',
      difficulty: 0.65,
    },
    {
      id: 'os_q5',
      concept_id: 'cpu_scheduling',
      concept_name: 'CPU Scheduling & Preemption',
      question: 'How does Round Robin (RR) CPU scheduling balance fairness and responsiveness among active processes?',
      options: [
        'By allocating each process a fixed time quantum before preempting it and placing it at the back of the ready queue.',
        'By running the shortest job to completion before starting any other task.',
        'By giving 100% CPU priority to the oldest process in memory.',
        'By random coin flips at each clock interrupt.',
      ],
      correct_index: 0,
      explanation: 'Round Robin uses time slicing (quantums). If a process does not complete within its quantum, it is preempted, ensuring starvation-free CPU sharing.',
      difficulty: 0.5,
    },
    {
      id: 'os_q6',
      concept_id: 'system_calls',
      concept_name: 'System Calls & Mode Transitions',
      question: 'How does a user-space application safely request services from the operating system kernel (e.g. read file, allocate memory)?',
      options: [
        'By invoking a System Call which triggers a software interrupt/trap, transitioning CPU execution from User Mode to Kernel Mode.',
        'By directly executing arbitrary kernel memory instructions via raw pointers.',
        'By disabling CPU ring protection registers from user code.',
        'By writing directly to physical disk sectors.',
      ],
      correct_index: 0,
      explanation: 'System calls execute hardware trap instructions that elevate privileges to Kernel Mode (Ring 0) and jump to validated kernel handler dispatch tables.',
      difficulty: 0.6,
    },
    {
      id: 'os_q7',
      concept_id: 'tlb_caching',
      concept_name: 'Translation Lookaside Buffer (TLB)',
      question: 'What is the purpose of the Translation Lookaside Buffer (TLB) in modern computer architecture?',
      options: [
        'It acts as a fast hardware cache for virtual-to-physical address translations, minimizing page table memory lookups.',
        'It stores temporary disk files before flushing to persistent SSD storage.',
        'It manages GPU shader thread synchronization.',
        'It replaces the CPU Level 1 data cache entirely.',
      ],
      correct_index: 0,
      explanation: 'The TLB caches recent virtual-to-physical page mappings. A TLB hit allows single-cycle translation without traversing multi-level page tables in main RAM.',
      difficulty: 0.7,
    },
    {
      id: 'os_q8',
      concept_id: 'ipc_mechanisms',
      concept_name: 'Inter-Process Communication (IPC)',
      question: 'Which Inter-Process Communication (IPC) mechanism provides the fastest data exchange between processes on the same machine?',
      options: [
        'Shared Memory, because processes map the same physical RAM into their address spaces without kernel copy overhead.',
        'Network TCP Sockets over loopback (127.0.0.1).',
        'Named Pipes (FIFOs) buffering through kernel buffers.',
        'Writing to and polling a temporary file on disk.',
      ],
      correct_index: 0,
      explanation: 'Shared Memory allows processes to read/write directly to common RAM pages without copying data into kernel buffers, making it the fastest IPC.',
      difficulty: 0.65,
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
    },
    {
      id: 'net_q3',
      concept_id: 'dns_resolution',
      concept_name: 'DNS Resolution Hierarchy',
      question: 'In what order is a new domain name resolved if it is not cached locally?',
      options: [
        'Recursive Resolver -> Root Name Server -> TLD Name Server -> Authoritative Name Server',
        'Authoritative Server -> TLD Server -> Root Server -> Browser Cache',
        'Browser Cache -> Local Router -> Gateway Switch -> ISP Subnet',
        'Root Server -> Client Device -> Web Host -> Proxy',
      ],
      correct_index: 0,
      explanation: 'The recursive resolver contacts the Root (.) server, which directs it to the TLD (.com) server, which directs it to the Authoritative server holding the domain records.',
      difficulty: 0.6,
    },
    {
      id: 'net_q4',
      concept_id: 'http_protocols',
      concept_name: 'HTTP/2 vs HTTP/1.1 Multiplexing',
      question: 'What major performance bottleneck in HTTP/1.1 is solved by HTTP/2 multiplexing over a single TCP connection?',
      options: [
        'Head-of-Line (HoL) blocking at the application/request layer.',
        'The need for IP routing headers on Ethernet cables.',
        'The 1500-byte MTU limit on optical fiber cables.',
        'The requirement to use TLS certificates.',
      ],
      correct_index: 0,
      explanation: 'HTTP/2 interleaves binary frames for multiple requests/responses simultaneously over a single TCP connection, eliminating application-level Head-of-Line blocking.',
      difficulty: 0.65,
    },
    {
      id: 'net_q5',
      concept_id: 'congestion_control',
      concept_name: 'TCP Congestion Control',
      question: 'How does TCP Slow Start adjust the congestion window ($cwnd$) upon receiving successful ACKs?',
      options: [
        'It doubles the congestion window size ($cwnd$) every Round Trip Time (RTT), growing exponentially.',
        'It increments $cwnd$ by exactly 1 MSS per RTT linearly.',
        'It keeps $cwnd$ constant at 64KB indefinitely.',
        'It reduces $cwnd$ by half on every successful acknowledgment.',
      ],
      correct_index: 0,
      explanation: 'During Slow Start, $cwnd$ increases by 1 MSS for each ACK received, effectively doubling $cwnd$ every RTT until reaching $ssthresh$ or detecting packet loss.',
      difficulty: 0.7,
    },
    {
      id: 'net_q6',
      concept_id: 'tls_handshake',
      concept_name: 'TLS Cryptographic Handshake',
      question: 'During a TLS 1.3 handshake, how is the symmetric session key established between client and server?',
      options: [
        'Using Ephemeral Elliptic Curve Diffie-Hellman (ECDHE) key exchange combined with digital certificate authentication.',
        'By having the client transmit its raw private key over plaintext HTTP.',
        'By sharing a static pre-computed password hardcoded into all web browsers.',
        'By relying on ISP routers to assign session keys.',
      ],
      correct_index: 0,
      explanation: 'TLS 1.3 uses ECDHE to achieve Perfect Forward Secrecy: keys are generated ephemeral per session, and server authenticity is verified via digital certificates.',
      difficulty: 0.75,
    },
    {
      id: 'net_q7',
      concept_id: 'tcp_vs_udp',
      concept_name: 'TCP vs UDP Protocols',
      question: 'Why do real-time video streaming, VoIP, and gaming protocols predominantly use UDP over TCP?',
      options: [
        'UDP has minimal header overhead and avoids retransmission delays, prioritizing low latency over absolute packet reliability.',
        'UDP provides stronger cryptographic encryption than TCP.',
        'UDP automatically triples the bandwidth capacity of network routers.',
        'TCP cannot transmit binary data.',
      ],
      correct_index: 0,
      explanation: 'TCP retransmission and flow control cause latency spikes (jitter) when packets drop. Real-time media prefers discarding stale frames to maintain low latency.',
      difficulty: 0.5,
    },
    {
      id: 'net_q8',
      concept_id: 'subnetting_cidr',
      concept_name: 'CIDR Subnetting',
      question: 'How many usable host IP addresses are available in a `/24` IPv4 subnet (e.g. `192.168.1.0/24`)?',
      options: [
        '254 (256 total minus network address and broadcast address)',
        '256 usable host addresses',
        '128 usable host addresses',
        '512 usable host addresses',
      ],
      correct_index: 0,
      explanation: 'A `/24` subnet has $2^{32-24} = 256$ total addresses. The first (`.0`) is the network identifier and the last (`.255`) is broadcast, leaving 254 usable hosts.',
      difficulty: 0.55,
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
    },
    {
      id: 'dsa_q2',
      concept_id: 'hash_tables',
      concept_name: 'Hash Collision Handling',
      question: 'What is the worst-case time complexity of searching a hash table with separate chaining when all N keys collide into the same bucket?',
      options: ['O(N)', 'O(1)', 'O(log N)', 'O(N^2)'],
      correct_index: 0,
      explanation: 'When all keys hash to the same bucket index, the bucket degrades into a linear linked list with O(N) lookup time.',
      difficulty: 0.6,
    },
    {
      id: 'dsa_q3',
      concept_id: 'binary_search_tree',
      concept_name: 'BST Invariant & Traversal',
      question: 'Which tree traversal algorithm visited on a Binary Search Tree produces values in strictly sorted ascending order?',
      options: [
        'Inorder Traversal (Left -> Root -> Right)',
        'Preorder Traversal (Root -> Left -> Right)',
        'Postorder Traversal (Left -> Right -> Root)',
        'Breadth-First Level Order Traversal',
      ],
      correct_index: 0,
      explanation: 'In a BST, all left-subtree keys are smaller and all right-subtree keys are larger. An Inorder traversal visits Left, Root, and Right, outputting elements in sorted order.',
      difficulty: 0.45,
    },
    {
      id: 'dsa_q4',
      concept_id: 'avl_red_black_trees',
      concept_name: 'Self-Balancing Trees',
      question: 'What is the maximum height difference (balance factor) allowed between left and right subtrees of any node in an AVL Tree?',
      options: [
        'At most 1 (Balance factor must be -1, 0, or +1)',
        'At most 2',
        'At most $\\log N$',
        'Any arbitrary difference as long as keys are ordered',
      ],
      correct_index: 0,
      explanation: 'AVL trees strictly enforce that for every node, $|height(left) - height(right)| \\le 1$, performing tree rotations whenever a node becomes unbalanced.',
      difficulty: 0.65,
    },
    {
      id: 'dsa_q5',
      concept_id: 'graph_algorithms',
      concept_name: 'Graph Traversal (BFS vs DFS)',
      question: 'Which algorithm is guaranteed to find the shortest path between two vertices in an unweighted graph?',
      options: [
        'Breadth-First Search (BFS)',
        'Depth-First Search (DFS)',
        'Kosaraju\'s Strongly Connected Components',
        'Tarjan\'s Bridge Finding Algorithm',
      ],
      correct_index: 0,
      explanation: 'BFS explores vertices layer by layer in order of their edge distance from the start node, guaranteeing the minimum edge path in unweighted graphs.',
      difficulty: 0.5,
    },
    {
      id: 'dsa_q6',
      concept_id: 'dynamic_programming',
      concept_name: 'Dynamic Programming Core Properties',
      question: 'What two fundamental characteristics must a problem exhibit to be solvable via Dynamic Programming?',
      options: [
        'Optimal Substructure and Overlapping Subproblems',
        'Greedy Choice Property and Monotonicity',
        'Independent Subproblems and Disjoint Sets',
        'Linear Search Space and No State Transitions',
      ],
      correct_index: 0,
      explanation: 'DP requires optimal solutions of subproblems to form the optimal overall solution (Optimal Substructure), with the same subproblems recomputed multiple times (Overlapping Subproblems).',
      difficulty: 0.7,
    },
    {
      id: 'dsa_q7',
      concept_id: 'sorting_lower_bound',
      concept_name: 'Sorting Complexity Lower Bound',
      question: 'What is the mathematically proven lower bound on time complexity for any comparison-based sorting algorithm on $N$ elements?',
      options: [
        '$\\Omega(N \\log N)$',
        '$\\Omega(N)$',
        '$\\Omega(N^2)$',
        '$\\Omega(\\log N)$',
      ],
      correct_index: 0,
      explanation: 'A decision tree for sorting $N$ elements has $N!$ leaves, requiring a minimum tree depth of $\\log_2(N!) = \\Omega(N \\log N)$ comparisons.',
      difficulty: 0.65,
    },
    {
      id: 'dsa_q8',
      concept_id: 'heaps_priority_queues',
      concept_name: 'Binary Heap Array Representation',
      question: 'In a 0-indexed array representing a binary min-heap, what are the indices of the left and right children of a node at index $i$?',
      options: [
        'Left: $2i + 1$, Right: $2i + 2$',
        'Left: $2i$, Right: $2i + 1$',
        'Left: $i + 1$, Right: $i + 2$',
        'Left: $i / 2$, Right: $i / 2 + 1$',
      ],
      correct_index: 0,
      explanation: 'For a 0-indexed complete binary tree array: parent of $i$ is $\\lfloor(i-1)/2\\rfloor$, left child is $2i + 1$, and right child is $2i + 2$.',
      difficulty: 0.5,
    },
  ],
  general: [
    {
      id: 'gen_q1',
      concept_id: 'computational_complexity',
      concept_name: 'Time Complexity',
      question: 'What is the average time complexity of searching an element in a balanced Binary Search Tree (BST)?',
      options: ['O(log N)', 'O(1)', 'O(N)', 'O(N^2)'],
      correct_index: 0,
      explanation: 'In a balanced BST, each comparison halves the remaining search space, resulting in O(log N) average time complexity.',
      difficulty: 0.5,
    },
    {
      id: 'gen_q2',
      concept_id: 'concurrency',
      concept_name: 'Race Conditions',
      question: 'What primary condition causes a race condition in concurrent software systems?',
      options: [
        'Two or more threads access shared mutable data without proper synchronization, and at least one writes.',
        'Multiple threads read read-only memory simultaneously.',
        'The operating system has only one single-core processor.',
        'Memory allocation exceeds available physical RAM.',
      ],
      correct_index: 0,
      explanation: 'A race condition arises when concurrent threads perform unsynchronized conflicting accesses (at least one write) to shared state.',
      difficulty: 0.65,
    },
    {
      id: 'gen_q3',
      concept_id: 'cap_theorem',
      concept_name: 'CAP Theorem in Distributed Systems',
      question: 'According to Brewer\'s CAP Theorem, what can a distributed data store guarantee during a network partition ($P$)?',
      options: [
        'Either Consistency ($C$) or Availability ($A$), but not both simultaneously.',
        'Both Consistency and Availability with zero latency.',
        'Neither Consistency nor Availability.',
        'Unlimited horizontal storage without replication.',
      ],
      correct_index: 0,
      explanation: 'When a network partition occurs, a distributed system must choose between returning errors/waiting (Consistency) or returning potentially stale data (Availability).',
      difficulty: 0.7,
    },
    {
      id: 'gen_q4',
      concept_id: 'acid_properties',
      concept_name: 'ACID Properties in Databases',
      question: 'In database transactions, what does the "Atomicity" property guarantee?',
      options: [
        'All operations in a transaction execute successfully to completion, or the entire transaction is rolled back with no partial effects.',
        'Transactions execute at atomic sub-nanosecond speeds.',
        'Every row in the database contains an atomic single-byte value.',
        'Data is replicated across multiple atomic cloud servers.',
      ],
      correct_index: 0,
      explanation: 'Atomicity ensures "all-or-nothing" execution: if any part of the transaction fails, the entire transaction is aborted and state is rolled back.',
      difficulty: 0.55,
    },
    {
      id: 'gen_q5',
      concept_id: 'rest_api_idempotency',
      concept_name: 'HTTP Idempotency',
      question: 'Which standard HTTP methods are defined as idempotent according to RFC specifications?',
      options: [
        'GET, PUT, DELETE, HEAD, and OPTIONS',
        'POST only',
        'POST and PATCH only',
        'No HTTP methods are idempotent',
      ],
      correct_index: 0,
      explanation: 'An idempotent method produces the same server state result regardless of whether it is executed 1 time or N times (e.g. GET, PUT, DELETE). POST is non-idempotent.',
      difficulty: 0.6,
    },
    {
      id: 'gen_q6',
      concept_id: 'caching_strategies',
      concept_name: 'Cache-Aside (Lazy Loading)',
      question: 'In the Cache-Aside caching pattern, how does the application handle a cache miss?',
      options: [
        'It reads data from the database, writes the result into the cache for future requests, and returns it to the client.',
        'It immediately returns a 404 Not Found error to the client.',
        'It purges all other keys from the cache memory.',
        'It restarts the database server to warm up cache.',
      ],
      correct_index: 0,
      explanation: 'Under Cache-Aside, the application queries the cache first. On a miss, it fetches data from storage, populates the cache, and serves the request.',
      difficulty: 0.6,
    },
    {
      id: 'gen_q7',
      concept_id: 'security_cryptography',
      concept_name: 'Symmetric vs Asymmetric Encryption',
      question: 'What distinguishes Symmetric encryption (e.g. AES) from Asymmetric encryption (e.g. RSA)?',
      options: [
        'Symmetric uses the same shared secret key for encryption and decryption, while Asymmetric uses a public key and a private key pair.',
        'Symmetric encryption does not require keys.',
        'Asymmetric encryption can only encrypt plain text files smaller than 10 bytes.',
        'Symmetric encryption is only supported on 8-bit microcontrollers.',
      ],
      correct_index: 0,
      explanation: 'Symmetric encryption uses a single shared key (fast, high throughput for data payloads). Asymmetric encryption uses key pairs (slower, used for key exchange and signatures).',
      difficulty: 0.55,
    },
    {
      id: 'gen_q8',
      concept_id: 'ci_cd_architecture',
      concept_name: 'Continuous Integration / Continuous Deployment',
      question: 'What is the primary objective of Continuous Integration (CI) in software development?',
      options: [
        'Automatically merging, building, and running automated tests on code changes frequently to catch integration defects early.',
        'Deploying untested code directly into production servers every minute.',
        'Replacing human software engineers with automated code generators.',
        'Eliminating the need for version control systems like Git.',
      ],
      correct_index: 0,
      explanation: 'CI encourages developers to integrate code into shared repositories frequently, automatically running build and test suites to detect regressions early.',
      difficulty: 0.5,
    },
  ],
};

/**
 * Generate dynamic questions based on the topic and extracted concepts.
 * Guaranteed to generate at least 8 questions (or user-requested count).
 */
export function generateAdaptiveAssessment(
  topic: string,
  extractedConcepts: string[] = [],
  count: number = 8
): AssessmentQuestion[] {
  const targetCount = Math.max(8, count);
  const lower = topic.toLowerCase();
  let baseQuestions: AssessmentQuestion[] = [];

  // Pick matched domain bank based on topic keywords
  if (lower.includes('python') || lower.includes('pyc') || lower.includes('pvm') || lower.includes('gil') || lower.includes('django') || lower.includes('flask') || lower.includes('fastapi')) {
    baseQuestions = [...QUESTION_PATTERNS.python];
  } else if (lower.includes('deep learning') || lower.includes('neural') || lower.includes('backprop') || lower.includes('cnn') || lower.includes('transformer') || lower.includes('attention') || lower.includes('llm') || lower.includes('pytorch')) {
    baseQuestions = [...QUESTION_PATTERNS.deep_learning];
  } else if (lower.includes('operating system') || lower.includes('os') || lower.includes('process') || lower.includes('deadlock') || lower.includes('thread') || lower.includes('kernel') || lower.includes('memory management')) {
    baseQuestions = [...QUESTION_PATTERNS.operating_systems];
  } else if (lower.includes('network') || lower.includes('tcp') || lower.includes('osi') || lower.includes('ip') || lower.includes('dns') || lower.includes('socket') || lower.includes('http') || lower.includes('tls')) {
    baseQuestions = [...QUESTION_PATTERNS.computer_networks];
  } else if (lower.includes('binary search') || lower.includes('tree') || lower.includes('graph') || lower.includes('sort') || lower.includes('algorithm') || lower.includes('data structure') || lower.includes('dsa') || lower.includes('bst') || lower.includes('heap') || lower.includes('linked list')) {
    baseQuestions = [...QUESTION_PATTERNS.dsa];
  } else if (lower.includes('machine learning') || lower.includes('supervised') || lower.includes('regression') || lower.includes('classification') || lower.includes('ai') || lower.includes('model')) {
    baseQuestions = [...QUESTION_PATTERNS.deep_learning];
  } else {
    baseQuestions = [...QUESTION_PATTERNS.general];
  }

  // Synthesize and expand questions up to requested count (minimum 8, max 50)
  const result: AssessmentQuestion[] = [...baseQuestions];
  const targetTopic = topic.trim() || 'Software Architecture & Computer Science';

  // If concepts from ongoing chat are provided, incorporate them into the assessment
  if (extractedConcepts && extractedConcepts.length > 0) {
    for (let i = 0; i < extractedConcepts.length && result.length < targetCount; i++) {
      const rawConcept = extractedConcepts[i].slice(0, 60).replace(/[#*`_]/g, '').trim();
      if (rawConcept.length > 5 && !result.some((r) => r.concept_name.toLowerCase().includes(rawConcept.toLowerCase()))) {
        result.push({
          id: `concept_q${result.length + 1}_${Date.now()}`,
          concept_id: rawConcept.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          concept_name: rawConcept,
          question: `In the context of ${targetTopic}, which statement best describes the fundamental principle and operational mechanism of "${rawConcept}"?`,
          options: [
            `It provides structured computational abstractions to solve domain problems predictably and efficiently.`,
            `It completely eliminates all memory consumption and hardware constraints.`,
            `It executes in non-deterministic time without algorithmic guarantees.`,
            `It is strictly deprecated and cannot be used in modern architectures.`,
          ],
          correct_index: 0,
          explanation: `In standard technical implementations, "${rawConcept}" represents a core foundation enabling robust, high-performance execution.`,
          difficulty: 0.6,
        });
      }
    }
  }

  const ASPECT_TEMPLATES = [
    {
      aspect: 'Core Operational Mechanics',
      q: `What is the primary operational mechanism behind ${targetTopic}?`,
      correct: `It establishes structured execution pipelines that optimize computation and ensure deterministic behavior.`,
      wrongs: [
        `It bypasses underlying hardware drivers and eliminates memory usage entirely.`,
        `It executes non-deterministically without algorithmic predictability.`,
        `It requires manual machine code translation on every execution cycle.`,
      ],
      difficulty: 0.5,
    },
    {
      aspect: 'Time & Resource Complexity',
      q: `In the context of ${targetTopic}, which factor is the most significant performance bottleneck under high load?`,
      correct: `Unsynchronized resource contention and excessive memory allocation overhead.`,
      wrongs: [
        `Clock drift in read-only CPU registers.`,
        `Using UTF-8 string encoding across database indices.`,
        `Static typing compilation checks at development time.`,
      ],
      difficulty: 0.65,
    },
    {
      aspect: 'Error Handling & Edge Cases',
      q: `When designing systems utilizing ${targetTopic}, what is the recommended practice to handle concurrent failures?`,
      correct: `Implement idempotent retry policies, backoff jitter, and circuit breaker patterns.`,
      wrongs: [
        `Immediately restart the physical server on any uncaught exception.`,
        `Ignore partial failures and return mock empty responses silently.`,
        `Lock all global mutexes indefinitely until manual user intervention.`,
      ],
      difficulty: 0.7,
    },
    {
      aspect: 'Architectural Tradeoffs',
      q: `What is a primary architectural tradeoff when adopting ${targetTopic}?`,
      correct: `Balancing implementation complexity and resource overhead against throughput and scalability.`,
      wrongs: [
        `Sacrificing CPU arithmetic precision for zero network latency.`,
        `Forcing all database queries to execute synchronously in single-threaded mode.`,
        `Completely preventing any caching at the presentation layer.`,
      ],
      difficulty: 0.6,
    },
    {
      aspect: 'Security & Isolation',
      q: `Which security principle is most critical when deploying ${targetTopic} in production?`,
      correct: `Principle of least privilege and comprehensive input sanitization across API boundaries.`,
      wrongs: [
        `Granting root access to all runtime processes for unrestricted debug access.`,
        `Disabling TLS encryption on internal microservice communication to save CPU cycles.`,
        `Hardcoding admin credentials directly in source control repositories.`,
      ],
      difficulty: 0.75,
    },
    {
      aspect: 'Scalability & Optimization',
      q: `How does horizontal scaling affect the state management of ${targetTopic}?`,
      correct: `It necessitates distributed state synchronization or stateless service design with external shared caches.`,
      wrongs: [
        `It automatically guarantees zero latency without load balancers.`,
        `It makes memory concurrency locks completely unnecessary.`,
        `It requires every node to replicate full system storage locally in real time.`,
      ],
      difficulty: 0.8,
    },
    {
      aspect: 'Data Consistency',
      q: `In distributed implementations of ${targetTopic}, how is data consistency typically maintained?`,
      correct: `Through consensus protocols (e.g. Raft/Paxos) or eventual consistency models with vector clocks.`,
      wrongs: [
        `By disabling write operations across all secondary nodes forever.`,
        `By assuming network packets are never dropped or delayed.`,
        `By synchronizing system clocks with nanosecond hardware interrupts only.`,
      ],
      difficulty: 0.85,
    },
  ];

  let templateIdx = 0;
  while (result.length < targetCount && result.length < 50) {
    const tmpl = ASPECT_TEMPLATES[templateIdx % ASPECT_TEMPLATES.length];
    const qNum = result.length + 1;
    result.push({
      id: `synth_q${qNum}_${Date.now()}`,
      concept_id: `${targetTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${tmpl.aspect.toLowerCase().replace(/\s+/g, '_')}`,
      concept_name: `${targetTopic} - ${tmpl.aspect}`,
      question: `Q${qNum}: ${tmpl.q}`,
      options: [tmpl.correct, ...tmpl.wrongs],
      correct_index: 0,
      explanation: `Correct understanding of ${tmpl.aspect} in ${targetTopic} involves: ${tmpl.correct}`,
      difficulty: tmpl.difficulty,
    });
    templateIdx++;
  }

  return result.slice(0, targetCount);
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
