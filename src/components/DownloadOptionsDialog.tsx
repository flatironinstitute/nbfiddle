import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { ImmutableNotebook } from "@nteract/commutable";
import DownloadIcon from "@mui/icons-material/Download";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { FunctionComponent } from "react";
import {
  copyJupytextToClipboard,
  downloadJupytext,
  downloadNotebook,
} from "../pages/HomePage/notebook/notebookFileOperations";

type DownloadOptionsDialogProps = {
  open: boolean;
  onClose: () => void;
  notebook: ImmutableNotebook;
  localname?: string;
  remoteNotebookFilePath: string | null;
};

const DownloadOptionsDialog: FunctionComponent<DownloadOptionsDialogProps> = ({
  open,
  onClose,
  notebook,
  localname,
  remoteNotebookFilePath,
}) => {
  const handleDownloadIpynb = () => {
    downloadNotebook(notebook, localname, remoteNotebookFilePath);
    onClose();
  };

  const handleDownloadJupytext = () => {
    downloadJupytext(notebook, localname, remoteNotebookFilePath);
    onClose();
  };

  const handleCopyJupytext = async () => {
    await copyJupytextToClipboard(notebook);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Download Options</DialogTitle>
      <DialogContent>
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={handleDownloadIpynb}>
              <ListItemIcon>
                <DownloadIcon />
              </ListItemIcon>
              <ListItemText
                primary="Download as .ipynb"
                secondary="Standard Jupyter notebook format"
              />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={handleDownloadJupytext}>
              <ListItemIcon>
                <DownloadIcon />
              </ListItemIcon>
              <ListItemText
                primary="Download as .py"
                secondary="Python script with Jupytext format"
              />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={handleCopyJupytext}>
              <ListItemIcon>
                <ContentCopyIcon />
              </ListItemIcon>
              <ListItemText
                primary="Copy as Jupytext"
                secondary="Copy Jupytext (.py) format to clipboard"
              />
            </ListItemButton>
          </ListItem>
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DownloadOptionsDialog;
