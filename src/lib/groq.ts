/**
 * groq.ts — Minimal Groq API client.
 *
 * Calls the Groq cloud API (groq.com) for fast LLM inference.
 * Uses the user's personal API key from localStorage.
 *
 * The key is stored in localStorage under 'groq-api-key' and
 * can be set/updated in the AI Insights page.
 */

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqStreamChunk {
  content: string;
  done: boolean;
}

/** Get the stored API key, or null if not set. */
export function getGroqKey(): string | null {
  try {
    return localStorage.getItem('groq-api-key');
  } catch {
    return null;
  }
}

/** Persist a Groq API key. */
export function setGroqKey(key: string): void {
  localStorage.setItem('groq-api-key', key);
}

/** Check if a key looks valid (non-empty, starts with 'gsk_'). */
export function isValidGroqKey(key: string): boolean {
  return key.length > 10 && key.startsWith('gsk_');
}

/**
 * Stream a chat completion from Groq.
 * Yields { content, done } chunks as they arrive.
 * Throws on network or API errors.
 */
export async function* streamGroqChat(
  messages: GroqMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
  }
): AsyncGenerator<GroqStreamChunk> {
  const key = getGroqKey();
  if (!key) throw new Error('Groq API key not set. Add your key in AI Insights settings.');

  const model = options?.model || 'llama-3.3-70b-versatile';
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 4096;

  const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
    signal: options?.signal,
  });

  if (!response.ok) {
    let errorText = '';
    try {
      errorText = await response.text();
    } catch {
      errorText = response.statusText;
    }
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Groq: response body is not readable');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          yield { content: '', done: true };
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            yield { content: delta, done: false };
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { content: '', done: true };
}