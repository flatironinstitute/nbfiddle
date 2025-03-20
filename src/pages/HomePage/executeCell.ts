/* eslint-disable @typescript-eslint/no-explicit-any */
import { createImmutableOutput, ImmutableOutput } from "@nteract/commutable";
import { List } from "immutable";
import PythonSessionClient from "../../jupyter/PythonSessionClient";

const executeCell = async (
  code: string,
  sessionClient: PythonSessionClient,
  onOutputsUpdated: (outputs: List<ImmutableOutput>) => void,
  canceledRef: { current: boolean },
): Promise<List<ImmutableOutput>> => {
  const outputs: ImmutableOutput[] = [];
  const removeOnOutputItemCallback = sessionClient.onOutputItem((item) => {
    if (item.type === "iopub") {
      const iopub = item.iopubMessage;
      if (iopub.header.msg_type === "stream") {
        if ("text" in iopub.content) {
          outputs.push(
            createImmutableOutput({
              output_type: "stream",
              name: iopub.content.name,
              text: iopub.content.text,
            }),
          );
          onOutputsUpdated(List(outputs));
        } else {
          console.warn("Not handling stream message without text", iopub);
        }
      } else if (iopub.header.msg_type === "error") {
        outputs.push(
          createImmutableOutput({
            output_type: "error",
            ...iopub.content,
          } as any),
        );
        onOutputsUpdated(List(outputs));
      } else if (iopub.header.msg_type === "display_data") {
        outputs.push(
          createImmutableOutput({
            output_type: "display_data",
            ...stripPlotlyHtml(iopub.content),
          } as any),
        );
        onOutputsUpdated(List(outputs));
      } else if (iopub.header.msg_type === "execute_result") {
        outputs.push(
          createImmutableOutput({
            output_type: "execute_result",
            ...stripPlotlyHtml(iopub.content),
          } as any),
        );
        onOutputsUpdated(List(outputs));
      } else if ("execution_state" in iopub.content) {
        // ignore
      } else if (iopub.header.msg_type === "execute_input") {
        // ignore
      } else {
        console.warn("Unknown iopub message", iopub);
      }
    }
  });
  try {
    await new Promise<void>((resolve, reject) => {
      let finished = false;
      let executionCanceled = false;
      sessionClient
        .runCode(code)
        .then(() => {
          finished = true;
          resolve();
        })
        .catch((error) => {
          finished = true;
          reject(error);
        });
      (async () => {
        while (!finished && !executionCanceled) {
          if (canceledRef.current) {
            sessionClient.cancelExecution();
            executionCanceled = true;
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      })();
    });

    return List(outputs);
  } finally {
    removeOnOutputItemCallback();
  }
};

const stripPlotlyHtml = (content: any) => {
  // plotly adds extra html to the output, which we don't want to display or include in the notebook
  // instead we look for application/vnd.plotly.v1+json and remove the text/html
  // (note this is also done in the serializeNotebook, and it's needed there as well)
  if (typeof content !== "object") return content;
  if (content.data && content.data["text/html"]) {
    const x = content.data["text/html"];
    if (x.includes("window.PlotlyConfig")) {
      const newData = { ...content.data };
      delete newData["text/html"];
      return { ...content, data: newData };
    }
  }
  return content;
};

export default executeCell;
