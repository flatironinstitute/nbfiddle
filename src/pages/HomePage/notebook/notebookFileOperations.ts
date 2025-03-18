import {
  ImmutableCell,
  ImmutableNotebook,
  makeCodeCell,
  makeMarkdownCell,
  makeNotebookRecord,
} from "@nteract/commutable";
import { List as ImmutableList, Map as ImmutableMap } from "immutable";
import serializeNotebook from "../serializeNotebook";

const convertToJupytext = (notebook: ImmutableNotebook): string => {
  let pythonCode = "";

  notebook.cellOrder.forEach((cellId: string) => {
    const cell = notebook.cellMap.get(cellId) as ImmutableCell;
    if (cell.cell_type === "markdown") {
      pythonCode += `# %% [markdown]\n${cell.source}\n\n`;
    } else if (cell.cell_type === "code") {
      pythonCode += `# %%\n${cell.source}\n\n`;
    }
  });

  return pythonCode;
};

export const convertFromJupytext = (pythonCode: string): ImmutableNotebook => {
  const cells: ImmutableCell[] = [];
  let currentSource = "";
  let currentType: "code" | "markdown" = "code";

  const lines = pythonCode.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("# %%")) {
      // Save previous cell if exists
      if (currentSource.trim()) {
        const cell =
          currentType === "markdown"
            ? makeMarkdownCell({
                cell_type: "markdown",
                source: currentSource.trim(),
                metadata: ImmutableMap(),
              })
            : makeCodeCell({
                cell_type: "code",
                source: currentSource.trim(),
                metadata: ImmutableMap(),
                execution_count: null,
                outputs: ImmutableList(),
              });
        cells.push(cell);
        currentSource = "";
      }
      // Set type for next cell
      currentType = line.includes("[markdown]") ? "markdown" : "code";
    } else {
      currentSource += line + "\n";
    }
  }
  // Add final cell if exists
  if (currentSource.trim()) {
    const cell =
      currentType === "markdown"
        ? makeMarkdownCell({
            cell_type: "markdown",
            source: currentSource.trim(),
            metadata: ImmutableMap(),
          })
        : makeCodeCell({
            cell_type: "code",
            source: currentSource.trim(),
            metadata: ImmutableMap(),
            execution_count: null,
            outputs: ImmutableList(),
          });
    cells.push(cell);
  }

  // Convert cells array to notebook structure
  const notebook = makeNotebookRecord({
    cellOrder: ImmutableList(cells.map((_, i) => `cell-${i}`)),
    cellMap: ImmutableMap(cells.map((cell, i) => [`cell-${i}`, cell])),
    nbformat: 4,
    nbformat_minor: 5,
    metadata: ImmutableMap(),
  });

  return notebook;
};

export const downloadJupytext = (
  notebook: ImmutableNotebook,
  localname: string | undefined,
  remoteNotebookFilePath: string | null,
) => {
  const pythonCode = convertToJupytext(notebook);
  const filename = remoteNotebookFilePath
    ? (remoteNotebookFilePath
        .split("/")
        .pop()
        ?.replace(".ipynb", ".py") as string)
    : localname
      ? `${localname}.py`
      : "Untitled.py";

  const blob = new Blob([pythonCode], {
    type: "text/plain",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const copyJupytextToClipboard = async (notebook: ImmutableNotebook) => {
  const pythonCode = convertToJupytext(notebook);
  await navigator.clipboard.writeText(pythonCode);
};

export const downloadNotebook = (
  notebook: ImmutableNotebook,
  localname: string | undefined,
  remoteNotebookFilePath: string | null,
) => {
  const notebookData = serializeNotebook(notebook);
  const filename = remoteNotebookFilePath
    ? (remoteNotebookFilePath.split("/").pop() as string)
    : localname
      ? `${localname}.ipynb`
      : "Untitled.ipynb";
  const blob = new Blob([JSON.stringify(notebookData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// export const NOTEBOOK_LAYOUT = {
//   maxWidth: 1200,
//   getPadding: (width: number, notebookWidth: number) =>
//     Math.max((width - notebookWidth) / 2, 24),
//   getNotebookWidth: (width: number) =>
//     Math.min(width - 48, 1200),
// };
