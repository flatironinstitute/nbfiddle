export interface CellNote {
  text: string;
  author: string;
  timestamp: string; // ISO string
}

export interface CellNotes {
  notes: CellNote[];
}
