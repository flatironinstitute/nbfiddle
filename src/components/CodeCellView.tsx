/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImmutableCodeCell, ImmutableOutput } from "@nteract/commutable";
import AnsiToHtml from "ansi-to-html";
import { FunctionComponent } from "react";
import PlotlyPlot from "./PlotlyPlot";
import CodeCellEditor from "./CodeCellEditor";
import DOMPurify from "dompurify";
import HtmlInIframeIfTrusted from "./HtmlInIframeIfTrusted";
import IfHasBeenVisible from "./IfHasBeenVisible";

interface CodeCellViewProps {
  width: number;
  cell: ImmutableCodeCell;
  onChange: (cell: ImmutableCodeCell) => void;
  requiresFocus?: boolean;
  onFocus?: () => void;
  notebookIsTrusted: boolean;
  setNotebookIsTrusted: (trusted: boolean) => void;
  cellCollapsed: boolean;
  setCellCollapsed: (collapsed: boolean) => void;
}

const CodeCellView: FunctionComponent<CodeCellViewProps> = ({
  width,
  cell,
  onChange,
  requiresFocus,
  onFocus,
  notebookIsTrusted,
  setNotebookIsTrusted,
  cellCollapsed,
  setCellCollapsed,
}) => {
  return (
    <div
      className="CodeCellView"
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
        requiresFocus={requiresFocus}
        onFocus={onFocus}
      />
      {cell.outputs.size > 0 && (
        <IfHasBeenVisible>
          <div style={{ display: "flex", position: "relative" }}>
            <div
              onClick={() => setCellCollapsed(!cellCollapsed)}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#999")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#ddd")
              }
              style={{
                width: cellCollapsed ? 10 : 5,
                backgroundColor: "#ddd",
                cursor: "pointer",
                transition: "background-color 0.2s",
                marginRight: cellCollapsed ? 10 : 5,
              }}
              title={cellCollapsed ? "Show output" : "Hide output"}
            />
            {cellCollapsed ? (
              <div
                style={{
                  padding: 8,
                  backgroundColor: "#f5f5f5",
                  borderRadius: 4,
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  fontSize: 13,
                  width: width - (cellCollapsed ? 20 : 10),
                  overflowX: "auto",
                }}
              >
                <div>...</div>
              </div>
            ) : (
              <div
                className="CodeCellOutputs"
                style={{
                  padding: "8px 0px",
                  borderRadius: 4,
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  fontSize: 13,
                  width: width - 16,
                  overflowX: "auto",
                }}
              >
                {cell.outputs.map((output: ImmutableOutput, index: number) => {
                  if (output.output_type === "stream") {
                    const color =
                      output.name === "stderr" ? "darkred" : "black";
                    const ansiToHtml = new AnsiToHtml();
                    const unsafeHtml = ansiToHtml.toHtml(output.text);
                    const thisHtmlIsSafe = DOMPurify.sanitize(unsafeHtml);
                    return (
                      <div
                        className="CodeCellOutput-stream"
                        key={index}
                        style={{ color }}
                        dangerouslySetInnerHTML={{ __html: thisHtmlIsSafe }}
                      />
                    );
                  } else if (output.output_type === "error") {
                    const ansiToHtml = new AnsiToHtml();
                    const unsafeHtml = ansiToHtml.toHtml(
                      output.traceback.join("\n"),
                    );
                    const thisHtmlIsSafe = DOMPurify.sanitize(unsafeHtml);
                    return (
                      <div
                        className="CodeCellOutput-error"
                        key={index}
                        style={{ color: "darkred" }}
                        dangerouslySetInnerHTML={{ __html: thisHtmlIsSafe }}
                      />
                    );
                  } else if (
                    output.output_type === "display_data" ||
                    output.output_type === "execute_result"
                  ) {
                    const plainText = output.data["text/plain"] || "";
                    if ("image/png" in output.data) {
                      const pngBase64 = output.data["image/png"] || "";
                      return (
                        <div key={index}>
                          <img
                            src={`data:image/png;base64,${pngBase64}`}
                            alt={plainText}
                          />
                        </div>
                      );
                    } else if ("image/svg+xml" in output.data) {
                      const svgXml = output.data["image/svg+xml"] || "";
                      const thisHtmlIsSafe = DOMPurify.sanitize(svgXml);
                      return (
                        <div key={index}>
                          <div
                            dangerouslySetInnerHTML={{ __html: thisHtmlIsSafe }}
                          />
                        </div>
                      );
                    } else if (
                      "application/vnd.plotly.v1+json" in output.data
                    ) {
                      const plotlyJson = output.data[
                        "application/vnd.plotly.v1+json"
                      ] as {
                        data: Plotly.Data[];
                        layout?: Partial<Plotly.Layout>;
                        config?: Partial<Plotly.Config>;
                      };
                      return (
                        <PlotlyPlot
                          key={index}
                          data={plotlyJson.data}
                          layout={plotlyJson.layout}
                          config={plotlyJson.config}
                        />
                      );
                    } else if ("text/html" in output.data) {
                      const htmlUnsafeUnlessInsideATrustedIframe = output.data[
                        "text/html"
                      ] as string;
                      return (
                        <HtmlInIframeIfTrusted
                          key={index}
                          htmlUnsafeUnlessInsideATrustedIframe={
                            htmlUnsafeUnlessInsideATrustedIframe
                          }
                          notebookIsTrusted={notebookIsTrusted}
                          setNotebookIsTrusted={setNotebookIsTrusted}
                        />
                      );
                    } else {
                      // console.log("Using plain text output", output);
                      return <div key={index}>{plainText}</div>;
                    }
                  } else {
                    console.log(
                      "Unknown output type",
                      (output as any).output_type,
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        </IfHasBeenVisible>
      )}
    </div>
  );
};

export default CodeCellView;
