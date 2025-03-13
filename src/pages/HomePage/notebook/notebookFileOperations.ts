import { ImmutableNotebook, toJS } from "@nteract/commutable";
import { GithubNotebookParams } from "../../../shared/util/indexedDb";

export const downloadNotebook = (
  notebook: ImmutableNotebook,
  githubParams: GithubNotebookParams | null,
) => {
  const notebookData = toJS(notebook);
  const filename = githubParams ? githubParams.path : "Untitled.ipynb";
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
