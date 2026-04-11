// ────────────────────────────────────────────────────────────────────────────
// useAgentStream — SSE-based hook for real-time agent interactions
// Manages the agent lifecycle FSM: idle → connecting → thinking → streaming → completed/failed
// ────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import type { AgentStatus, AgentChunk, AgentMessage, AgentStreamConfig } from '../types';
import { createAgentStream } from '../services';
import type { AgentStreamController } from '../services';

interface UseAgentStreamState {
  status: AgentStatus;
  messages: AgentMessage[];
  currentStreamContent: string;
  error: string | null;
}

interface UseAgentStreamReturn extends UseAgentStreamState {
  sendMessage: (prompt: string) => void;
  disconnect: () => void;
  clearMessages: () => void;
  isStreaming: boolean;
  isConnected: boolean;
}

export function useAgentStream(config: AgentStreamConfig): UseAgentStreamReturn {
  const [state, setState] = useState<UseAgentStreamState>({
    status: 'idle',
    messages: [],
    currentStreamContent: '',
    error: null,
  });

  const streamRef = useRef<AgentStreamController | null>(null);
  const contentBufferRef = useRef<string>('');

  const sendMessage = useCallback(
    (prompt: string) => {
      // Add user message to history
      const userMessage: AgentMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: prompt,
        status: 'completed',
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        currentStreamContent: '',
        error: null,
      }));

      contentBufferRef.current = '';

      // Create stream connection
      const stream = createAgentStream(config, {
        onChunk: (chunk: AgentChunk) => {
          if (chunk.event === 'token') {
            contentBufferRef.current += chunk.data;
            setState((prev) => ({
              ...prev,
              currentStreamContent: contentBufferRef.current,
              status: 'streaming',
            }));
          }
        },
        onStatusChange: (status: AgentStatus) => {
          setState((prev) => ({ ...prev, status }));
        },
        onError: (error: Error) => {
          setState((prev) => ({
            ...prev,
            error: error.message,
            status: 'failed',
          }));
        },
        onComplete: () => {
          // Finalize the streamed content into a complete agent message
          const agentMessage: AgentMessage = {
            id: crypto.randomUUID(),
            role: 'agent',
            content: contentBufferRef.current,
            status: 'completed',
            createdAt: new Date().toISOString(),
          };

          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, agentMessage],
            currentStreamContent: '',
            status: 'completed',
          }));

          contentBufferRef.current = '';
        },
      });

      streamRef.current = stream;
      stream.connect({ prompt });
    },
    [config]
  );

  const disconnect = useCallback(() => {
    streamRef.current?.disconnect();
    setState((prev) => ({ ...prev, status: 'idle' }));
  }, []);

  const clearMessages = useCallback(() => {
    setState({
      status: 'idle',
      messages: [],
      currentStreamContent: '',
      error: null,
    });
    contentBufferRef.current = '';
  }, []);

  return {
    ...state,
    sendMessage,
    disconnect,
    clearMessages,
    isStreaming: state.status === 'streaming' || state.status === 'thinking',
    isConnected: streamRef.current?.isConnected() ?? false,
  };
}
