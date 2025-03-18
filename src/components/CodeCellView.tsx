import { ImmutableCodeCell, ImmutableOutput } from "@nteract/commutable";
import AnsiToHtml from "ansi-to-html";
import { FunctionComponent } from "react";
import CodeCellEditor from "./CodeCellEditor";

interface CodeCellViewProps {
  width: number;
  cell: ImmutableCodeCell;
  onChange: (cell: ImmutableCodeCell) => void;
  onShiftEnter: () => void;
  onCtrlEnter: () => void;
  requiresFocus?: boolean;
  onFocus?: () => void;
}

const CodeCellView: FunctionComponent<CodeCellViewProps> = ({
  width,
  cell,
  onChange,
  onShiftEnter,
  onCtrlEnter,
  requiresFocus,
  onFocus,
}) => {
  return (
    <div
      style={{
        marginBottom: 16,
        width,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <CodeCellEditor
        cell={cell}
        onChange={onChange}
        onShiftEnter={onShiftEnter}
        onCtrlEnter={onCtrlEnter}
        requiresFocus={requiresFocus}
        onFocus={onFocus}
      />
      {cell.outputs.size > 0 && (
        <div
          style={{
            padding: "8px 0px",
            // backgroundColor: '#f5f5f5',
            borderRadius: 4,
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            fontSize: 13,
          }}
        >
          {cell.outputs.map((output: ImmutableOutput, index: number) => {
            if (output.output_type === "stream") {
              const color = output.name === "stderr" ? "darkred" : "black";
              const ansiToHtml = new AnsiToHtml();
              const html = ansiToHtml.toHtml(output.text);
              return (
                <div
                  key={index}
                  style={{ color }}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            } else if (output.output_type === "error") {
              const ansiToHtml = new AnsiToHtml();
              const html = ansiToHtml.toHtml(output.traceback.join("\n"));
              return (
                <div
                  key={index}
                  style={{ color: "darkred" }}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            } else if (output.output_type === "display_data") {
              const plainText = output.data["text/plain"] || "";
              const pngBase64 = output.data["image/png"] || "";
              if (pngBase64) {
                return (
                  <div key={index}>
                    <img
                      src={`data:image/png;base64,${pngBase64}`}
                      alt={plainText}
                    />
                  </div>
                );
              } else {
                return <div key={index}>{plainText}</div>;
              }
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
};

export default CodeCellView;
