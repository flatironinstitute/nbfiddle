import { Box } from "@mui/material";
import { FunctionComponent, useEffect, useRef } from "react";
import Message from "./Message";
import ToolApprovalMessage from "./ToolApprovalMessage";
import { ORMessage, ORToolCall } from "../pages/HomePage/openRouterTypes";
import { globalOutputItems } from "./tools/executePythonCode";

type MessageListProps = {
  messages: ORMessage[];
  toolCallForPermission?: ORToolCall;
  onSetToolCallApproval?: (toolCall: ORToolCall, approved: boolean) => void;
  height: number;
  onDeleteMessage?: (message: ORMessage) => void;
};

const MessageList: FunctionComponent<MessageListProps> = ({
  messages,
  toolCallForPermission,
  onSetToolCallApproval,
  height,
  onDeleteMessage,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, toolCallForPermission]);

  return (
    <Box
      sx={{
        height: height - 100, // Leave space for input
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        py: 2,
      }}
    >
      {messages
        .filter((m) => {
          // this is a hack to hide system messages that are just describing what the user is seeing
          if (m.role === "system" && (m.content as string).startsWith(":")) {
            return false;
          }
          return true;
        })
        .map((msg, index) => (
          <Box key={index}>
            <Message
              message={msg}
              messages={messages}
              isUser={msg.role === "user"}
              onDeleteMessage={
                msg.role === "user" && onDeleteMessage
                  ? () => onDeleteMessage(msg)
                  : undefined
              }
            />
            {msg.role === "tool" && (
              <OutputImagesFromToolOutputContent content={msg.content} />
            )}
          </Box>
        ))}
      {toolCallForPermission && onSetToolCallApproval && (
        <ToolApprovalMessage
          toolCallForPermission={toolCallForPermission}
          onSetToolCallApproval={onSetToolCallApproval}
        />
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};

const OutputImagesFromToolOutputContent: FunctionComponent<{
  content: string;
}> = ({ content }) => {
  const elements: JSX.Element[] = [];
  // find things of the form <img src="key.png" />
  const regex = /<img src="([^"]+)" \/>/g;
  const matches = content.matchAll(regex);
  for (const match of matches) {
    elements.push(<img key={match[1]} src={keyToPngUrl(match[1])} />);
  }
  if (elements.length === 0) {
    return null;
  }
  // important to wrap in a div so that the dimensions of the <img> elements are equal to the dimensions of the images
  return <div>{elements}</div>;
};

const keyToPngUrl = (key: string) => {
  const a = globalOutputItems[key];
  if (!a) {
    return "";
  }
  return `data:image/png;base64,${a.content}`;
};

export default MessageList;
