/* eslint-disable @typescript-eslint/no-explicit-any */

const DB_NAME = "nbfiddle";
const STORE_NAME = "notebooks";
const DB_VERSION = 1;

export interface GithubNotebookParams {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

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
  githubParams: GithubNotebookParams | null,
  localname?: string,
): string {
  if (localname) {
    return `local:${localname}`;
  }
  if (!githubParams) {
    return "local";
  }
  return `github:${githubParams.owner}/${githubParams.repo}/${githubParams.branch}/${githubParams.path}`;
}

let notebookToSave: any | null = null;
let notebookSaveScheduled = false;
export function saveNotebookToStorageDebounced(
  notebook: any,
  githubParams: GithubNotebookParams | null,
  localname?: string,
): void {
  notebookToSave = notebook;
  if (!notebookSaveScheduled) {
    notebookSaveScheduled = true;
    setTimeout(() => {
      saveNotebookToStorage(notebookToSave, githubParams, localname);
      notebookSaveScheduled = false;
    }, 1000);
  }
}

export async function saveNotebookToStorage(
  notebook: any,
  githubParams: GithubNotebookParams | null,
  localname?: string,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const storageKey = getStorageKey(githubParams, localname);
    const request = store.put(notebook, storageKey);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function loadNotebookFromStorage(
  githubParams: GithubNotebookParams | null,
  localname?: string,
): Promise<any | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const storageKey = getStorageKey(githubParams, localname);
    const request = store.get(storageKey);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function fetchGithubNotebook(
  params: GithubNotebookParams,
): Promise<any> {
  // Convert github.com URL to raw.githubusercontent.com URL
  // From: https://github.com/owner/repo/blob/branch/path
  // To:   https://raw.githubusercontent.com/owner/repo/branch/path
  const url = `https://raw.githubusercontent.com/${params.owner}/${params.repo}/${params.branch}/${params.path}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch notebook: ${response.statusText}`);
  }
  return response.json();
}
