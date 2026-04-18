"use client";

import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChatState, ChatAction, Conversation, Message, LLMConfig, DEFAULT_OPUSMAX_CONFIG, Artifact, ToolCall, AttachedFile, ContentBlock } from "@/lib/types";

const DEFAULT_SETTINGS: LLMConfig = {
  ...DEFAULT_OPUSMAX_CONFIG,
  apiKey: "",
};

const initialState: ChatState = {
  conversations: [],
  currentConversationId: null,
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  isThinking: false,
  isSettingsOpen: false,
  isSidebarOpen: true,
  activeArtifactId: null,
  attachedFiles: [],
  searchQuery: "",
  abortController: null,
  activeMode: "none",
  activeModelName: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_CONVERSATIONS":
      return { ...state, conversations: action.payload };

    case "ADD_CONVERSATION":
      return {
        ...state,
        conversations: [action.payload, ...state.conversations],
        currentConversationId: action.payload.id,
        attachedFiles: [],
        activeArtifactId: null,
      };

    case "DELETE_CONVERSATION": {
      const newConversations = state.conversations.filter((c) => c.id !== action.payload);
      const newCurrentId =
        state.currentConversationId === action.payload
          ? newConversations[0]?.id || null
          : state.currentConversationId;
      return { ...state, conversations: newConversations, currentConversationId: newCurrentId };
    }

    case "UPDATE_CONVERSATION":
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };

    case "SELECT_CONVERSATION":
      return { ...state, currentConversationId: action.payload, activeArtifactId: null, attachedFiles: [] };

    case "ADD_MESSAGE": {
      const { conversationId, message } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, message], updatedAt: Date.now() }
            : c
        ),
      };
    }

    case "UPDATE_MESSAGE": {
      const { conversationId, messageId, updates } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId ? { ...m, ...updates } : m
                ),
                updatedAt: Date.now(),
              }
            : c
        ),
      };
    }

    case "SET_SETTINGS":
      return { ...state, settings: action.payload };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_THINKING":
      return { ...state, isThinking: action.payload };

    case "SET_ACTIVE_MODEL_NAME":
      return { ...state, activeModelName: action.payload };

    case "TOGGLE_SETTINGS":
      return { ...state, isSettingsOpen: !state.isSettingsOpen };

    case "TOGGLE_SIDEBAR":
      return { ...state, isSidebarOpen: !state.isSidebarOpen };

    case "SET_ACTIVE_ARTIFACT":
      return { ...state, activeArtifactId: action.payload };

    case "ADD_ARTIFACT": {
      const { conversationId, artifact } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, artifacts: { ...c.artifacts, [artifact.id]: artifact }, updatedAt: Date.now() }
            : c
        ),
        activeArtifactId: artifact.id,
      };
    }

    case "UPDATE_ARTIFACT": {
      const { conversationId, artifactId, updates } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                artifacts: {
                  ...c.artifacts,
                  [artifactId]: { ...c.artifacts[artifactId], ...updates },
                },
                updatedAt: Date.now(),
              }
            : c
        ),
      };
    }

    case "ADD_ATTACHED_FILE":
      return { ...state, attachedFiles: [...state.attachedFiles, action.payload] };

    case "REMOVE_ATTACHED_FILE":
      return { ...state, attachedFiles: state.attachedFiles.filter((f) => f.id !== action.payload) };

    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload };

    case "ADD_TOOL_CALL": {
      const { conversationId, toolCall } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, toolCalls: { ...c.toolCalls, [toolCall.id]: toolCall }, updatedAt: Date.now() }
            : c
        ),
      };
    }

    case "UPDATE_TOOL_CALL": {
      const { conversationId, toolCallId, updates } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                toolCalls: {
                  ...c.toolCalls,
                  [toolCallId]: { ...c.toolCalls[toolCallId], ...updates },
                },
                updatedAt: Date.now(),
              }
            : c
        ),
      };
    }

    case "SET_ABORT_CONTROLLER":
      return { ...state, abortController: action.payload };

    case "SET_ACTIVE_MODE":
      return { ...state, activeMode: action.payload };

    default:
      return state;
  }
}

interface ChatContextType {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  createNewConversation: () => Conversation;
  sendMessage: (content: string, options?: { extendedThinking?: boolean; webSearch?: boolean }) => Promise<void>;
  stopGeneration: () => void;
  addArtifact: (artifact: Artifact) => void;
  updateArtifact: (artifactId: string, updates: Partial<Artifact>) => void;
  setActiveArtifact: (id: string | null) => void;
  attachFile: (file: AttachedFile) => void;
  removeFile: (id: string) => void;
  setActiveMode: (mode: "none" | "deepResearch" | "webSearch" | "code") => void;
  setActiveModelName: (name: string | null) => void;
  isAuthenticated: boolean;
  userId: string | null | undefined;
  username: string;
  logout: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children, userId, username }: { children: ReactNode; userId?: string | null; username?: string }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const latestStateRef = useRef(state);
  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  // Save to cloud on state change (debounced)
  const saveToCloud = useCallback(async () => {
    if (!userId) return;
    try {
      await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversations: state.conversations,
          settings: state.settings,
        }),
      });
    } catch (err) {
      console.error("Failed to save to cloud:", err);
    }
  }, [userId, state.conversations, state.settings]);

  // Load from cloud on mount
  useEffect(() => {
    if (!userId) return;

    const loadFromCloud = async () => {
      try {
        const res = await fetch("/api/chats");
        if (res.ok) {
          const data = await res.json();
          if (data.conversations?.length > 0) {
            dispatch({ type: "SET_CONVERSATIONS", payload: data.conversations });
          }
          if (data.settings) {
            dispatch({ type: "SET_SETTINGS", payload: data.settings });
          }
        }
      } catch (err) {
        console.error("Failed to load from cloud:", err);
      }
    };

    loadFromCloud();
  }, [userId]);

  // Save to cloud on conversations or settings change (with debounce)
  useEffect(() => {
    if (!userId || state.conversations.length === 0) return;

    const timeout = setTimeout(() => {
      saveToCloud();
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeout);
  }, [userId, state.conversations, state.settings, saveToCloud]);

  const createNewConversation = (): Conversation => {
    const conversation: Conversation = {
      id: uuidv4(),
      title: "New conversation",
      messages: [],
      artifacts: {},
      toolCalls: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    dispatch({ type: "ADD_CONVERSATION", payload: conversation });
    return conversation;
  };

  const sendMessage = async (content: string, options?: { extendedThinking?: boolean; webSearch?: boolean }) => {
    let conversationId = latestStateRef.current.currentConversationId;

    if (!conversationId) {
      const conversation: Conversation = {
        id: uuidv4(),
        title: "New conversation",
        messages: [],
        artifacts: {},
        toolCalls: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      dispatch({ type: "ADD_CONVERSATION", payload: conversation });
      conversationId = conversation.id;
    }

    const contentBlocks: ContentBlock[] = [{ type: "text", text: content }];

    if (latestStateRef.current.attachedFiles.length > 0) {
      for (const file of latestStateRef.current.attachedFiles) {
        const mediaTypeMatch = file.type.match(/^(\w+\/[\w+.-]+)/);
        const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : file.type || "application/octet-stream";

        contentBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: file.data.split(",")[1],
          },
        });
      }
    }

    const identityPatterns = [
      /who are you/i,
      /what are you/i,
      /tell me about (yourself|you)/i,
      /who created you/i,
      /about rinish/i,
      /what is rinish/i,
      /introduce yourself/i,
      /what can you do/i,
    ];
    const isIdentityQuestion = identityPatterns.some((p) => p.test(content));

    const rinishIdentityResponse = `I'm **Rinish AI** — an intelligent gateway that connects you to a variety of powerful AI LLM models, including Claude, GPT, and more.

I'm the first of my kind that lets you connect a custom AI gateway API via a proxy API of your own. Built with openness in mind, Rinish AI is open source, crafted with care by **Yadish**.

Whether you need help with research, writing, coding, or creative tasks, I'm here to assist. Ask me anything!`;

    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: content,
      contentBlocks: contentBlocks,
      timestamp: Date.now(),
    };

    const assistantMessage: Message = {
      id: uuidv4(),
      role: "assistant",
      content: isIdentityQuestion ? rinishIdentityResponse : "",
      thinking: "",
      timestamp: Date.now(),
    };

    dispatch({ type: "ADD_MESSAGE", payload: { conversationId, message: userMessage } });
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_THINKING", payload: false });
    dispatch({ type: "REMOVE_ATTACHED_FILE", payload: "" });

    if (isIdentityQuestion) {
      dispatch({ type: "ADD_MESSAGE", payload: { conversationId, message: assistantMessage } });
      dispatch({ type: "SET_LOADING", payload: false });
      dispatch({ type: "SET_ACTIVE_MODEL_NAME", payload: "Rinish AI" });
      return;
    }

    dispatch({ type: "ADD_MESSAGE", payload: { conversationId, message: assistantMessage } });

    const conversationData = latestStateRef.current.conversations.find((c) => c.id === conversationId);
    const previousMessages = conversationData?.messages.filter(
      (m) => m.id !== userMessage.id && m.id !== assistantMessage.id
    ) || [];
    const allMessages = [...previousMessages, userMessage];

    const extendedThinking = options?.extendedThinking ?? latestStateRef.current.settings.extendedThinking ?? false;

    const abortController = new AbortController();
    dispatch({ type: "SET_ABORT_CONTROLLER", payload: abortController });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages,
          settings: { ...latestStateRef.current.settings, extendedThinking },
          userId,
        }),
        signal: abortController.signal,
      });

      dispatch({ type: "SET_THINKING", payload: false });

      if (!response.ok) {
        let errorMessage = `API Error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Use default message
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";
      let textReceived = false;
      let isNonStreamingResponse = false;
      let detectedModelName: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        if (!buffer.includes("\n") && buffer.startsWith("{")) {
          isNonStreamingResponse = true;
        }

        if (isNonStreamingResponse) {
          try {
            const parsed = JSON.parse(buffer);
            if (parsed.content && Array.isArray(parsed.content)) {
              for (const block of parsed.content) {
                if (block.type === "text" && block.text) {
                  assistantMessage.content += block.text;
                  textReceived = true;
                }
              }
            }
            dispatch({
              type: "UPDATE_MESSAGE",
              payload: {
                conversationId,
                messageId: assistantMessage.id,
                updates: { content: assistantMessage.content || "Received empty response" },
              },
            });
            break;
          } catch {
            // Wait for more data
          }
        }

        while (buffer.includes("\n")) {
          const newlineIndex = buffer.indexOf("\n");
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith("event:")) {
            currentEvent = trimmed.slice(6).trim();
            continue;
          }

          if (trimmed.startsWith("data:")) {
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") break;

            if (currentEvent === "model_name") {
              detectedModelName = data;
              dispatch({ type: "SET_ACTIVE_MODEL_NAME", payload: data });
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              if (currentEvent === "content_block_delta" || parsed.type === "text_delta") {
                const delta = parsed.delta || parsed;
                if (delta?.type === "text_delta" && delta?.text) {
                  assistantMessage.content += delta.text;
                  textReceived = true;
                  dispatch({
                    type: "UPDATE_MESSAGE",
                    payload: {
                      conversationId,
                      messageId: assistantMessage.id,
                      updates: { content: assistantMessage.content },
                    },
                  });
                }
                if (delta?.type === "thinking_delta" && delta?.thinking) {
                  assistantMessage.thinking = (assistantMessage.thinking || "") + delta.thinking;
                  dispatch({
                    type: "UPDATE_MESSAGE",
                    payload: {
                      conversationId,
                      messageId: assistantMessage.id,
                      updates: { thinking: assistantMessage.thinking },
                    },
                  });
                }
              }
              else if (currentEvent === "message_delta" || parsed.type === "text") {
                const text = parsed.delta?.text || parsed.text || parsed.choices?.[0]?.delta?.content;
                if (text) {
                  assistantMessage.content += text;
                  textReceived = true;
                  dispatch({
                    type: "UPDATE_MESSAGE",
                    payload: {
                      conversationId,
                      messageId: assistantMessage.id,
                      updates: { content: assistantMessage.content },
                    },
                  });
                }
              }
              else if (parsed.choices?.[0]?.delta?.content) {
                assistantMessage.content += parsed.choices[0].delta.content;
                textReceived = true;
                dispatch({
                  type: "UPDATE_MESSAGE",
                  payload: {
                    conversationId,
                    messageId: assistantMessage.id,
                    updates: { content: assistantMessage.content },
                  },
                });
              }
              else if (parsed.content && Array.isArray(parsed.content)) {
                const textBlock = parsed.content.find((c: { type: string }) => c.type === "text");
                if (textBlock?.text) {
                  assistantMessage.content = textBlock.text;
                  textReceived = true;
                  dispatch({
                    type: "UPDATE_MESSAGE",
                    payload: {
                      conversationId,
                      messageId: assistantMessage.id,
                      updates: { content: assistantMessage.content },
                    },
                  });
                }
              }
            } catch {
              // Skip malformed JSON
            }
            currentEvent = "";
          }
        }
      }

      const conversation = latestStateRef.current.conversations.find((c) => c.id === conversationId);
      if (conversation) {
        if (conversation.messages.length === 2) {
          const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
          dispatch({
            type: "UPDATE_CONVERSATION",
            payload: { ...conversation, title },
          });
        }

        if (content.includes("[CODE_REQUEST]") || assistantMessage.content.includes("```")) {
          const codeBlocks = extractAndCreateArtifacts(assistantMessage.content);
          if (codeBlocks.length > 0) {
            codeBlocks.forEach((block, index) => {
              addArtifactFn({
                id: `artifact-${Date.now()}-${index}`,
                type: "code",
                title: `${block.language} code`,
                content: block.code,
                language: block.language,
                metadata: {},
                version: 1,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
            });
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        dispatch({
          type: "UPDATE_MESSAGE",
          payload: {
            conversationId,
            messageId: assistantMessage.id,
            updates: { content: assistantMessage.content + "\n\n*[Generation stopped]*" },
          },
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : "Failed to get response. Please check your settings.";
        dispatch({
          type: "UPDATE_MESSAGE",
          payload: {
            conversationId,
            messageId: assistantMessage.id,
            updates: { content: `Error: ${errorMessage}` },
          },
        });
      }
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      dispatch({ type: "SET_THINKING", payload: false });
      dispatch({ type: "SET_ABORT_CONTROLLER", payload: null });
    }
  };

  const addArtifactFn = (artifact: Artifact) => {
    const conversationId = latestStateRef.current.currentConversationId;
    if (conversationId) {
      dispatch({ type: "ADD_ARTIFACT", payload: { conversationId, artifact } });
    }
  };

  const extractAndCreateArtifacts = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    const codeBlocks: { language: string; code: string }[] = [];

    while ((match = codeBlockRegex.exec(content)) !== null) {
      codeBlocks.push({
        language: match[1] || "text",
        code: match[2].trim(),
      });
    }

    return codeBlocks;
  };

  const updateArtifact = (artifactId: string, updates: Partial<Artifact>) => {
    const conversationId = latestStateRef.current.currentConversationId;
    if (conversationId) {
      dispatch({ type: "UPDATE_ARTIFACT", payload: { conversationId, artifactId, updates } });
    }
  };

  const setActiveArtifact = (id: string | null) => {
    dispatch({ type: "SET_ACTIVE_ARTIFACT", payload: id });
  };

  const attachFile = (file: AttachedFile) => {
    dispatch({ type: "ADD_ATTACHED_FILE", payload: file });
  };

  const removeFile = (id: string) => {
    dispatch({ type: "REMOVE_ATTACHED_FILE", payload: id });
  };

  const setActiveMode = (mode: "none" | "deepResearch" | "webSearch" | "code") => {
    dispatch({ type: "SET_ACTIVE_MODE", payload: mode });
  };

  const setActiveModelName = (name: string | null) => {
    dispatch({ type: "SET_ACTIVE_MODEL_NAME", payload: name });
  };

  const stopGeneration = () => {
    if (latestStateRef.current.abortController) {
      latestStateRef.current.abortController.abort();
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {
      // Ignore logout errors
    }
    window.location.reload();
  };

  return (
    <ChatContext.Provider value={{
      state,
      dispatch,
      createNewConversation,
      sendMessage,
      stopGeneration,
      addArtifact: addArtifactFn,
      updateArtifact,
      setActiveArtifact,
      attachFile,
      removeFile,
      setActiveMode,
      setActiveModelName,
      isAuthenticated: !!userId,
      userId,
      username: username || "User",
      logout,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}