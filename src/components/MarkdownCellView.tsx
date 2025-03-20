import { ImmutableMarkdownCell } from "@nteract/commutable";
import { FunctionComponent } from "react";
import ReactMarkdown from "react-markdown";
import MarkdownCellEditor from "./MarkdownCellEditor";

interface MarkdownCellViewProps {
  width: number;
  cell: ImmutableMarkdownCell;
  onChange: (cell: ImmutableMarkdownCell) => void;
  requiresFocus?: boolean;
  isEditing: boolean;
  onStartEditing: () => void;
}

const MarkdownCellView: FunctionComponent<MarkdownCellViewProps> = ({
  width,
  cell,
  onChange,
  requiresFocus,
  isEditing,
  onStartEditing,
}) => {
  if (isEditing) {
    return (
      <div style={{ marginBottom: 16 }}>
        <MarkdownCellEditor
          width={width}
          cell={cell}
          onChange={onChange}
          requiresFocus={requiresFocus}
        />
      </div>
    );
  }

  const source = cell.get("source");

  return (
    <div
      onDoubleClick={() => onStartEditing()}
      onClick={() => {
        // if the content is empty, start editing on a single click
        if (source.trim() === "") {
          onStartEditing();
        }
      }}
      style={{
        width,
        marginBottom: 16,
        minHeight: 24,
        cursor: "pointer",
      }}
    >
      <div className="markdown-content" style={{ padding: "8px 4px" }}>
        <ReactMarkdown>{source}</ReactMarkdown>
      </div>
    </div>
  );
};

export default MarkdownCellView;
