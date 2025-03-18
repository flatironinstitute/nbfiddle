/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImmutableNotebook } from "@nteract/commutable";
import serializeNotebook from "../serializeNotebook";

export function makeRandomId() {
  return crypto.randomUUID();
}

export const checkNotebooksEqual = (
  notebook1: ImmutableNotebook,
  notebook2: ImmutableNotebook,
) => {
  return checkDeepEqual(
    serializeNotebook(notebook1),
    serializeNotebook(notebook2),
  );
};

export const checkDeepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!checkDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!checkDeepEqual(a[key], b[key])) return false;
  }
  return true;
};
