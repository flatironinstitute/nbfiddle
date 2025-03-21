import { Box, FormControlLabel, Switch, TextField } from "@mui/material";
import { FunctionComponent, useEffect, useState } from "react";
import {
  setCodeCompletionsEnabled,
  getOpenRouterApiKey,
  getTotalCost,
} from "./useCodeCompletions";

type SettingsViewProps = {
  width: number;
  height: number;
  chatEnabled: boolean;
  setChatEnabled: (enabled: boolean) => void;
  fullWidthEnabled: boolean;
  setFullWidthEnabled: (enabled: boolean) => void;
};

const SettingsView: FunctionComponent<SettingsViewProps> = ({
  width,
  height,
  chatEnabled,
  setChatEnabled,
  fullWidthEnabled,
  setFullWidthEnabled,
}) => {
  const [apiKey, setApiKey] = useState(() => getOpenRouterApiKey() || "");
  const [codeCompletionsEnabled, setLocalCodeCompletionsEnabled] = useState(
    () => localStorage.getItem("codeCompletionsEnabled") === "1",
  );
  const [totalCost, setTotalCost] = useState(getTotalCost());
  const [chatCost, setChatCost] = useState(() =>
    Number(localStorage.getItem("chatCost") || "0"),
  );

  useEffect(() => {
    const intervals = [
      setInterval(() => {
        setTotalCost(getTotalCost());
      }, 1000),
      setInterval(() => {
        setChatCost(Number(localStorage.getItem("chatCost") || "0"));
      }, 1000),
    ];
    return () => intervals.forEach(clearInterval);
  }, []);

  // Effect to handle API key changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("openRouterApiKey", apiKey);
    } else {
      localStorage.removeItem("openRouterApiKey");
      // Disable code completions if API key is removed
      setLocalCodeCompletionsEnabled(false);
    }
  }, [apiKey]);

  // Effect to handle code completions toggle
  useEffect(() => {
    localStorage.setItem(
      "codeCompletionsEnabled",
      codeCompletionsEnabled ? "1" : "0",
    );
    setCodeCompletionsEnabled(codeCompletionsEnabled);
  }, [codeCompletionsEnabled]);

  return (
    <Box sx={{ padding: 3, width: width - 32, height: height - 16 }}>
      <h2>Settings</h2>

      <Box sx={{ mb: 3 }}>
        <TextField
          label="OpenRouter API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          fullWidth
          sx={{ mb: 1 }}
          type="password"
          helperText="Required for code completions. Get your key at https://openrouter.ai/"
        />
      </Box>

      <Box>
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={codeCompletionsEnabled}
                onChange={(e) =>
                  setLocalCodeCompletionsEnabled(e.target.checked)
                }
                disabled={!apiKey}
              />
            }
            label="Enable code completions"
          />
          {codeCompletionsEnabled && (
            <Box sx={{ mt: 1, ml: 4, color: "text.secondary" }}>
              Code completions cost this session: ${totalCost.toFixed(4)}
            </Box>
          )}
        </Box>

        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={chatEnabled}
                onChange={(e) => {
                  localStorage.setItem(
                    "chatEnabled",
                    e.target.checked ? "1" : "0",
                  );
                  setChatEnabled(e.target.checked);
                }}
                disabled={!apiKey}
              />
            }
            label="Enable chat"
          />
          <Box sx={{ mt: 1, ml: 4, color: "text.secondary", maxWidth: 600 }}>
            Enables an AI assistant that can help with your notebook work. The
            assistant has access to your notebook content and knows which cell
            is currently active, allowing for contextual assistance with your
            data analysis tasks.
          </Box>
          {chatEnabled && (
            <Box sx={{ mt: 1, ml: 4, color: "text.secondary" }}>
              AI assistant cost this session: ${chatCost.toFixed(4)}
            </Box>
          )}
        </Box>

        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={fullWidthEnabled}
                onChange={(e) => {
                  localStorage.setItem(
                    "fullWidthEnabled",
                    e.target.checked ? "1" : "0",
                  );
                  setFullWidthEnabled(e.target.checked);
                }}
              />
            }
            label="Enable full width notebook"
          />
          <Box sx={{ mt: 1, ml: 4, color: "text.secondary", maxWidth: 600 }}>
            When enabled, the notebook will use the full available width of the
            screen instead of being constrained to a fixed width.
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default SettingsView;
