import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  TextField,
  DialogActions,
  Button,
  Divider,
} from "@mui/material";
import { FunctionComponent, useCallback, useState } from "react";

type FileUploadDialogProps = {
  open: boolean;
  onClose: () => void;
  onFileSelected: (file: File) => void;
  onContentPasted: (content: string) => void;
};

const FileUploadDialog: FunctionComponent<FileUploadDialogProps> = ({
  open,
  onClose,
  onFileSelected,
  onContentPasted,
}) => {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".py") || file.name.endsWith(".ipynb"))) {
        onFileSelected(file);
        onClose();
      }
    },
    [onClose, onFileSelected],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && (file.name.endsWith(".py") || file.name.endsWith(".ipynb"))) {
        onFileSelected(file);
        onClose();
      }
    },
    [onClose, onFileSelected],
  );

  const [pastedContent, setPastedContent] = useState("");

  const handlePasteSubmit = useCallback(() => {
    if (pastedContent.trim()) {
      onContentPasted(pastedContent);
      onClose();
    }
  }, [pastedContent, onContentPasted, onClose]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Upload Notebook</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1" gutterBottom>
          Option 1: Drag and drop or select a file
        </Typography>
        <Box
          sx={{
            border: "2px dashed",
            borderColor: "primary.main",
            borderRadius: 1,
            p: 3,
            textAlign: "center",
            cursor: "pointer",
            "&:hover": {
              backgroundColor: "action.hover",
            },
          }}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <Typography variant="body1">
            Drag and drop a file here or click to select
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supported formats: .py (Jupytext), .ipynb
          </Typography>
          <input
            id="file-input"
            type="file"
            accept=".py,.ipynb"
            onChange={handleFileInputChange}
            style={{ display: "none" }}
          />
        </Box>

        <Box sx={{ my: 2 }}>
          <Divider>
            <Typography color="text.secondary">OR</Typography>
          </Divider>
        </Box>

        <Typography variant="subtitle1" gutterBottom>
          Option 2: Paste Jupytext content
        </Typography>
        <TextField
          multiline
          rows={8}
          fullWidth
          placeholder="Paste your notebook content here..."
          value={pastedContent}
          onChange={(e) => setPastedContent(e.target.value)}
          variant="outlined"
          size="small"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handlePasteSubmit}
          disabled={!pastedContent.trim()}
          variant="contained"
        >
          Submit Pasted Content
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FileUploadDialog;
