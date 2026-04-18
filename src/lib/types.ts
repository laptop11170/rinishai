export interface ContentBlock {
  type: "text" | "image";
  text?: string;
  source?: {
    type: "base64";
    media_type: string;
    data: string;
  };
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  contentBlocks?: ContentBlock[];
  thinking?: string;
  timestamp: number;
  artifactId?: string;
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: "pending" | "running" | "success" | "error";
  error?: string;
}

export type ArtifactType = "document" | "code" | "table" | "html" | "json";

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: string;
  metadata: Record<string, unknown>;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string;
}

export interface SlashCommand {
  name: string;
  description: string;
  icon: string;
  action: (input: string) => string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  artifacts: Record<string, Artifact>;
  toolCalls: Record<string, ToolCall>;
  createdAt: number;
  updatedAt: number;
}

export interface LLMConfig {
  provider: "anthropic" | "openai" | "opusmax";
  apiKey: string;
  baseUrl: string;
  model: string;
  extendedThinking?: boolean;
}

export const DEFAULT_ANTHROPIC_CONFIG: LLMConfig = {
  provider: "anthropic",
  apiKey: "",
  baseUrl: "https://api.anthropic.com",
  model: "claude-sonnet-4-20250514",
  extendedThinking: false,
};

export const DEFAULT_OPUSMAX_CONFIG: LLMConfig = {
  provider: "opusmax",
  apiKey: "",
  baseUrl: "https://api.opusmax.pro/v1",
  model: "claude-opus-4-6",
  extendedThinking: false,
};

export const OPUSMAX_MODELS = [
  { id: "claude-opus-4-7", name: "Claude Opus 4.7", description: "Latest & most capable (Beta)", beta: true },
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", description: "Most capable model" },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", description: "Balanced performance" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", description: "Fast, lightweight" },
];

export interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  settings: LLMConfig;
  isLoading: boolean;
  isThinking: boolean;
  isSettingsOpen: boolean;
  isSidebarOpen: boolean;
  activeArtifactId: string | null;
  attachedFiles: AttachedFile[];
  searchQuery: string;
  abortController: AbortController | null;
  activeMode: "none" | "deepResearch" | "webSearch" | "code";
  activeModelName: string | null;
}

export type ChatAction =
  | { type: "SET_CONVERSATIONS"; payload: Conversation[] }
  | { type: "ADD_CONVERSATION"; payload: Conversation }
  | { type: "DELETE_CONVERSATION"; payload: string }
  | { type: "UPDATE_CONVERSATION"; payload: Conversation }
  | { type: "SELECT_CONVERSATION"; payload: string }
  | { type: "ADD_MESSAGE"; payload: { conversationId: string; message: Message } }
  | { type: "UPDATE_MESSAGE"; payload: { conversationId: string; messageId: string; updates: Partial<Message> } }
  | { type: "SET_SETTINGS"; payload: LLMConfig }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_THINKING"; payload: boolean }
  | { type: "TOGGLE_SETTINGS" }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "SET_ACTIVE_ARTIFACT"; payload: string | null }
  | { type: "ADD_ARTIFACT"; payload: { conversationId: string; artifact: Artifact } }
  | { type: "UPDATE_ARTIFACT"; payload: { conversationId: string; artifactId: string; updates: Partial<Artifact> } }
  | { type: "ADD_ATTACHED_FILE"; payload: AttachedFile }
  | { type: "REMOVE_ATTACHED_FILE"; payload: string }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "ADD_TOOL_CALL"; payload: { conversationId: string; toolCall: ToolCall } }
  | { type: "UPDATE_TOOL_CALL"; payload: { conversationId: string; toolCallId: string; updates: Partial<ToolCall> } }
  | { type: "SET_ABORT_CONTROLLER"; payload: AbortController | null }
  | { type: "SET_ACTIVE_MODE"; payload: "none" | "deepResearch" | "webSearch" | "code" }
  | { type: "SET_ACTIVE_MODEL_NAME"; payload: string | null };

export interface StreamChunk {
  type: "content" | "thinking" | "done";
  content?: string;
}