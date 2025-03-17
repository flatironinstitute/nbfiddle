/* eslint-disable @typescript-eslint/no-explicit-any */

import loadFilesFromGist from "../../gists/loadFilesFromGist";

const DB_NAME = "nbfiddle";
const STORE_NAME = "notebooks";
const DB_VERSION = 1;

export type ParsedUrlParams =
  | {
      type: "github";
      owner: string;
      repo: string;
      branch: string;
      path: string;
    }
  | {
      type: "gist";
      owner: string;
      gistId: string;
      gistFileMorphed: string;
    };

export async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

function getStorageKey(
  parsedUrlParams: ParsedUrlParams | null,
  localname?: string,
): string {
  if (localname) {
    return `local:${localname}`;
  }
  if (!parsedUrlParams) {
    return "local";
  }
  if (parsedUrlParams.type === "github") {
    return `github:${parsedUrlParams.owner}/${parsedUrlParams.repo}/${parsedUrlParams.branch}/${parsedUrlParams.path}`;
  } else if (parsedUrlParams.type === "gist") {
    return `gist:${parsedUrlParams.owner}/${parsedUrlParams.gistId}/${parsedUrlParams.gistFileMorphed}`;
  } else {
    throw new Error("Invalid parsedUrlParams");
  }
}

let notebookToSave: any | null = null;
let notebookSaveScheduled = false;
export function saveNotebookToStorageDebounced(
  notebook: any,
  parsedUrlParams: ParsedUrlParams | null,
  localname?: string,
): void {
  notebookToSave = notebook;
  if (!notebookSaveScheduled) {
    notebookSaveScheduled = true;
    setTimeout(() => {
      saveNotebookToStorage(notebookToSave, parsedUrlParams, localname);
      notebookSaveScheduled = false;
    }, 1000);
  }
}

export async function saveNotebookToStorage(
  notebook: any,
  parsedUrlParams: ParsedUrlParams | null,
  localname?: string,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const storageKey = getStorageKey(parsedUrlParams, localname);
    const request = store.put(notebook, storageKey);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function loadNotebookFromStorage(
  parsedUrlParams: ParsedUrlParams | null,
  localname?: string,
): Promise<any | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const storageKey = getStorageKey(parsedUrlParams, localname);
    const request = store.get(storageKey);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function fetchNotebook(params: ParsedUrlParams): Promise<{
  notebookContent: any;
  filePath: any;
}> {
  if (params.type === "github") {
    // Convert github.com URL to raw.githubusercontent.com URL
    // From: https://github.com/owner/repo/blob/branch/path
    // To:   https://raw.githubusercontent.com/owner/repo/branch/path
    const url = `https://raw.githubusercontent.com/${params.owner}/${params.repo}/${params.branch}/${params.path}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch notebook: ${response.statusText}`);
    }
    return { notebookContent: await response.json(), filePath: params.path };
  } else if (params.type === "gist") {
    const { files } = await loadFilesFromGist(
      `https://gist.github.com/${params.owner}/${params.gistId}`,
    );
    for (const fileName in files) {
      if (fileNameMorphedMatches(params.gistFileMorphed, fileName)) {
        return {
          notebookContent: JSON.parse(files[fileName]),
          filePath: fileName,
        };
      }
    }
    console.warn(`File not found in Gist: ${params.gistFileMorphed}`, files);
    throw new Error("File not found in Gist");
  } else {
    throw new Error("Invalid parsedUrlParams");
  }
}

const fileNameMorphedMatches = (morphed: string, actual: string): boolean => {
  const morphedParts = morphed.split("-").map((x) => x.toLowerCase());
  // for the actual, split by non-alphanumeric characters
  const actualParts = actual.split(/[^a-zA-Z0-9]/).map((x) => x.toLowerCase());
  if (actualParts.length !== morphedParts.length) {
    return false;
  }
  for (let i = 0; i < actualParts.length; i++) {
    if (actualParts[i] !== morphedParts[i]) {
      return false;
    }
  }
  return true;
};
