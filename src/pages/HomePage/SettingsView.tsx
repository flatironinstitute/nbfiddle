import { Box, FormControlLabel, Switch, TextField } from "@mui/material";
import { FunctionComponent, useEffect, useState } from "react";
import {
  setCodeCompletionsEnabled,
  getOpenRouterApiKey,
} from "./useCodeCompletions";

type SettingsViewProps = {
  width: number;
  height: number;
};

const SettingsView: FunctionComponent<SettingsViewProps> = ({
  width,
  height,
}) => {
  const [apiKey, setApiKey] = useState(() => getOpenRouterApiKey() || "");
  const [codeCompletionsEnabled, setLocalCodeCompletionsEnabled] = useState(
    () => {
      return localStorage.getItem("codeCompletionsEnabled") === "1";
    },
  );

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

      <FormControlLabel
        control={
          <Switch
            checked={codeCompletionsEnabled}
            onChange={(e) => setLocalCodeCompletionsEnabled(e.target.checked)}
            disabled={!apiKey}
          />
        }
        label="Enable code completions"
      />
    </Box>
  );
};

export default SettingsView;
