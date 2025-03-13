/* eslint-disable @typescript-eslint/no-explicit-any */
import { createImmutableOutput, ImmutableOutput } from "@nteract/commutable";
import { List } from "immutable";
import PythonSessionClient from "src/jupyter/PythonSessionClient";

const executeCell = async (
  code: string,
  sessionClient: PythonSessionClient,
  onOutputsUpdated: (outputs: List<ImmutableOutput>) => void,
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
    await sessionClient.runCode(code);
    return List(outputs);
  } finally {
    removeOnOutputItemCallback();
  }
};

export default executeCell;
