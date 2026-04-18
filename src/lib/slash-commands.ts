import { SlashCommand } from "./types";

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: "code",
    description: "Write code",
    icon: "</>",
    action: (input: string) => `Write code for: ${input}`,
  },
  {
    name: "explain",
    description: "Explain something",
    icon: "💡",
    action: (input: string) => `Explain ${input} in detail`,
  },
  {
    name: "summarize",
    description: "Summarize text",
    icon: "📝",
    action: (input: string) => `Summarize the following:\n\n${input}`,
  },
  {
    name: "debug",
    description: "Debug code",
    icon: "🔧",
    action: (input: string) => `Debug this code and explain the issue:\n\n${input}`,
  },
  {
    name: "refactor",
    description: "Refactor code",
    icon: "♻️",
    action: (input: string) => `Refactor this code for better readability and performance:\n\n${input}`,
  },
  {
    name: "test",
    description: "Write tests",
    icon: "🧪",
    action: (input: string) => `Write unit tests for:\n\n${input}`,
  },
  {
    name: "translate",
    description: "Translate text",
    icon: "🌐",
    action: (input: string) => `Translate the following to English:\n\n${input}`,
  },
  {
    name: "improve",
    description: "Improve writing",
    icon: "✨",
    action: (input: string) => `Improve the following text:\n\n${input}`,
  },
];
