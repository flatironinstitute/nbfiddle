import { ImmutableCell, ImmutableNotebook, toJS } from "@nteract/commutable";

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
  const notebookData = toJS(notebook);
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
