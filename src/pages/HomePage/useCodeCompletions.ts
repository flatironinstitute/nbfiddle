import { useMonaco } from "@monaco-editor/react";
import { useEffect } from "react";
import {
  ORMessage,
  ORNonStreamingChoice,
  ORRequest,
  ORResponse,
} from "./openRouterTypes";

let lastQueryCompletionTime = 0;
let inProgress = false;
let completionNum = 1;
const doCompletion = async (o: {
  previousLines: string[];
  currentLineBeforeCursor: string;
}): Promise<string | undefined> => {
  const thisCompletionNum = completionNum + 1;
  completionNum = thisCompletionNum;
  // always wait at least a little bit, to give a chance for more calls coming in
  await new Promise((resolve) => setTimeout(resolve, 250));
  const elapsedSinceLastQuery = Date.now() - lastQueryCompletionTime;
  if (elapsedSinceLastQuery < 2000) {
    await new Promise((resolve) =>
      setTimeout(resolve, 2000 - elapsedSinceLastQuery),
    );
  }
  while (inProgress) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (thisCompletionNum !== completionNum) {
    // something more recent came in
    return;
  }
  lastQueryCompletionTime = Date.now();
  inProgress = true;
  try {
    // console.log("doCompletion", o);
    const c = await doQueryCompletion(o);
    // console.log("Completion result", c);
    return c;
  } finally {
    inProgress = false;
  }
};

export const AVAILABLE_MODELS = [
  {
    model: "google/gemini-2.0-flash-001",
    label: "gemini-2.0-flash-001",
    cost: {
      prompt: 0.1,
      completion: 0.4,
    },
  },
  {
    model: "anthropic/claude-3.5-sonnet",
    label: "claude-3.5-sonnet",
    cost: {
      prompt: 3,
      completion: 15,
    },
  },
  {
    model: "openai/gpt-4o-mini",
    label: "gpt-4o-mini",
    cost: {
      prompt: 0.15,
      completion: 0.6,
    },
  },
];

let specialContextForAI = "";
export const setSpecialContextForAI = (context: string) => {
  specialContextForAI = context;
};

const reduce = (s: string) => {
  // reduce to include only the first and last parts of the string
  if (s.length < 100000) {
    return s;
  }
  const first = s.substring(0, 50000);
  const last = s.substring(s.length - 50000);
  return `${first} \n... ... ...\n ${last}`;
};

// adapted from https://spencerporter2.medium.com/building-copilot-on-the-web-f090ceb9b20b
const language = "python";
const getSystemMessageText = () => `
## Task: Code Completion

### Language: ${language}

### Instructions:
- You are a world class coding assistant.
- You are going to provide a code completion
- You will be given the previous lines of code and the current line before the cursor.
- You need to provide the completion for the current line.
- If the current line before the cursor is empty, you should predict what the user would like based on the previous lines.
- This is not a conversation, so please do not ask questions or prompt for additional information.
- Limit to yourself to at most 3 or 4 lines of code.

Your output is going to be structured as JSON as follows:

{
  "completionOfCurrentLine": "..."
}

### Notes
- NEVER INCLUDE ANY MARKDOWN IN THE RESPONSE - THIS MEANS CODEBLOCKS AS WELL.
- Never include any annotations such as "# Suggestion:" or "# Suggestions:".
- Newlines should be included after any of the following characters: "{", "[", "(", ")", "]", "}", and ",".
- Never suggest a newline after a space or newline.
- Ensure that newline suggestions follow the same indentation as the current line.
- Only ever return the code snippet, do not return any markdown unless it is part of the code snippet.
- Do not return anything that is not valid code.
- If you do not have a suggestion, return an empty string.

Here's some special context about the previous cells in the notebook that the user is editing (if provided):
${reduce(specialContextForAI)}
`;

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export const getOpenRouterApiKey = (): string | null => {
  return localStorage.getItem("openRouterApiKey");
};

let totalCost = 0;
const doQueryCompletion = async (o: {
  previousLines: string[];
  currentLineBeforeCursor: string;
}): Promise<string | undefined> => {
  // const model = "openai/gpt-4o-mini";

  // to expensive
  // const model = "anthropic/claude-3.5-sonnet";

  // this is probably the best bet
  const model = "google/gemini-2.0-flash-001";

  const initialSystemMessage: ORMessage = {
    role: "system",
    content: getSystemMessageText(),
  };
  const obj = {
    previousLines: o.previousLines.join("\n"),
    currentLineBeforeCursor: o.currentLineBeforeCursor,
  };
  const userMessageText = JSON.stringify(obj);
  const userMessage: ORMessage = {
    role: "user",
    content: userMessageText,
  };
  const request: ORRequest = {
    model: model,
    messages: [initialSystemMessage, userMessage],
    stream: false,
  };
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOpenRouterApiKey()}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    console.error(`OpenRouter API error: ${response.statusText}`);
    return undefined;
  }

  const result = (await response.json()) as ORResponse;
  const choice = result.choices[0] as ORNonStreamingChoice;

  if (!choice) {
    return undefined;
  }

  const prompt_tokens = result.usage?.prompt_tokens || 0;
  const completion_tokens = result.usage?.completion_tokens || 0;

  const a = AVAILABLE_MODELS.find((m) => m.model === model);
  const cost =
    ((a?.cost.prompt || 0) * prompt_tokens) / 1_000_000 +
    ((a?.cost.completion || 0) * completion_tokens) / 1_000_000;
  totalCost += cost;
  console.info(`Total cost: ${totalCost}`);

  const content = choice.message.content;
  if (!content) {
    return undefined;
  }
  try {
    const completionObj = flexibleJsonParse(content);
    return completionObj.completionOfCurrentLine;
  } catch {
    console.error("Error parsing completion:", content);
    return undefined;
  }
};

const flexibleJsonParse = (s: string) => {
  // this handles for example when the AI returns ```json\n{...}\n``` instead of just {...}
  const ind1 = s.indexOf("{");
  const ind2 = s.lastIndexOf("}");
  if (ind1 === -1 || ind2 === -1) {
    throw new Error("Invalid JSON");
  }
  return JSON.parse(s.substring(ind1, ind2 + 1));
};

let codeCompletionsEnabled = false;
export const setCodeCompletionsEnabled = (enabled: boolean) => {
  // Only allow enabling if we have an API key
  if (enabled && !getOpenRouterApiKey()) {
    console.warn(
      "Cannot enable code completions without an OpenRouter API key",
    );
    return;
  }
  codeCompletionsEnabled = enabled;
};

const useCodeCompletions = () => {
  const monaco = useMonaco();

  useEffect(() => {
    if (!monaco) {
      return;
    }
    const provider = monaco.languages.registerInlineCompletionsProvider(
      "python",
      {
        provideInlineCompletions: async (
          model,
          position /* context, token */,
        ) => {
          if (!codeCompletionsEnabled)
            return {
              items: [],
              commands: [],
            };
          const code = model.getValue();
          const lines = code.split("\n");
          const currentLine = lines[position.lineNumber - 1];
          const isAtEndOfLine = position.column === currentLine.length + 1;
          if (!isAtEndOfLine) {
            return {
              items: [],
              commands: [],
            };
          }
          const previousLines = lines.slice(0, position.lineNumber);
          const currentLineBeforeCursor = currentLine.slice(
            0,
            position.column - 1,
          );
          const completionText = await doCompletion({
            previousLines,
            currentLineBeforeCursor,
          });
          return {
            items: completionText
              ? [
                  {
                    insertText: completionText,
                    range: {
                      startLineNumber: position.lineNumber,
                      startColumn: position.column,
                      endLineNumber: position.lineNumber,
                      endColumn: position.column,
                    },
                  },
                ]
              : [],
            commands: [],
          };
        },
        freeInlineCompletions: (/* completions */) => {},
      },
    );

    return () => {
      provider.dispose();
    };
  }, [monaco]);
};

export default useCodeCompletions;
