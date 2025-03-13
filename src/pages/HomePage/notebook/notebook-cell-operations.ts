import {
  ImmutableNotebook,
  emptyCodeCell,
  insertCellAfter,
  insertCellAt,
  deleteCell,
} from "@nteract/commutable";
import { makeRandomId } from "./notebook-utils";

export const addCellAfterActiveCell = (
  notebook: ImmutableNotebook,
  activeCellId: string,
): { newNotebook: ImmutableNotebook; newCellId: string } => {
  const newId = makeRandomId();
  const newCodeCell = emptyCodeCell.set("source", "");
  const newNotebook = insertCellAfter(
    notebook,
    newCodeCell,
    newId,
    activeCellId,
  );
  return { newNotebook, newCellId: newId };
};

export const addCellBeforeActiveCell = (
  notebook: ImmutableNotebook,
  activeCellId: string,
): { newNotebook: ImmutableNotebook; newCellId: string } | undefined => {
  const index = notebook.cellOrder.indexOf(activeCellId);
  if (index === -1) return undefined;

  const newId = makeRandomId();
  const newCodeCell = emptyCodeCell.set("source", "");
  const newNotebook = insertCellAt(notebook, newCodeCell, newId, index);
  return { newNotebook, newCellId: newId };
};

export const deleteActiveCell = (
  notebook: ImmutableNotebook,
  activeCellId: string,
): { newNotebook: ImmutableNotebook; newActiveCellId: string | undefined } => {
  const index = notebook.cellOrder.indexOf(activeCellId);
  if (index === -1)
    return { newNotebook: notebook, newActiveCellId: undefined };

  const newNotebook = deleteCell(notebook, activeCellId);
  const newActiveCellId = newNotebook.cellOrder.get(Math.max(0, index - 1));
  return { newNotebook, newActiveCellId };
};
