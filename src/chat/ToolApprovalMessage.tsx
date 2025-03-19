import { Box, Paper, Typography, Button } from "@mui/material";
import { FunctionComponent } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import remarkGfm from "remark-gfm";
import { vs as highlightStyle } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ORToolCall } from "../pages/HomePage/openRouterTypes";
import { useJupyterConnectivity } from "../jupyter/JupyterConnectivity";

type ToolApprovalMessageContainerProps = {
  children: React.ReactNode;
};

const ToolApprovalMessageContainer: FunctionComponent<
  ToolApprovalMessageContainerProps
> = ({ children }) => {
  return (
    <Box
      sx={(theme) => ({
        display: "flex",
        justifyContent: "flex-start",
        marginBottom: theme.spacing(1),
        padding: theme.spacing(0, 2),
      })}
    >
      {children}
    </Box>
  );
};

type ToolApprovalMessageBubbleProps = {
  children: React.ReactNode;
};

const ToolApprovalMessageBubble: FunctionComponent<
  ToolApprovalMessageBubbleProps
> = ({ children }) => {
  return (
    <Paper
      elevation={1}
      sx={(theme) => ({
        padding: theme.spacing(1, 2),
        maxWidth: "70%",
        backgroundColor: `${theme.palette.warning.light}20`, // Light warning color with 20% opacity
        color: theme.palette.text.primary,
        borderRadius: theme.spacing(2),
        wordBreak: "break-word",
      })}
    >
      {children}
    </Paper>
  );
};

type ToolApprovalMessageProps = {
  toolCallForPermission: ORToolCall;
  onSetToolCallApproval: (toolCall: ORToolCall, approved: boolean) => void;
};

const ToolApprovalMessage: FunctionComponent<ToolApprovalMessageProps> = ({
  toolCallForPermission,
  onSetToolCallApproval,
}) => {
  const { jupyterServerIsAvailable } = useJupyterConnectivity();
  return (
    <ToolApprovalMessageContainer>
      <ToolApprovalMessageBubble>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {toolCallForPermission.function.name === "execute_python_code"
              ? "Execute Python Code?"
              : "Tool Call Requires Approval"}
          </Typography>
          {toolCallForPermission.function.name === "execute_python_code" ? (
            <Box sx={{ maxHeight: 300, overflowY: "auto", mb: 2 }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ children }) {
                    return (
                      <SyntaxHighlighter
                        PreTag="div"
                        children={String(children).replace(/\n$/, "")}
                        language="python"
                        style={highlightStyle}
                      />
                    );
                  },
                }}
              >
                {`\`\`\`python\n${JSON.parse(toolCallForPermission.function.arguments).code}\n\`\`\``}
              </ReactMarkdown>
            </Box>
          ) : (
            <Typography
              variant="body2"
              component="div"
              sx={{ fontFamily: "monospace", mb: 2 }}
            >
              {`${toolCallForPermission.function.name}(${toolCallForPermission.function.arguments})`}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() =>
                onSetToolCallApproval(toolCallForPermission, false)
              }
            >
              Deny
            </Button>
            {jupyterServerIsAvailable ? (
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={() =>
                  onSetToolCallApproval(toolCallForPermission, true)
                }
              >
                Approve
              </Button>
            ) : (
              <>
                Jupyter server is not available. Use the JUPYTER tab to
                configure the server.
              </>
            )}
          </Box>
        </Box>
      </ToolApprovalMessageBubble>
    </ToolApprovalMessageContainer>
  );
};

export default ToolApprovalMessage;
