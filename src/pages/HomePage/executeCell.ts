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
  console.log("--- executeCell");
  const outputs: ImmutableOutput[] = [];
  const removeOnOutputItemCallback = sessionClient.onOutputItem((item) => {
    console.log("---- item", item);
    if (item.type === "iopub") {
      const iopub = item.iopubMessage;
      console.log("--- iopub", iopub);
      if (iopub.header.msg_type === "stream") {
        if ("text" in iopub.content) {
          outputs.push(
            createImmutableOutput({
              output_type: "stream",
              name: iopub.content.name,
              text: iopub.content.text,
            }),
          );
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
      } else if (iopub.header.msg_type === "display_data") {
        outputs.push(
          createImmutableOutput({
            output_type: "display_data",
            ...iopub.content,
          } as any),
        );
      } else if ("execution_state" in iopub.content) {
        // ignore
      } else if (iopub.header.msg_type === "execute_input") {
        // ignore
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
