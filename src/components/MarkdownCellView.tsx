import { ImmutableMarkdownCell } from "@nteract/commutable";
import { FunctionComponent, useState } from "react";
import ReactMarkdown from "react-markdown";
import MarkdownCellEditor from "./MarkdownCellEditor";

interface MarkdownCellViewProps {
  cell: ImmutableMarkdownCell;
  onChange: (cell: ImmutableMarkdownCell) => void;
  onShiftEnter: () => void;
  onCtrlEnter: () => void;
  requiresFocus?: boolean;
}

const MarkdownCellView: FunctionComponent<MarkdownCellViewProps> = ({
  cell,
  onChange,
  onShiftEnter,
  onCtrlEnter,
  requiresFocus,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleShiftEnter = () => {
    setIsEditing(false);
    onShiftEnter();
  };

  const handleCtrlEnter = () => {
    setIsEditing(false);
    onCtrlEnter();
  };

  if (isEditing) {
    return (
      <div style={{ marginBottom: 16 }}>
        <MarkdownCellEditor
          cell={cell}
          onChange={onChange}
          onShiftEnter={handleShiftEnter}
          onCtrlEnter={handleCtrlEnter}
          requiresFocus={requiresFocus}
        />
      </div>
    );
  }

  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      style={{
        marginBottom: 16,
        minHeight: 24,
        cursor: "pointer",
      }}
    >
      <div className="markdown-content" style={{ padding: "8px 4px" }}>
        <ReactMarkdown>{cell.get("source")}</ReactMarkdown>
      </div>
    </div>
  );
};

export default MarkdownCellView;
