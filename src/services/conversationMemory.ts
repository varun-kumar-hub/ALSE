import { ChatMessage } from './types';

export type MemoryMode = 'current' | 'workspace' | 'global' | 'disabled';

export interface IndexedMemoryItem {
  id: string;
  chatId: string;
  chatTitle: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  tokens: string[];
}

export interface ConversationSummary {
  chatId: string;
  title: string;
  summaryText: string;
  keyEntities: string[];
  lastUpdated: string;
}

export interface MemoryRetrievalResult {
  items: IndexedMemoryItem[];
  summaries: ConversationSummary[];
  formattedContextText: string;
  relevanceScore: number;
}

export class ConversationMemoryManager {
  private memoryIndex: Map<string, IndexedMemoryItem[]> = new Map();
  private summaries: Map<string, ConversationSummary> = new Map();

  /**
   * Tokenize text into normalized lowercase tokens for TF-IDF / keyword similarity matching
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
  }

  /**
   * Index a chat conversation in local memory
   */
  public indexChat(chatId: string, chatTitle: string, messages: ChatMessage[]): void {
    const items: IndexedMemoryItem[] = [];

    for (const msg of messages) {
      if (!msg.content || msg.content.trim().length === 0) continue;
      items.push({
        id: msg.id,
        chatId,
        chatTitle,
        content: msg.content.trim(),
        role: msg.role,
        timestamp: msg.timestamp || new Date().toISOString(),
        tokens: this.tokenize(msg.content),
      });
    }

    this.memoryIndex.set(chatId, items);

    // Generate lightweight conversation summary for long conversations
    if (messages.length >= 6) {
      this.generateSummary(chatId, chatTitle, messages);
    }
  }

  /**
   * Generate an automated summary for a long conversation to fit context budget
   */
  private generateSummary(chatId: string, chatTitle: string, messages: ChatMessage[]): void {
    const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content);
    const keyEntities: string[] = [];

    userMessages.forEach((text) => {
      const matches = text.match(/\b([A-Z][a-zA-Z0-9_-]{2,})\b/g);
      if (matches) {
        matches.forEach((e) => {
          if (!keyEntities.includes(e)) keyEntities.push(e);
        });
      }
    });

    const summaryText = `Conversation titled "${chatTitle}" covered ${messages.length} messages. Main topics: ${keyEntities.slice(0, 5).join(', ') || 'general discussion'}.`;

    this.summaries.set(chatId, {
      chatId,
      title: chatTitle,
      summaryText,
      keyEntities,
      lastUpdated: new Date().toISOString(),
    });
  }

  /**
   * Retrieve relevant prior messages & summaries matching user prompt
   */
  public retrieveRelevantMemory(
    queryPrompt: string,
    currentChatId: string | null,
    mode: MemoryMode = 'workspace',
    maxItems = 4
  ): MemoryRetrievalResult {
    if (mode === 'disabled' || mode === 'current') {
      return {
        items: [],
        summaries: [],
        formattedContextText: '',
        relevanceScore: 0,
      };
    }

    const queryTokens = this.tokenize(queryPrompt);
    if (queryTokens.length === 0) {
      return {
        items: [],
        summaries: [],
        formattedContextText: '',
        relevanceScore: 0,
      };
    }

    const candidateItems: { item: IndexedMemoryItem; score: number }[] = [];

    // Search across indexed chats (excluding current active chat)
    for (const [chatId, items] of this.memoryIndex.entries()) {
      if (chatId === currentChatId) continue; // Skip current chat

      for (const item of items) {
        let matchCount = 0;
        for (const qt of queryTokens) {
          if (item.tokens.includes(qt)) {
            matchCount++;
          }
        }
        if (matchCount > 0) {
          const score = matchCount / (queryTokens.length + Math.log(item.tokens.length + 1));
          candidateItems.push({ item, score });
        }
      }
    }

    // Sort by highest relevance score
    candidateItems.sort((a, b) => b.score - a.score);
    const topItems = candidateItems.slice(0, maxItems).map((c) => c.item);

    const relevantSummaries: ConversationSummary[] = [];
    const matchedChatIds = new Set(topItems.map((i) => i.chatId));
    for (const id of matchedChatIds) {
      const summary = this.summaries.get(id);
      if (summary) relevantSummaries.push(summary);
    }

    // Format context string for AI prompt inclusion
    let formattedContextText = '';
    if (topItems.length > 0) {
      const contextLines = ['[Relevant Previous Conversation Memory]:'];
      for (const item of topItems) {
        contextLines.push(`- From Chat "${item.chatTitle}" (${item.role}): ${item.content.slice(0, 300)}`);
      }
      formattedContextText = contextLines.join('\n') + '\n\n';
    }

    const topScore = candidateItems.length > 0 ? candidateItems[0].score : 0;

    return {
      items: topItems,
      summaries: relevantSummaries,
      formattedContextText,
      relevanceScore: topScore,
    };
  }

  /**
   * Clear memory for a specific chat or workspace
   */
  public clearMemory(chatId?: string): void {
    if (chatId) {
      this.memoryIndex.delete(chatId);
      this.summaries.delete(chatId);
    } else {
      this.memoryIndex.clear();
      this.summaries.clear();
    }
  }
}

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'or', 'by', 'with', 'as', 'it', 'this', 'that', 'from', 'my', 'your', 'we', 'are', 'be', 'has', 'have', 'had', 'do', 'does', 'did', 'but', 'if', 'not', 'what', 'how', 'why', 'can', 'you', 'i', 'me', 'about', 'give', 'tell', 'list', 'please', 'explain', 'show'
]);

export const conversationMemoryManager = new ConversationMemoryManager();
