import { ImmutableNotebook } from "@nteract/commutable";
import { useEffect, useState } from "react";
import { checkNotebooksEqual } from "./notebook/notebook-utils";

export function makeRandomId() {
  return crypto.randomUUID();
}

let dataToTest:
  | {
      notebook: ImmutableNotebook;
      remoteNotebook: ImmutableNotebook | null;
    }
  | undefined = undefined;
let testScheduled = false;
export const useHasLocalChanges = (
  notebook: ImmutableNotebook,
  remoteNotebook: ImmutableNotebook | null,
) => {
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  useEffect(() => {
    dataToTest = { notebook, remoteNotebook };
    if (!testScheduled) {
      testScheduled = true;
      setTimeout(() => {
        if (dataToTest) {
          const { notebook, remoteNotebook } = dataToTest;
          setHasLocalChanges(
            remoteNotebook
              ? !checkNotebooksEqual(notebook, remoteNotebook)
              : false,
          );
          dataToTest = undefined;
          testScheduled = false;
        }
      }, 1000);
    }
  }, [notebook, remoteNotebook]);

  return hasLocalChanges;
};
