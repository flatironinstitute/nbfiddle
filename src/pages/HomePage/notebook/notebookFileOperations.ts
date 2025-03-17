import { ImmutableNotebook, toJS } from "@nteract/commutable";

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
