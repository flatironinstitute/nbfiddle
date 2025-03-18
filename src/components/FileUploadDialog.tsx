import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
} from "@mui/material";
import { FunctionComponent, useCallback } from "react";

type FileUploadDialogProps = {
  open: boolean;
  onClose: () => void;
  onFileSelected: (file: File) => void;
};

const FileUploadDialog: FunctionComponent<FileUploadDialogProps> = ({
  open,
  onClose,
  onFileSelected,
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

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Upload Notebook</DialogTitle>
      <DialogContent>
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
          <Typography>Drag and drop a file here or click to select</Typography>
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
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadDialog;
