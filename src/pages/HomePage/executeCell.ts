import { createImmutableOutput, ImmutableOutput } from "@nteract/commutable";
import { List } from "immutable";
import PythonSessionClient from "src/jupyter/PythonSessionClient";

const executeCell = async (code: string, sessionClient: PythonSessionClient, onOutputsUpdated: (outputs: List<ImmutableOutput>) => void

): Promise<List<ImmutableOutput>> => {
    const outputs: ImmutableOutput[] = [];
    const removeOnOutputItemCallback = sessionClient.onOutputItem(item => {
        if (item.type === "stdout") {
            outputs.push(createImmutableOutput({
                output_type: "stream",
                name: "stdout",
                text: item.content,
            }));
        }
        else if (item.type === "stderr") {
            outputs.push(createImmutableOutput({
                output_type: "stream",
                name: "stderr",
                text: item.content,
            }));
        }
        else if (item.type === "image") {
            // not handled yet
            console.info("image", item);
        }
        else {
            console.warn("Unknown output item type", item);
        }
        onOutputsUpdated(List(outputs));
    });
    try {
        await sessionClient.runCode(code);
        return List(outputs);
    }
    finally {
        removeOnOutputItemCallback();
    }
}

export default executeCell;