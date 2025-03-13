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

let currentGithubParams: GithubNotebookParams | null = null;
export function setCurrentGithubParams(params: GithubNotebookParams | null) {
  currentGithubParams = params;
}

function getStorageKey(): string {
  if (!currentGithubParams) return "current";
  return `github:${currentGithubParams.owner}/${currentGithubParams.repo}/${currentGithubParams.branch}/${currentGithubParams.path}`;
}

let notebookToSave: any | null = null;
let notebookSaveScheduled = false;
export function saveNotebookDebounced(notebook: any): void {
  notebookToSave = notebook;
  if (!notebookSaveScheduled) {
    notebookSaveScheduled = true;
    setTimeout(() => {
      saveNotebook(notebookToSave);
      notebookSaveScheduled = false;
    }, 1000);
  }
}

export async function saveNotebook(notebook: any): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const storageKey = getStorageKey();
    const request = store.put(notebook, storageKey);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function loadNotebook(): Promise<any | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const storageKey = getStorageKey();
    const request = store.get(storageKey);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
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
