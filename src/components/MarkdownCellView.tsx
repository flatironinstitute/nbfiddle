import { ImmutableMarkdownCell } from "@nteract/commutable";
import { FunctionComponent } from "react";
import ReactMarkdown from "react-markdown";
import MarkdownCellEditor from "./MarkdownCellEditor";

interface MarkdownCellViewProps {
  cell: ImmutableMarkdownCell;
  onChange: (cell: ImmutableMarkdownCell) => void;
  onShiftEnter: () => void;
  onCtrlEnter: () => void;
  requiresFocus?: boolean;
  isEditing: boolean;
  onStartEditing: () => void;
}

const MarkdownCellView: FunctionComponent<MarkdownCellViewProps> = ({
  cell,
  onChange,
  onShiftEnter,
  onCtrlEnter,
  requiresFocus,
  isEditing,
  onStartEditing,
}) => {
  const handleShiftEnter = () => {
    onShiftEnter();
  };

  const handleCtrlEnter = () => {
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
      onDoubleClick={() => onStartEditing()}
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
