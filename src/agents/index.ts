/**
 * Nexus Agent Specialized Agents Subsystem
 */

export interface AgentDescriptor {
  id: string;
  name: string;
  category: 'coder' | 'research' | 'planner' | 'vision' | 'memory' | 'general';
  description: string;
  status: 'ready' | 'loading' | 'disabled';
}

export const AGENT_REGISTRY: AgentDescriptor[] = [
  {
    id: 'coder-agent',
    name: 'Coder Specialist Agent',
    category: 'coder',
    description: 'Expert code generation, debugging, refactoring, and architectural analysis.',
    status: 'ready',
  },
  {
    id: 'research-agent',
    name: 'Deep Research Agent',
    category: 'research',
    description: 'Multi-source web acquisition, paper retrieval, and cross-verification.',
    status: 'ready',
  },
  {
    id: 'planner-agent',
    name: 'Execution Planner Agent',
    category: 'planner',
    description: 'Task decomposition, milestone planning, and multi-step task routing.',
    status: 'ready',
  },
  {
    id: 'vision-agent',
    name: 'Vision & Multimodal Agent',
    category: 'vision',
    description: 'Diagram, image, screenshot, and visual document analysis.',
    status: 'ready',
  },
  {
    id: 'memory-agent',
    name: 'RAG & Vector Memory Agent',
    category: 'memory',
    description: 'SQLite persistence, document embeddings, and conversation recall.',
    status: 'ready',
  },
];
