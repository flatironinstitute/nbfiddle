/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImmutableNotebook, toJS } from "@nteract/commutable";
import { Cell, NotebookV4 } from "@nteract/commutable/lib/v4";

const serializeNotebook = (notebook: ImmutableNotebook): NotebookV4 => {
  const x = toJS(notebook);
  // We strip out all the text/html from ploty plots
  // because they take up a lot of space and are not
  // needed for rendering if we have imported the plotly
  // library.
  const stripPlotly = (cell: Cell) => {
    if (cell.cell_type === "code") {
      return {
        ...cell,
        outputs: cell.outputs.map((output: any) => {
          if (output.output_type === "display_data") {
            if ("application/vnd.plotly.v1+json" in output.data) {
              if ("text/html" in output.data) {
                // we need to do it this way because commutable does not allow deleting keys
                const newData = { ...output.data };
                delete newData["text/html"];
                return {
                  ...output,
                  data: newData,
                };
              }
            } else if ("text/html" in output.data) {
              const x = output.data["text/html"];
              if (x.includes("window.PlotlyConfig")) {
                const newData = { ...output.data };
                delete newData["text/html"];
                return {
                  ...output,
                  data: newData,
                };
              }
            }
          }
          return output;
        }),
      };
    } else return cell;
  };
  return {
    ...x,
    cells: x.cells.map(stripPlotly),
  };
};

export default serializeNotebook;
