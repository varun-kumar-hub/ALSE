import { StoryDecisionPoint } from './ps6Types';

export function getSubjectStorySteps(
  subjectName: string,
  _description?: string,
  _goal?: string
): StoryDecisionPoint[] {
  const norm = subjectName.toLowerCase();

  // 1. Deep Learning / Machine Learning / Backpropagation / AI
  if (
    norm.includes('deep learning') ||
    norm.includes('backpropagation') ||
    norm.includes('neural') ||
    norm.includes('machine learning') ||
    norm.includes('gradient')
  ) {
    return [
      {
        id: 1,
        title: 'D1: Diagnostic — Multivariate Chain Rule & Gradient Flow',
        scenario:
          'You are implementing reverse-mode automatic differentiation for a 5-layer neural network. When calculating the loss gradient ∂L/∂W^(1) for the first layer, why is computing backwards from the loss faster than forward-mode differentiation?',
        explanation:
          'In deep learning, the scalar loss function L has dimension 1 (R¹), while parameters W have millions of dimensions (Rⁿ). Reverse-mode automatic differentiation (backpropagation) starts with the scalar output and computes vector-Jacobian products in a single backward pass of complexity O(1) relative to parameter count. In contrast, forward-mode computes Jacobian-vector products from inputs to outputs, requiring O(N) forward evaluations (one for each parameter), which is computationally intractable for deep networks.',
        options: [
          {
            id: '1a',
            text: 'Reverse-mode computes vector-Jacobian products in a single backward pass for scalar loss functions with high-dimensional weights',
            is_correct: true,
            concept_id: 'chain_rule',
          },
          {
            id: '1b',
            text: 'Forward-mode stores all matrix activations directly on disk, eliminating RAM usage',
            is_correct: false,
            concept_id: 'chain_rule',
            misconception_flag: 'Confusing algorithmic complexity with disk I/O caching',
          },
          {
            id: '1c',
            text: 'Reverse-mode automatically sets all learning rates to zero to prevent divergence',
            is_correct: false,
            concept_id: 'chain_rule',
          },
        ],
      },
      {
        id: 2,
        title: 'D2: Concept Check — Vanishing Gradients & Activation Functions',
        scenario:
          'A deep MLP with 12 sigmoid hidden layers stops learning after 2 epochs because early layer weights barely update. What is the fundamental mathematical cause of this vanishing gradient?',
        explanation:
          'The standard sigmoid function is σ(z) = 1/(1 + e⁻ᶻ). Its derivative is σ\'(z) = σ(z)(1 - σ(z)), which has an absolute maximum value of 0.25 at z = 0. During backpropagation through 12 layers, gradients are multiplied by chained derivatives: (0.25)¹² ≈ 5.96 × 10⁻⁸. This exponential decay diminishes the error signal to near-zero before reaching initial layers, causing the vanishing gradient problem.',
        options: [
          {
            id: '2a',
            text: 'The derivative of Sigmoid σ\'(z) has a maximum value of 0.25, causing chained gradient products to decay exponentially to near-zero',
            is_correct: true,
            concept_id: 'activation_functions',
          },
          {
            id: '2b',
            text: 'The GPU runs out of floating-point registers when multiplying positive numbers',
            is_correct: false,
            concept_id: 'activation_functions',
            misconception_flag: 'Blaming hardware limitations for mathematical derivative decay',
          },
          {
            id: '2c',
            text: 'Sigmoid functions convert all gradient vectors into imaginary complex numbers',
            is_correct: false,
            concept_id: 'activation_functions',
          },
        ],
      },
      {
        id: 3,
        title: 'D3: Challenge — Weight Initialization (He vs Xavier)',
        scenario:
          'When initializing a network with ReLU activations, standard Xavier initialization leads to dying neurons in deeper layers. Why is Kaiming/He Normal initialization (std = sqrt(2/fan_in)) preferred?',
        explanation:
          'Xavier/Glorot initialization assumes linear activations and sets weight variance Var(W) = 2/(fan_in + fan_out). However, ReLU f(z) = max(0, z) zeroes out roughly half of all activations for zero-mean symmetric inputs, halving the overall variance at each successive layer. Kaiming (He) initialization accounts for this by setting Var(W) = 2/fan_in, scaling the variance by a factor of 2 to preserve forward activation variance and backward gradient variance across arbitrary network depths.',
        options: [
          {
            id: '3a',
            text: 'Because ReLU zeros out roughly half of all negative inputs, requiring variance scaling of 2/fan_in to preserve signal variance across layers',
            is_correct: true,
            concept_id: 'weight_initialization',
          },
          {
            id: '3b',
            text: 'He initialization sets all weights to identical non-zero constants to enforce symmetry',
            is_correct: false,
            concept_id: 'weight_initialization',
            misconception_flag: 'Confusing variance scaling with constant symmetric initialization',
          },
          {
            id: '3c',
            text: 'He initialization only applies to recurrent feedback connections',
            is_correct: false,
            concept_id: 'weight_initialization',
          },
        ],
      },
      {
        id: 4,
        title: 'D4: Misconception Detection — Adaptive Optimizers (Adam vs SGD)',
        scenario:
          'A junior engineer claims: "Adam optimizer is always superior to SGD with Momentum because Adam eliminates the need to tune the initial learning rate." Is this statement accurate?',
        explanation:
          'Adam computes exponentially decaying averages of past gradients (first moment m_t) and past squared gradients (second moment v_t) to normalize learning rates per parameter coordinate. However, the update step θ_{t+1} = θ_t - α · m̂_t / (√v̂_t + ε) still directly scales with the global learning rate α. An improperly configured α will still cause severe divergence or suboptimal local minima convergence.',
        options: [
          {
            id: '4a',
            text: 'Yes, Adam calculates the exact optimal step size automatically using Hessian second derivatives',
            is_correct: false,
            concept_id: 'optimizers',
            misconception_flag: 'Assuming first-order adaptive moment estimation eliminates hyperparameter tuning',
          },
          {
            id: '4b',
            text: 'No. Adam scales coordinates by historical second moments, but base learning rate α still heavily governs convergence and generalization',
            is_correct: true,
            concept_id: 'optimizers',
          },
          {
            id: '4c',
            text: 'Yes, because SGD is deprecated in modern PyTorch and TensorFlow runtimes',
            is_correct: false,
            concept_id: 'optimizers',
          },
        ],
      },
      {
        id: 5,
        title: 'D5: Explanation — Batch Normalization Mechanics',
        scenario:
          'During forward propagation, Batch Normalization standardizes mini-batch activations to zero mean and unit variance. Why are learnable scale (γ) and shift (β) parameters included?',
        explanation:
          'Standardizing activations strictly to zero mean and unit variance x̂ = (x - μ_B) / √(σ_B² + ε) constrains the layer representation to the linear region of activations (e.g. sigmoid or tanh near 0). Including learnable affine transformation parameters y = γx̂ + β allows the network to recover the optimal representation, including the exact identity mapping if γ = σ_B and β = μ_B.',
        options: [
          {
            id: '5a',
            text: 'To allow the network to recover non-linear representational power if identity mapping is optimal for a layer',
            is_correct: true,
            concept_id: 'batch_norm',
          },
          {
            id: '5b',
            text: 'To multiply batch size by an integer factor on multi-GPU nodes',
            is_correct: false,
            concept_id: 'batch_norm',
            misconception_flag: 'Confusing affine normalization parameters with distributed batch sizing',
          },
          {
            id: '5c',
            text: 'To convert matrix inputs into convolutional kernels',
            is_correct: false,
            concept_id: 'batch_norm',
          },
        ],
      },
      {
        id: 6,
        title: 'D6: Reinforcement — Regularization: L2 Weight Decay vs Dropout',
        scenario:
          'An overfitted ResNet model has high train accuracy (99%) but low test accuracy (72%). How does L2 Regularization (Weight Decay) mitigate this variance problem?',
        explanation:
          'L2 Regularization adds a penalty term (λ/2) ||W||² to the objective loss function: J(W) = L(W) + (λ/2) ∑ w_i². In gradient descent, this modifies weight updates to W ← W(1 - αλ) - α ∇L, shrinking weight magnitudes toward zero. Smaller weights prevent individual neurons from memorizing noise or fitting overly complex high-frequency decision boundaries, encouraging smoother generalizations.',
        options: [
          {
            id: '6a',
            text: 'By penalizing large weight magnitudes in the loss function, smoothing the decision boundary and reducing model complexity',
            is_correct: true,
            concept_id: 'regularization',
          },
          {
            id: '6b',
            text: 'By deleting 50% of the training dataset rows permanently',
            is_correct: false,
            concept_id: 'regularization',
            misconception_flag: 'Confusing loss penalty with data truncation',
          },
          {
            id: '6c',
            text: 'By stopping backpropagation after the 3rd layer',
            is_correct: false,
            concept_id: 'regularization',
          },
        ],
      },
      {
        id: 7,
        title: 'D7: Adaptive Challenge — Loss Functions: Softmax Cross-Entropy',
        scenario:
          'When training a multi-class classifier with Softmax and Cross-Entropy Loss L = -∑ y_i log(p_i), what is the elegant form of the gradient with respect to logit z_i?',
        explanation:
          'For softmax p_i = e^{z_i} / ∑_k e^{z_k} and categorical cross-entropy loss L = -∑_k y_k log(p_k), using the multivariate chain rule produces ∂L/∂z_i = ∑_k (∂L/∂p_k)(∂p_k/∂z_i). Because ∂p_k/∂z_i = p_i(1 - p_i) for k = i and -p_k p_i for k ≠ i, the intermediate terms algebraically collapse to ∂L/∂z_i = p_i - y_i. This provides an intuitive linear error signal: the model prediction probability minus the one-hot target.',
        options: [
          {
            id: '7a',
            text: '∂L/∂z_i = p_i - y_i (The predicted probability minus the one-hot target label)',
            is_correct: true,
            concept_id: 'loss_functions',
          },
          {
            id: '7b',
            text: '∂L/∂z_i = 1 / (1 + e^(-z_i)) * log(y_i)',
            is_correct: false,
            concept_id: 'loss_functions',
            misconception_flag: 'Confusing sigmoid loss with softmax cross-entropy gradient cancellation',
          },
          {
            id: '7c',
            text: '∂L/∂z_i = 0 for all incorrect class indices',
            is_correct: false,
            concept_id: 'loss_functions',
          },
        ],
      },
      {
        id: 8,
        title: 'D8: Final Evaluation — Computational Graph Memory & Checkpointing',
        scenario:
          'During training of a massive transformer model, GPU memory overflows during backprop. How does Gradient Checkpointing (Rematerialization) solve this trade-off?',
        explanation:
          'Standard backpropagation stores all forward activation tensors in VRAM so they are available for computing backward gradients. Gradient Checkpointing stores only activations at selected checkpoint segments (e.g. layer boundaries). During the backward pass, intermediate activations between checkpoints are recomputed on-the-fly from the checkpointed tensor. This dramatically reduces memory footprint from O(N) to O(√N) at the cost of ~20-30% additional compute time.',
        options: [
          {
            id: '8a',
            text: 'Discards intermediate forward activations and recomputes them on-the-fly during backward pass, trading ~20-30% extra compute for huge RAM savings',
            is_correct: true,
            concept_id: 'computational_graphs',
          },
          {
            id: '8b',
            text: 'Halves the model precision to 4-bit integers permanently',
            is_correct: false,
            concept_id: 'computational_graphs',
            misconception_flag: 'Confusing activation recomputation with model quantization',
          },
          {
            id: '8c',
            text: 'Skips weight updates on every second mini-batch',
            is_correct: false,
            concept_id: 'computational_graphs',
          },
        ],
      },
    ];
  }

  // 2. Computer Networks / Networking / Protocols
  if (
    norm.includes('network') ||
    norm.includes('tcp') ||
    norm.includes('protocol') ||
    norm.includes('osi') ||
    norm.includes('routing')
  ) {
    return [
      {
        id: 1,
        title: 'D1: Diagnostic — OSI Model vs TCP/IP Protocol Layering',
        scenario:
          'You are diagnosing packet delivery between two hosts across subnets. At which layer does IP logical addressing and packet routing occur compared to TCP reliable stream delivery?',
        explanation:
          'In the standard network architecture, IP (Internet Protocol) operates at Layer 3 (Network Layer), handling global logical host addressing (IPv4/IPv6), subnet identification, and intermediate router hop-by-hop forwarding. TCP (Transmission Control Protocol) operates at Layer 4 (Transport Layer), establishing end-to-end connections, in-order packet delivery, flow control (sliding window), and error recovery over unreliable Layer 3 networks.',
        options: [
          {
            id: '1a',
            text: 'IP operates at Layer 3 (Network), while TCP operates at Layer 4 (Transport)',
            is_correct: true,
            concept_id: 'osi_layers',
          },
          {
            id: '1b',
            text: 'IP operates at Layer 2 (Data Link), while TCP is Layer 7 (Application)',
            is_correct: false,
            concept_id: 'osi_layers',
            misconception_flag: 'Confusing Network Layer IP with Data Link MAC frames',
          },
          {
            id: '1c',
            text: 'Both protocols are merged into the physical hardware NIC layer',
            is_correct: false,
            concept_id: 'osi_layers',
          },
        ],
      },
      {
        id: 2,
        title: 'D2: Concept Check — TCP 3-Way Handshake & State Machine',
        scenario:
          'A client establishes a TCP connection to an HTTP server. What is the precise sequence of segment flags and sequence number exchanges that establishes synchronized state?',
        explanation:
          'The TCP 3-Way Handshake consists of: 1) Client sends SYN with initial sequence number seq = x (Client state: SYN_SENT). 2) Server replies with SYN-ACK with its own initial sequence number seq = y and acknowledgment ack = x + 1 (Server state: SYN_RECEIVED). 3) Client sends ACK with ack = y + 1 (Client state: ESTABLISHED). Once received, both client and server have verified bidirectional communication.',
        options: [
          {
            id: '2a',
            text: 'Client sends SYN(seq=x) -> Server replies SYN-ACK(seq=y, ack=x+1) -> Client sends ACK(ack=y+1)',
            is_correct: true,
            concept_id: 'tcp_handshake',
          },
          {
            id: '2b',
            text: 'Client sends ACK -> Server sends FIN -> Client sends RST',
            is_correct: false,
            concept_id: 'tcp_handshake',
            misconception_flag: 'Confusing connection teardown flags with handshake synchronization',
          },
          {
            id: '2c',
            text: 'Client broadcasts UDP discovery packet to all subnet addresses',
            is_correct: false,
            concept_id: 'tcp_handshake',
          },
        ],
      },
      {
        id: 3,
        title: 'D3: Challenge — Congestion Control: AIMD Mechanics',
        scenario:
          'In TCP Reno congestion avoidance, how does the sender adjust its Congestion Window (cwnd) during steady-state transmission versus when a packet drop is detected?',
        explanation:
          'TCP uses Additive Increase Multiplicative Decrease (AIMD). During congestion avoidance, cwnd increases linearly by 1 Maximum Segment Size (MSS) per Round Trip Time (RTT): cwnd ← cwnd + 1 (Additive Increase). Upon detecting packet loss via triple duplicate ACKs, cwnd is immediately halved: cwnd ← cwnd / 2 (Multiplicative Decrease) and slow-start threshold ssthresh is set to the new cwnd, rapidly relieving network congestion without crashing throughput to 1 MSS.',
        options: [
          {
            id: '3a',
            text: 'Increases cwnd by 1 MSS per RTT (Additive Increase); halves cwnd upon packet loss (Multiplicative Decrease)',
            is_correct: true,
            concept_id: 'congestion_control',
          },
          {
            id: '3b',
            text: 'Doubles cwnd every second indefinitely without backoff',
            is_correct: false,
            concept_id: 'congestion_control',
            misconception_flag: 'Assuming exponential slow-start continues during steady-state congestion avoidance',
          },
          {
            id: '3c',
            text: 'Decreases transmission speed by requesting the ISP to throttle bandwidth',
            is_correct: false,
            concept_id: 'congestion_control',
          },
        ],
      },
      {
        id: 4,
        title: 'D4: Misconception Detection — Subnetting & CIDR Calculation',
        scenario:
          'An infrastructure engineer is allocating a subnet with CIDR prefix `192.168.10.0/27`. What is the total number of usable host IP addresses available for client machines?',
        explanation:
          'An IPv4 address has 32 bits. A /27 prefix leaves 32 - 27 = 5 bits for host addresses. Total combinations = 2⁵ = 32 addresses. In standard IPv4 networking, 2 addresses are reserved: the Network Address (all host bits 0: 192.168.10.0) and the Broadcast Address (all host bits 1: 192.168.10.31). Usable host addresses = 32 - 2 = 30 (range: 192.168.10.1 to 192.168.10.30).',
        options: [
          {
            id: '4a',
            text: '32 usable hosts, because all binary combinations can be assigned to network interfaces',
            is_correct: false,
            concept_id: 'subnetting',
            misconception_flag: 'Forgetting that network (.0) and broadcast (.31) addresses are reserved and cannot be assigned',
          },
          {
            id: '4b',
            text: '30 usable hosts (2^5 = 32 minus 2 reserved addresses: network and broadcast)',
            is_correct: true,
            concept_id: 'subnetting',
          },
          {
            id: '4c',
            text: '27 usable hosts, directly equal to the CIDR prefix number',
            is_correct: false,
            concept_id: 'subnetting',
          },
        ],
      },
      {
        id: 5,
        title: 'D5: Explanation — DNS Resolution Hierarchy',
        scenario:
          'When a browser visits `learnforge.app` with an empty cache, what is the exact hierarchical sequence of DNS servers queried during recursive resolution?',
        explanation:
          'The recursive DNS resolver traverses the hierarchy: 1) Queries the Root DNS Server (returns referral to .app Top-Level Domain TLD servers). 2) Queries the .app TLD Nameserver (returns referral to the authoritative nameserver for learnforge.app). 3) Queries the Authoritative Nameserver, which holds the zone records and returns the IP address (A/AAAA record) to the resolver, which caches it and returns it to the client.',
        options: [
          {
            id: '5a',
            text: 'Root Nameserver -> TLD (.app) Nameserver -> Authoritative Nameserver for learnforge.app',
            is_correct: true,
            concept_id: 'dns_resolution',
          },
          {
            id: '5b',
            text: 'Local Wi-Fi Router -> Client GPU RAM -> External Satellite direct broadcast',
            is_correct: false,
            concept_id: 'dns_resolution',
            misconception_flag: 'Confusing DNS hierarchical resolution with local hardware buses',
          },
          {
            id: '5c',
            text: 'Direct single query to the global central DNS database master server',
            is_correct: false,
            concept_id: 'dns_resolution',
          },
        ],
      },
      {
        id: 6,
        title: 'D6: Reinforcement — HTTP/2 vs HTTP/3 (QUIC Protocol)',
        scenario:
          'While HTTP/2 multiplexes multiple streams over a single TCP connection, packet loss causes Head-of-Line (HoL) blocking. How does HTTP/3 (QUIC over UDP) eliminate this issue?',
        explanation:
          'In HTTP/2, all streams share a single TCP byte stream; if a single TCP segment is lost in transit, the TCP stack stops delivering subsequent bytes to the application until the lost segment is retransmitted (transport-layer Head-of-Line blocking). HTTP/3 runs over QUIC (built on UDP), where each stream has its own independent stream framing and packet sequencing. A dropped packet in stream A only delays stream A; streams B and C continue receiving and processing data with zero delay.',
        options: [
          {
            id: '6a',
            text: 'QUIC handles streams independently over UDP so a dropped packet in one stream does not stall data delivery for other streams',
            is_correct: true,
            concept_id: 'http_protocols',
          },
          {
            id: '6b',
            text: 'QUIC compresses all HTML into binary assembly instructions before transmission',
            is_correct: false,
            concept_id: 'http_protocols',
          },
          {
            id: '6c',
            text: 'HTTP/3 disables packet retransmissions entirely',
            is_correct: false,
            concept_id: 'http_protocols',
          },
        ],
      },
      {
        id: 7,
        title: 'D7: Adaptive Challenge — Routing: Distance Vector vs Link State (OSPF)',
        scenario:
          'Why do enterprise internal networks use Link-State protocols (e.g. OSPF) rather than Distance Vector protocols (e.g. RIP) for large complex topologies?',
        explanation:
          'Distance Vector protocols (e.g., RIP) share routing information only with direct neighbors ("routing by rumor"), which converges slowly and suffers from count-to-infinity loops. Link-State protocols (e.g., OSPF) flood Link State Advertisements (LSAs) so every router builds an identical complete topology graph of the network and independently runs Dijkstra shortest-path algorithm, ensuring instantaneous convergence, loop-free paths, and support for multi-area hierarchies.',
        options: [
          {
            id: '7a',
            text: 'OSPF routers build a complete topology graph and compute optimal shortest paths using Dijkstra algorithm, preventing routing loops and converging rapidly',
            is_correct: true,
            concept_id: 'routing_algorithms',
          },
          {
            id: '7b',
            text: 'Distance Vector protocols require specialized fiber optic cables to operate',
            is_correct: false,
            concept_id: 'routing_algorithms',
            misconception_flag: 'Confusing logical routing algorithms with physical layer cabling media',
          },
          {
            id: '7c',
            text: 'OSPF limits networks to a maximum of 15 router hops',
            is_correct: false,
            concept_id: 'routing_algorithms',
          },
        ],
      },
      {
        id: 8,
        title: 'D8: Final Evaluation — NAT & Port Address Translation (PAT)',
        scenario:
          'How does a home Wi-Fi NAT router allow 50 internal private IP devices (e.g., `192.168.1.X`) to share a single public IPv4 address simultaneously?',
        explanation:
          'The NAT router utilizes Port Address Translation (PAT / NAPT). When an internal host sends an outbound packet (e.g. 192.168.1.5:49152), the router replaces the source IP with its single public IP (e.g. 203.0.113.1) and assigns a unique ephemeral source port (e.g. 203.0.113.1:51234), recording the mapping in its stateful NAT table. When the return packet arrives, the router matches the port in the table and rewrites the destination back to the private host.',
        options: [
          {
            id: '8a',
            text: 'By mapping each internal private IP:port pair to a unique source port on the single external public IP in a stateful NAT translation table',
            is_correct: true,
            concept_id: 'nat_architecture',
          },
          {
            id: '8b',
            text: 'By broadcasting all incoming packets to every private device on the LAN',
            is_correct: false,
            concept_id: 'nat_architecture',
            misconception_flag: 'Confusing stateful port translation with unsecured hub broadcasting',
          },
          {
            id: '8c',
            text: 'By appending additional MAC address headers to the IP payload',
            is_correct: false,
            concept_id: 'nat_architecture',
          },
        ],
      },
    ];
  }

  // 3. Operating Systems / Concurrency / Architecture
  if (
    norm.includes('operating system') ||
    norm.includes('os') ||
    norm.includes('concurrency') ||
    norm.includes('kernel') ||
    norm.includes('process')
  ) {
    return [
      {
        id: 1,
        title: 'D1: Diagnostic — Processes vs Threads & Address Spaces',
        scenario:
          'You are architecture-reviewing a high-throughput web server experiencing slow request initialization. Worker threads are being replaced with heavy process spawns. What architectural trade-off occurs?',
        explanation:
          'Processes are isolated execution units with their own private virtual address spaces (code, data, heap, stack, page tables) and file descriptor tables. Creating a process requires allocating new page tables, copying parent memory descriptors (via fork/copy-on-write), and incurs higher context switch overhead (invalidating TLBs). Threads belong to the same process and share the heap, data, and open file descriptors, having only their own register context and private call stack.',
        options: [
          {
            id: '1a',
            text: 'Processes share the same heap memory space, causing memory corruption',
            is_correct: false,
            concept_id: 'processes',
            misconception_flag: 'Confusing process address space isolation with shared thread memory',
          },
          {
            id: '1b',
            text: 'Processes have independent virtual address spaces, increasing spawn and context-switch memory overhead',
            is_correct: true,
            concept_id: 'processes',
          },
          {
            id: '1c',
            text: 'Threads cannot execute concurrently on multi-core processors',
            is_correct: false,
            concept_id: 'threads',
          },
        ],
      },
      {
        id: 2,
        title: 'D2: Concept Check — CPU Scheduling Algorithms',
        scenario:
          'A real-time database system suffers from long queue times for short read queries because long-running analytical queries hold the CPU. Which scheduling policy minimizes average waiting time for short bursts?',
        explanation:
          'Shortest Job First (SJF) and its preemptive counterpart Shortest Remaining Time First (SRTF) are mathematically proven to minimize average waiting time across all scheduling policies. By prioritizing tasks with the shortest CPU burst times, SRTF allows short interactive queries to execute and leave the queue immediately without suffering from the convoy effect caused by First-Come First-Served (FCFS).',
        options: [
          {
            id: '2a',
            text: 'First-Come, First-Served (FCFS)',
            is_correct: false,
            concept_id: 'cpu_scheduling',
            misconception_flag: 'Assuming FCFS prevents convoy effect',
          },
          {
            id: '2b',
            text: 'Shortest Job First (SJF) / Shortest Remaining Time First (SRTF)',
            is_correct: true,
            concept_id: 'cpu_scheduling',
          },
          {
            id: '2c',
            text: 'Static Priority Scheduling with zero preemption',
            is_correct: false,
            concept_id: 'cpu_scheduling',
          },
        ],
      },
      {
        id: 3,
        title: 'D3: Challenge — Synchronization & Race Conditions',
        scenario:
          'Two threads increment a shared global counter variable `counter++` concurrently without locks. On a multi-core system, why does the final count periodically fall short of expected totals?',
        explanation:
          'The operation `counter++` is not an atomic hardware instruction; it translates to three machine instructions: 1) Load `counter` from RAM/cache into CPU register (e.g. `mov eax, [counter]`). 2) Increment register (`inc eax`). 3) Store result back into memory (`mov [counter], eax`). When two threads interleave these operations across CPU cores, both read the same initial value and write back identical increments, overwriting and discarding one of the additions.',
        options: [
          {
            id: '3a',
            text: 'Read-Modify-Write instructions (mov, add, mov) are non-atomic, allowing interleaved store updates',
            is_correct: true,
            concept_id: 'race_conditions',
          },
          {
            id: '3b',
            text: 'The CPU cache invalidates odd-numbered variables automatically',
            is_correct: false,
            concept_id: 'race_conditions',
          },
          {
            id: '3c',
            text: 'Compiler optimization deletes duplicate increment loops',
            is_correct: false,
            concept_id: 'race_conditions',
          },
        ],
      },
      {
        id: 4,
        title: 'D4: Misconception Detection — Starvation vs Deadlock',
        scenario:
          'A low-priority process has been waiting in the ready queue for 45 minutes while higher-priority processes continually preempt the CPU. Is this system in a Deadlock state?',
        explanation:
          'This is Starvation (indefinite postponement), not Deadlock. In starvation, high-priority processes are executing and making system progress, while the low-priority task is continuously bypassed. Deadlock requires a circular dependency where two or more processes are permanently blocked waiting for resources held by each other, causing zero progress across the deadlocked set.',
        options: [
          {
            id: '4a',
            text: 'Yes, because the low-priority process is completely unable to make progress',
            is_correct: false,
            concept_id: 'deadlocks',
            misconception_flag: 'Confusing starvation (indefinite delay) with deadlock (circular block state)',
          },
          {
            id: '4b',
            text: 'No, this is Starvation. Deadlock requires a circular wait state where blocked processes wait on each other',
            is_correct: true,
            concept_id: 'deadlocks',
          },
          {
            id: '4c',
            text: 'Yes, any process waiting over 5 minutes is defined as deadlocked by POSIX standards',
            is_correct: false,
            concept_id: 'deadlocks',
          },
        ],
      },
      {
        id: 5,
        title: 'D5: Explanation — Necessary Conditions for Deadlock',
        scenario:
          'To prevent deadlocks in a storage controller managing disk units, which set of four simultaneous conditions MUST hold for a deadlock to exist?',
        explanation:
          'Coffman\'s four conditions must all be satisfied simultaneously for a deadlock to occur: 1) Mutual Exclusion (resources cannot be shared). 2) Hold and Wait (processes hold allocated resources while requesting new ones). 3) No Preemption (resources cannot be forcibly taken from a process). 4) Circular Wait (a closed chain of processes exists where each process waits for a resource held by the next). Eliminating any single condition prevents deadlock entirely.',
        options: [
          {
            id: '5a',
            text: 'Mutual Exclusion, Hold & Wait, No Preemption, and Circular Wait',
            is_correct: true,
            concept_id: 'deadlock_conditions',
          },
          {
            id: '5b',
            text: 'High CPU Usage, Low RAM, Disk I/O Throttling, and Page Faults',
            is_correct: false,
            concept_id: 'deadlock_conditions',
          },
          {
            id: '5c',
            text: 'Preemption, Priority Inversion, Thread Pooling, and Spinlocking',
            is_correct: false,
            concept_id: 'deadlock_conditions',
          },
        ],
      },
      {
        id: 6,
        title: 'D6: Reinforcement — Virtual Memory & Page Replacement',
        scenario:
          'When physical RAM is exhausted and a Page Fault occurs, why does LRU (Least Recently Used) paging perform significantly better than FIFO (First-In First-Out)?',
        explanation:
          'LRU leverages the principle of temporal locality: pages accessed recently are highly likely to be accessed again in the near future, so evicting the page unused for the longest time minimizes future page faults. In contrast, FIFO evicts the oldest page regardless of how frequently or recently it is being accessed, and is vulnerable to Belady\'s Anomaly (where allocating more physical page frames can paradoxically increase total page faults).',
        options: [
          {
            id: '6a',
            text: 'LRU exploits temporal locality by evicting pages untouched for the longest time, avoiding Belady\'s Anomaly seen in FIFO',
            is_correct: true,
            concept_id: 'virtual_memory',
          },
          {
            id: '6b',
            text: 'LRU encrypts RAM pages before sending them to the swap disk partition',
            is_correct: false,
            concept_id: 'virtual_memory',
          },
          {
            id: '6c',
            text: 'FIFO requires double the physical motherboard memory channels',
            is_correct: false,
            concept_id: 'virtual_memory',
          },
        ],
      },
      {
        id: 7,
        title: 'D7: Adaptive Challenge — Semaphores vs Mutexes',
        scenario:
          'In a Producer-Consumer multi-threaded queue, which synchronization primitive correctly signals the consumer thread when new items are added to an empty buffer?',
        explanation:
          'A Counting Semaphore initialized to 0 (or a Condition Variable paired with a Mutex) allows the producer to signal `sem_post()` when an item is enqueued, incrementing the semaphore count and waking a sleeping consumer thread blocked in `sem_wait()`. Unlike spinlocks which waste CPU cycles in busy-waiting loops, semaphores place waiting threads into the OS sleep queue until awakened.',
        options: [
          {
            id: '7a',
            text: 'A Counting Semaphore initialized to available items (or Condition Variable signaling)',
            is_correct: true,
            concept_id: 'synchronization_primitives',
          },
          {
            id: '7b',
            text: 'A spinlock with an infinite empty while-loop (while(count==0);)',
            is_correct: false,
            concept_id: 'synchronization_primitives',
            misconception_flag: 'Relying on CPU-burning busy-waiting instead of OS blocking primitives',
          },
          {
            id: '7c',
            text: 'Disabling all CPU clock interrupts in user-space',
            is_correct: false,
            concept_id: 'synchronization_primitives',
          },
        ],
      },
      {
        id: 8,
        title: 'D8: Final Evaluation — File Systems & Inode Structures',
        scenario:
          'When modifying a file in a Unix filesystem, why does updating an existing 4KB block inside an existing inode avoid modifying the parent directory entry?',
        explanation:
          'In Unix/POSIX file systems (e.g. ext4, UFS), a directory is simply a special file containing a list of (filename, inode_number) mapping pairs. All file metadata (permissions, file size, timestamps, data block pointers) are stored inside the Inode data structure. Writing to an existing data block modifies the block content and updates inode metadata timestamps, but does not alter the directory entry because the filename and inode number remain unchanged.',
        options: [
          {
            id: '8a',
            text: 'The directory entry only maps filename -> inode number. File data blocks and size pointers reside entirely within the inode itself',
            is_correct: true,
            concept_id: 'file_systems',
          },
          {
            id: '8b',
            text: 'Because directory entries are stored on the network, not local storage',
            is_correct: false,
            concept_id: 'file_systems',
          },
          {
            id: '8c',
            text: 'Unix filesystems do not use directory tables',
            is_correct: false,
            concept_id: 'file_systems',
          },
        ],
      },
    ];
  }

  // 4. Fallback / Custom Generated Subject Topics
  return [
    {
      id: 1,
      title: `D1: Diagnostic — Core Foundations of ${subjectName}`,
      scenario: `You are analyzing the core architectural principles of ${subjectName}. What is the primary foundational mechanism governing its performance and design?`,
      explanation: `In ${subjectName}, core foundational mechanisms establish the operational boundaries, data structures, and mathematical invariants. Clear abstraction layering separates high-level domain semantics from low-level execution details, enabling modular scalability and predictable behavior under edge conditions.`,
      options: [
        {
          id: '1a',
          text: `The structured abstraction layers and core invariant rules defined in ${subjectName}`,
          is_correct: true,
          concept_id: 'foundations',
        },
        {
          id: '1b',
          text: 'Arbitrary random heuristics without reproducible mathematical models',
          is_correct: false,
          concept_id: 'foundations',
          misconception_flag: `Assuming ${subjectName} relies on unstructured ad-hoc logic`,
        },
        {
          id: '1c',
          text: 'Hardcoded static lookup tables that cannot generalize to novel inputs',
          is_correct: false,
          concept_id: 'foundations',
        },
      ],
    },
    {
      id: 2,
      title: `D2: Concept Check — Operational Mechanics in ${subjectName}`,
      scenario: `When executing high-throughput workflows in ${subjectName}, which design choice minimizes latency and computational bottlenecking?`,
      explanation: `Optimizing ${subjectName} workflows relies on eliminating serial synchronization bottlenecks through asynchronous pipelining, memory locality optimization, and efficient algorithmic complexity O(N) or O(log N).`,
      options: [
        {
          id: '2a',
          text: 'Asynchronous pipelining and decoupled state transitions',
          is_correct: true,
          concept_id: 'mechanics',
        },
        {
          id: '2b',
          text: 'Blocking synchronous loops that lock all execution threads',
          is_correct: false,
          concept_id: 'mechanics',
          misconception_flag: 'Ignoring the throughput cost of synchronous resource locking',
        },
        {
          id: '2c',
          text: 'Redundant disk serialization for every intermediate variable',
          is_correct: false,
          concept_id: 'mechanics',
        },
      ],
    },
    {
      id: 3,
      title: `D3: Challenge — Trade-off Analysis in ${subjectName}`,
      scenario: `In production environments for ${subjectName}, balancing accuracy/consistency against system resource utilization requires:`,
      explanation: `Engineering trade-offs in ${subjectName} balance computational resource budgets (CPU, RAM, bandwidth) against rigor and consistency guarantees. Employing adaptive caching, approximation algorithms, and targeted heuristics preserves critical fidelity without exponential overhead.`,
      options: [
        {
          id: '3a',
          text: 'Calibrating bounded error margins and dynamic resource allocation thresholds',
          is_correct: true,
          concept_id: 'tradeoffs',
        },
        {
          id: '3b',
          text: 'Maximizing all precision variables to infinite bit-depth regardless of cost',
          is_correct: false,
          concept_id: 'tradeoffs',
        },
        {
          id: '3c',
          text: 'Ignoring edge cases completely to artificially report 100% throughput',
          is_correct: false,
          concept_id: 'tradeoffs',
        },
      ],
    },
    {
      id: 4,
      title: `D4: Misconception Detection — Common Pitfalls in ${subjectName}`,
      scenario: `A practitioner believes that increasing raw compute power is sufficient to resolve all algorithmic scaling issues in ${subjectName}. Why is this reasoning flawed?`,
      explanation: `Amdahl\'s Law and algorithmic complexity bounds show that adding hardware resources cannot overcome inefficient algorithmic bottlenecks (e.g. exponential O(2ⁿ) complexity or serial execution sections). Scalable architecture in ${subjectName} requires algorithmic optimization and proper structural concurrency.`,
      options: [
        {
          id: '4a',
          text: 'Hardware scaling exhibits diminishing returns when algorithms possess serial bottlenecks or exponential complexity',
          is_correct: true,
          concept_id: 'scaling',
        },
        {
          id: '4b',
          text: 'Computers become slower when given more memory channels',
          is_correct: false,
          concept_id: 'scaling',
        },
        {
          id: '4c',
          text: 'Software algorithms automatically re-architect their source code at runtime',
          is_correct: false,
          concept_id: 'scaling',
        },
      ],
    },
    {
      id: 5,
      title: `D5: Explanation — Structural Principles in ${subjectName}`,
      scenario: `What is the role of invariant validation and error-checking boundaries within ${subjectName}?`,
      explanation: `Robust systems in ${subjectName} enforce defensive programming and fail-fast invariant checks at module boundaries to ensure that unexpected faults or invalid inputs are caught and handled safely before propagating into silent data corruption or cascading system failures.`,
      options: [
        {
          id: '5a',
          text: 'To ensure fail-fast isolation and prevent error cascading across subsystems',
          is_correct: true,
          concept_id: 'principles',
        },
        {
          id: '5b',
          text: 'To intentionally slow down execution so users can read debug logs',
          is_correct: false,
          concept_id: 'principles',
        },
        {
          id: '5c',
          text: 'To bypass all security and authentication checks',
          is_correct: false,
          concept_id: 'principles',
        },
      ],
    },
    {
      id: 6,
      title: `D6: Reinforcement — Performance Optimization in ${subjectName}`,
      scenario: `Which technique provides the most significant performance boost when processing large datasets in ${subjectName}?`,
      explanation: `Data locality and vectorized batch operations maximize CPU/GPU cache hit rates (L1/L2/L3 cache lines) and utilize SIMD instructions, achieving orders-of-magnitude higher throughput than scattered pointer dereferencing or un-vectorized element-by-element loops.`,
      options: [
        {
          id: '6a',
          text: 'Contiguous memory layout and vectorized batch operations',
          is_correct: true,
          concept_id: 'optimization',
        },
        {
          id: '6b',
          text: 'Storing every data point in a distinct random network server',
          is_correct: false,
          concept_id: 'optimization',
        },
        {
          id: '6c',
          text: 'Inserting artificial 100ms sleep delays between iterations',
          is_correct: false,
          concept_id: 'optimization',
        },
      ],
    },
    {
      id: 7,
      title: `D7: Adaptive Challenge — Advanced Architecture in ${subjectName}`,
      scenario: `How do modern implementations of ${subjectName} maintain fault tolerance and high availability?`,
      explanation: `Modern high-availability designs employ consensus algorithms (e.g. Raft/Paxos), state machine replication, health heartbeats, and automated leader election so that failures of individual nodes or components are handled transparently without system downtime or data loss.`,
      options: [
        {
          id: '7a',
          text: 'Distributed consensus protocols and active state replication',
          is_correct: true,
          concept_id: 'fault_tolerance',
        },
        {
          id: '7b',
          text: 'Relying exclusively on a single unbacked physical hard drive',
          is_correct: false,
          concept_id: 'fault_tolerance',
        },
        {
          id: '7c',
          text: 'Turning off power supplies during peak usage hours',
          is_correct: false,
          concept_id: 'fault_tolerance',
        },
      ],
    },
    {
      id: 8,
      title: `D8: Final Evaluation — Synthesis & Mastery of ${subjectName}`,
      scenario: `Demonstrating complete mastery of ${subjectName} involves synthesizing foundational theories with practical real-world system design. Which approach exemplifies this?`,
      explanation: `Mastery of ${subjectName} is characterized by the ability to systematically analyze system requirements, anticipate failure modes and bottlenecks, and engineer mathematically sound, resilient, and performant architectures that scale predictably under real-world constraints.`,
      options: [
        {
          id: '8a',
          text: 'Designing mathematically rigorous, modular architectures that balance latency, throughput, and error resilience',
          is_correct: true,
          concept_id: 'synthesis',
        },
        {
          id: '8b',
          text: 'Copying unverified forum snippets without understanding underlying mechanics',
          is_correct: false,
          concept_id: 'synthesis',
        },
        {
          id: '8c',
          text: 'Deleting all tests and documentation prior to production release',
          is_correct: false,
          concept_id: 'synthesis',
        },
      ],
    },
  ];
}
