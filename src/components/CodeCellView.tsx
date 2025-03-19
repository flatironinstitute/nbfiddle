/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImmutableCodeCell, ImmutableOutput } from "@nteract/commutable";
import AnsiToHtml from "ansi-to-html";
import { FunctionComponent } from "react";
import PlotlyPlot from "./PlotlyPlot";
import CodeCellEditor from "./CodeCellEditor";

interface CodeCellViewProps {
  width: number;
  cell: ImmutableCodeCell;
  onChange: (cell: ImmutableCodeCell) => void;
  requiresFocus?: boolean;
  onFocus?: () => void;
}

const CodeCellView: FunctionComponent<CodeCellViewProps> = ({
  width,
  cell,
  onChange,
  requiresFocus,
  onFocus,
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
        <div
          className="CodeCellOutputs"
          style={{
            padding: "8px 0px",
            // backgroundColor: '#f5f5f5',
            borderRadius: 4,
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            fontSize: 13,
            width,
            overflowX: "auto",
          }}
        >
          {cell.outputs.map((output: ImmutableOutput, index: number) => {
            if (output.output_type === "stream") {
              const color = output.name === "stderr" ? "darkred" : "black";
              const ansiToHtml = new AnsiToHtml();
              const html = ansiToHtml.toHtml(output.text);
              return (
                <div
                  className="CodeCellOutput-stream"
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
                  className="CodeCellOutput-error"
                  key={index}
                  style={{ color: "darkred" }}
                  dangerouslySetInnerHTML={{ __html: html }}
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
                // this is the actual svg xml, not base64 encoded
                return (
                  <div key={index}>
                    <div dangerouslySetInnerHTML={{ __html: svgXml }} />
                  </div>
                );
              } else if ("application/vnd.plotly.v1+json" in output.data) {
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
                const html = output.data["text/html"] as string;
                // if the html is just an iframe itself, then we don't need to wrap it in another iframe
                if (html.startsWith("<iframe")) {
                  return (
                    <div
                      key={index}
                      style={{ width: "100%", overflowX: "auto" }}
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  );
                } else {
                  // Wrap HTML content with base styles and create a sandboxed iframe
                  // Doing this without an iframe doesn't work if the html contains scripts to be executed (e.g., Altair)
                  const wrappedHtml = `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <style>
                          body {
                            margin: 0;
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                            line-height: 1.5;
                          }
                          table {
                            border-collapse: collapse;
                            border-spacing: 0;
                            margin: 1em 0;
                            font-size: 13px;
                          }
                          thead {
                            border-bottom: 2px solid #ddd;
                            background-color: #f9f9f9;
                            text-align: right;
                          }
                          tbody tr:nth-child(even) {
                            background-color: #f5f5f5;
                          }
                          tbody tr:hover {
                            background-color: rgba(66, 165, 245, 0.1);
                          }
                          th, td {
                            padding: 0.5em 1em;
                            text-align: right;
                            border: 1px solid #ddd;
                            max-width: 400px;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                          }
                          th:first-child, td:first-child {
                            text-align: left;
                          }
                          th {
                            font-weight: bold;
                            vertical-align: bottom;
                          }
                          tr:last-child td {
                            border-bottom: 1px solid #ddd;
                          }
                        </style>
                      </head>
                      <body>${html}</body>
                    </html>
                  `;
                  return (
                    <div key={index} style={{ width: "100%" }}>
                      <iframe
                        srcDoc={wrappedHtml}
                        style={{
                          width: "100%",
                          border: "none",
                          overflow: "hidden",
                        }}
                        onLoad={(e) => {
                          // Adjust iframe height to match content
                          const iframe = e.target as HTMLIFrameElement;
                          const height =
                            iframe.contentWindow?.document.documentElement
                              .scrollHeight;
                          if (height) {
                            iframe.style.height = `${height}px`;
                          }
                        }}
                        sandbox="allow-scripts allow-same-origin allow-popups allow-downloads"
                      />
                    </div>
                  );
                }
              } else {
                // console.log("Using plain text output", output);
                return <div key={index}>{plainText}</div>;
              }
            } else {
              console.log("Unknown output type", (output as any).output_type);
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
};

export default CodeCellView;
