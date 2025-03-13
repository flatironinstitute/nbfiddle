/* eslint-disable @typescript-eslint/no-explicit-any */
import { createImmutableOutput, ImmutableOutput } from "@nteract/commutable";
import { List } from "immutable";
import PythonSessionClient from "src/jupyter/PythonSessionClient";

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
      if ("name" in iopub.content && iopub.content.name === "stdout") {
        outputs.push(
          createImmutableOutput({
            output_type: "stream",
            name: "stdout",
            text: iopub.content.text,
          }),
        );
      } else if ("name" in iopub.content && iopub.content.name === "stderr") {
        outputs.push(
          createImmutableOutput({
            output_type: "stream",
            name: "stderr",
            text: iopub.content.text,
          }),
        );
      } else if ("traceback" in iopub.content) {
        outputs.push(
          createImmutableOutput({
            output_type: "error",
            ...iopub.content,
          } as any),
        );
      } else if ("data" in iopub.content) {
        outputs.push(
          createImmutableOutput({
            output_type: "display_data",
            ...iopub.content,
          } as any),
        );
      } else {
        console.warn("Unknown iopub message", iopub);
      }
    }
    onOutputsUpdated(List(outputs));
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

export default executeCell;
