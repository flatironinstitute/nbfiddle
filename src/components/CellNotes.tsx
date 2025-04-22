import { IconButton, Paper, TextField, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import { useState } from "react";
import { CellNote } from "../types/CellNote";

interface CellNotesProps {
  notes: CellNote[];
  isAdding: boolean;
  onAddNote: (note: CellNote) => void;
  onCancel: () => void;
  onEditNote: (index: number, note: CellNote) => void;
  onDeleteNote: (index: number) => void;
  currentUser: string;
  onUserChange: (user: string) => void;
  readOnly?: boolean;
}

const CellNotes: React.FC<CellNotesProps> = ({
  notes,
  isAdding,
  onAddNote,
  onEditNote,
  onDeleteNote,
  onCancel,
  currentUser,
  onUserChange,
  readOnly,
}) => {
  const [newNoteText, setNewNoteText] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingUser, setEditingUser] = useState("");

  const handleAddNote = () => {
    if (newNoteText.trim()) {
      onAddNote({
        text: newNoteText.trim(),
        author: currentUser,
        timestamp: new Date().toISOString(),
      });
      setNewNoteText("");
    }
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(notes[index].text);
    setEditingUser(notes[index].author);
  };

  const handleSaveEdit = (index: number) => {
    if (editingText.trim()) {
      onEditNote(index, {
        text: editingText.trim(),
        author: editingUser,
        timestamp: new Date().toISOString(),
      });
      setEditingIndex(null);
      setEditingText("");
      onUserChange(editingUser); // Remember the new user
      setEditingUser("");
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      {notes.length > 0 && (
        <Paper elevation={0} sx={{ p: 1, mb: 1, backgroundColor: "#f5f5f5" }}>
          {notes.map((note, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "flex-start",
                marginBottom: 8,
              }}
            >
              <div style={{ flex: 1 }}>
                {editingIndex === index ? (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <TextField
                        size="small"
                        placeholder="Author..."
                        value={editingUser}
                        onChange={(e) => setEditingUser(e.target.value)}
                        style={{ width: 200 }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                      }}
                    >
                      <TextField
                        multiline
                        minRows={2}
                        size="small"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          // Block special keys from propagating up to cell operations
                          e.stopPropagation(); // Block all key events from reaching notebook
                          if (e.key === "Enter" && e.shiftKey) {
                            e.preventDefault(); // Prevent newline
                            handleSaveEdit(index);
                          } else if (e.key === "Escape") {
                            setEditingIndex(null);
                            setEditingText("");
                            setEditingUser("");
                          }
                        }}
                        autoFocus
                        fullWidth
                      />
                      <div style={{ display: "flex", gap: 4 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleSaveEdit(index)}
                          color="primary"
                          title="Save changes (Shift+Enter)"
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditingIndex(null);
                            setEditingText("");
                            setEditingUser("");
                          }}
                          title="Cancel (Escape)"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Typography
                      variant="body2"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {note.text}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {note.author} -{" "}
                      {new Date(note.timestamp).toLocaleString()}
                    </Typography>
                  </>
                )}
              </div>
              {editingIndex !== index && (
                <div style={{ display: "flex", gap: 4 }}>
                  {!readOnly && (
                    <IconButton
                      size="small"
                      onClick={() => handleStartEdit(index)}
                      title="Edit note"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                  {!readOnly && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        const ok = window.confirm(
                          "Are you sure you want to delete this note?",
                        );
                        if (ok) onDeleteNote(index);
                      }}
                      title="Delete note"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </div>
              )}
            </div>
          ))}
        </Paper>
      )}

      {isAdding && !readOnly && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <TextField
              size="small"
              placeholder="Your name..."
              value={currentUser}
              onChange={(e) => onUserChange(e.target.value)}
              style={{ width: 200 }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <TextField
              multiline
              minRows={2}
              size="small"
              placeholder="Add a note... (Shift+Enter to save)"
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              onKeyDown={(e) => {
                // Block special keys from propagating up to cell operations
                e.stopPropagation(); // Block all key events from reaching notebook
                if (e.key === "Enter" && e.shiftKey) {
                  e.preventDefault(); // Prevent newline
                  handleAddNote();
                } else if (e.key === "Escape") {
                  setNewNoteText("");
                  onCancel();
                }
              }}
              autoFocus
              fullWidth
            />
            {!readOnly && (
              <div style={{ display: "flex", gap: 4 }}>
                <IconButton
                  size="small"
                  onClick={handleAddNote}
                  color="primary"
                  title="Save note (Shift+Enter)"
                >
                  <SaveIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => {
                    setNewNoteText("");
                    onCancel();
                  }}
                  title="Cancel (Escape)"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CellNotes;
