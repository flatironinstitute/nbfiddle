/* eslint-disable @typescript-eslint/no-explicit-any */

import loadFilesFromGist from "../../gists/loadFilesFromGist";

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

function getStorageKey(
  parsedUrlParams: ParsedUrlParams | null,
  localname?: string,
): string {
  if (localname) {
    return `local:${localname}`;
  }
  if (!parsedUrlParams) {
    return `local:default`;
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
  isTrusted?: boolean,
): void {
  notebookToSave = notebook;
  if (!notebookSaveScheduled) {
    notebookSaveScheduled = true;
    setTimeout(() => {
      saveNotebookToStorage(
        notebookToSave,
        parsedUrlParams,
        localname,
        isTrusted,
      );
      notebookSaveScheduled = false;
    }, 1000);
  }
}

// Database configuration
const DB_NAME = "nbfiddle";
const DB_VERSION = 2;
const NOTEBOOK_STORE = "notebooks";
const METADATA_STORE = "metadata";

interface NotebookMetadata {
  size: number;
  numCells: number;
  lastModified: string;
  isTrusted?: boolean;
}

// Initialize database
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;

    const openDB = () => {
      request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = async () => {
        // If there's an error opening the database, prompt to clear it
        const shouldClear = window.confirm(
          "There was a problem initializing the database. Would you like to clear it and try again?",
        );
        if (shouldClear) {
          try {
            // Delete the entire database
            const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
            deleteRequest.onsuccess = () => {
              // Try opening again after deletion
              openDB();
            };
            deleteRequest.onerror = () => {
              reject(new Error("Failed to clear database"));
            };
          } catch (err) {
            reject(new Error(`Failed to clear database: ${err}`));
          }
        } else {
          reject(new Error("Failed to open database"));
        }
      };

      request.onblocked = () => {
        reject(
          new Error(
            "Database blocked. Please close other tabs using this app and try again.",
          ),
        );
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(NOTEBOOK_STORE)) {
          db.createObjectStore(NOTEBOOK_STORE);
        }
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE);
        }
      };

      request.onsuccess = () => resolve(request.result);
    };

    // Start the database opening process
    openDB();
  });
}

// Helper to calculate notebook metadata
function calculateMetadata(
  notebook: any,
  o: { isTrusted?: boolean },
): NotebookMetadata {
  return {
    size: JSON.stringify(notebook).length,
    numCells: notebook.cells?.length || 0,
    lastModified: new Date().toISOString(),
    isTrusted: o.isTrusted,
  };
}

export async function saveNotebookToStorage(
  notebook: any,
  parsedUrlParams: ParsedUrlParams | null,
  localname?: string,
  isTrusted?: boolean,
): Promise<void> {
  try {
    const db = await initDB();
    const key = getStorageKey(parsedUrlParams, localname);
    const metadata = calculateMetadata(notebook, { isTrusted });

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [NOTEBOOK_STORE, METADATA_STORE],
        "readwrite",
      );

      transaction.onerror = () => reject(new Error("Failed to save notebook"));

      // Save notebook content
      const notebookStore = transaction.objectStore(NOTEBOOK_STORE);
      const notebookRequest = notebookStore.put(notebook, key);

      notebookRequest.onerror = () =>
        reject(new Error("Failed to save notebook content"));

      // Save metadata separately
      const metadataStore = transaction.objectStore(METADATA_STORE);
      const metadataRequest = metadataStore.put(metadata, key);

      metadataRequest.onerror = () =>
        reject(new Error("Failed to save notebook metadata"));

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
    });
  } catch (error) {
    console.error("Error in saveNotebookToStorage:", error);
    throw error;
  }
}

export async function listStoredNotebooks(): Promise<
  { key: string; metadata: NotebookMetadata }[]
> {
  try {
    const db = await initDB();
    const transaction = db.transaction([METADATA_STORE], "readonly");
    const metadataStore = transaction.objectStore(METADATA_STORE);

    return new Promise((resolve, reject) => {
      const request = metadataStore.getAllKeys();

      request.onerror = () => reject(new Error("Failed to list notebooks"));

      request.onsuccess = async () => {
        const keys = request.result;
        const notebooks: { key: string; metadata: NotebookMetadata }[] = [];

        for (const key of keys) {
          const metadataReq = metadataStore.get(key);

          try {
            const metadata = await new Promise<NotebookMetadata>((res, rej) => {
              metadataReq.onsuccess = () => res(metadataReq.result);
              metadataReq.onerror = () =>
                rej(new Error(`Failed to get metadata: ${key}`));
            });

            if (metadata) {
              notebooks.push({
                key: key as string,
                metadata,
              });
            }
          } catch (error) {
            console.error(`Error loading metadata for ${key}:`, error);
            // Continue with other notebooks even if one fails
          }
        }

        db.close();
        resolve(notebooks);
      };
    });
  } catch (error) {
    console.error("Error in listStoredNotebooks:", error);
    throw error;
  }
}

export async function deleteNotebookFromStorage(key: string): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction(
      [NOTEBOOK_STORE, METADATA_STORE],
      "readwrite",
    );

    return new Promise((resolve, reject) => {
      transaction.onerror = () =>
        reject(new Error("Failed to delete notebook"));

      // Delete from both stores
      const notebookStore = transaction.objectStore(NOTEBOOK_STORE);
      const metadataStore = transaction.objectStore(METADATA_STORE);

      const notebookRequest = notebookStore.delete(key);
      const metadataRequest = metadataStore.delete(key);

      notebookRequest.onerror = () =>
        reject(new Error("Failed to delete notebook content"));
      metadataRequest.onerror = () =>
        reject(new Error("Failed to delete notebook metadata"));

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
    });
  } catch (error) {
    console.error("Error in deleteNotebookFromStorage:", error);
    throw error;
  }
}

export async function loadNotebookFromStorage(
  parsedUrlParams: ParsedUrlParams | null,
  localname?: string,
): Promise<{ notebook: any; metadata: NotebookMetadata } | null> {
  try {
    const db = await initDB();
    const key = getStorageKey(parsedUrlParams, localname);
    const transaction = db.transaction(
      [NOTEBOOK_STORE, METADATA_STORE],
      "readonly",
    );

    return new Promise((resolve, reject) => {
      const notebookStore = transaction.objectStore(NOTEBOOK_STORE);
      const metadataStore = transaction.objectStore(METADATA_STORE);

      const notebookRequest = notebookStore.get(key);
      const metadataRequest = metadataStore.get(key);

      notebookRequest.onerror = () =>
        reject(new Error("Failed to load notebook"));
      metadataRequest.onerror = () =>
        reject(new Error("Failed to load notebook metadata"));

      transaction.oncomplete = () => {
        const notebook = notebookRequest.result;
        const metadata = metadataRequest.result;

        db.close();

        if (!notebook || !metadata) {
          resolve(null);
          return;
        }

        if (
          parsedUrlParams &&
          (notebook.cells.length === 0)
        ) {
          // If loading from a URL, and the notebook is empty, return null
          // did this because there was a glitchy case on my phone
          resolve(null);
          return;
        }

        // Return notebook and metadata separately
        resolve({
          notebook,
          metadata,
        });
      };
    });
  } catch (error) {
    console.error("Error in loadNotebookFromStorage:", error);
    throw error;
  }
}

export async function fetchRemoteNotebook(params: ParsedUrlParams): Promise<{
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
