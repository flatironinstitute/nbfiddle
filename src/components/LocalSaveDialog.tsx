import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { FunctionComponent, useState } from "react";
import { useNavigate } from "react-router-dom";

type LocalSaveDialogProps = {
  open: boolean;
  onClose: () => void;
};

const LocalSaveDialog: FunctionComponent<LocalSaveDialogProps> = ({
  open,
  onClose,
}) => {
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const handleSave = () => {
    const cleanName = name.trim();
    if (cleanName) {
      navigate(`?localname=${cleanName}`, { replace: true });
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Save Notebook in Browser Storage</DialogTitle>
      <DialogContent>
        <div style={{ marginBottom: "16px" }}>
          <strong>Note:</strong>
          <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
            <li>
              This saves the notebook in your browser's local storage only
            </li>
            <li>It will be cleared if you clear your browser data</li>
            <li>It cannot be shared with others</li>
          </ul>
          For permanent storage:
          <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
            <li>Use "Save to Cloud" to save to a GitHub Gist (shareable)</li>
            <li>Use "Download" to save to your computer</li>
          </ul>
        </div>
        <TextField
          autoFocus
          margin="dense"
          label="Notebook Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSave();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          color="primary"
          variant="contained"
          disabled={!name.trim()}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocalSaveDialog;
