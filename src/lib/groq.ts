/**
 * groq.ts — Groq API client (server-side proxy).
 *
 * Calls the Groq API through a Supabase Edge Function (groq-proxy),
 * so the API key stays on the server and never reaches the browser.
 *
 * The edge function must be deployed and the GROQ_API_KEY secret set:
 *   supabase secrets set GROQ_API_KEY=your_key
 *   supabase functions deploy groq-proxy
 */

import { supabase } from './supabase';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqStreamChunk {
  content: string;
  done: boolean;
}

/**
 * Resolve the edge function URL.
 * Uses the Supabase project URL from the client config.
 */
function getFunctionUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL is not set');
  // Remove trailing slash and append /functions/v1/groq-proxy
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/groq-proxy`;
}

/**
 * Stream a chat completion from Groq via the Supabase edge function.
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
  const url = getFunctionUrl();
  const model = options?.model || 'llama-3.3-70b-versatile';
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 4096;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Forward the user's session for auth (the edge function can verify if needed)
      Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
    },
    body: JSON.stringify({
      messages,
      model,
      temperature,
      maxTokens,
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
    // Try to parse JSON error
    try {
      const parsed = JSON.parse(errorText);
      throw new Error(parsed.error || `Groq API error (${response.status})`);
    } catch {
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }
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
      buffer = lines.pop() || '';

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