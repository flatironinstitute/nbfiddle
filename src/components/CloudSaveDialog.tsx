import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Link,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";
import { ImmutableNotebook, toJS } from "@nteract/commutable";
import { formatBytes } from "@shared/util/formatBytes";
import { ParsedUrlParams } from "@shared/util/indexedDb";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type SaveOption = "update-gist" | "new-gist";

type CloudSaveDialogProps = {
  open: boolean;
  onClose: () => void;
  parsedUrlParams: ParsedUrlParams | null;
  onSaveGist: (token: string, fileName: string) => Promise<void>;
  onUpdateGist: (token: string) => Promise<void>;
  notebook: ImmutableNotebook;
};

const CloudSaveDialog: FunctionComponent<CloudSaveDialogProps> = ({
  open,
  onClose,
  parsedUrlParams,
  onSaveGist,
  onUpdateGist,
  notebook,
}) => {
  const [saveOption, setSaveOption] = useState<SaveOption>("new-gist");
  const [gitHubToken, setGitHubToken] = useState(() => {
    return localStorage.getItem("github_token") || "";
  });
  const [fileName, setFileName] = useState("notebook.ipynb");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notebookNumBytes = useMemo(() => {
    const json = JSON.stringify(toJS(notebook), null, 2);
    return json.length;
  }, [notebook]);

  const notebookNumBytesWithoutOutputCells = useMemo(() => {
    const mutableNotebook = toJS(notebook);
    for (const cell of mutableNotebook.cells) {
      if (cell.cell_type === "code") {
        cell.outputs = [];
      }
    }
    const json = JSON.stringify(mutableNotebook, null, 2);
    return json.length;
  }, [notebook]);

  // if the type is gist, we default to update-gist
  useEffect(() => {
    if (parsedUrlParams?.type === "gist") {
      setSaveOption("update-gist");
    }
  }, [parsedUrlParams]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      if (saveOption === "new-gist") {
        await onSaveGist(gitHubToken, fileName);
        localStorage.setItem("github_token", gitHubToken);
      } else {
        await onUpdateGist(gitHubToken);
        localStorage.setItem("github_token", gitHubToken);
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred while saving",
      );
    } finally {
      setIsSaving(false);
    }
  }, [saveOption, gitHubToken, fileName, onSaveGist, onUpdateGist, onClose]);

  const isUpdateGistEnabled = parsedUrlParams?.type === "gist";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Save to Cloud</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary">
          Notebook size: {formatBytes(notebookNumBytes)}
          <br />
          Size without outputs:{" "}
          {formatBytes(notebookNumBytesWithoutOutputCells)}
        </Typography>

        <RadioGroup
          value={saveOption}
          onChange={(e) => setSaveOption(e.target.value as SaveOption)}
        >
          <FormControlLabel
            value="update-gist"
            control={<Radio />}
            label="Update existing GitHub Gist"
            disabled={!isUpdateGistEnabled}
          />
          <FormControlLabel
            value="new-gist"
            control={<Radio />}
            label="Save as new GitHub Gist"
          />
        </RadioGroup>

        <Typography sx={{ mt: 2, mb: 1 }}>
          To save to GitHub Gists, you'll need a Personal Access Token with gist
          permissions.{" "}
          <Link
            href="https://github.com/settings/tokens/new?description=NBFiddle&scopes=gist"
            target="_blank"
            rel="noreferrer"
          >
            Create a new token
          </Link>{" "}
          or visit your{" "}
          <Link
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noreferrer"
          >
            GitHub token settings
          </Link>
          .
        </Typography>

        <TextField
          fullWidth
          label="GitHub Personal Access Token"
          value={gitHubToken}
          onChange={(e) => setGitHubToken(e.target.value)}
          type="password"
          margin="normal"
          size="small"
        />

        {saveOption === "new-gist" && (
          <TextField
            fullWidth
            label="File Name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            margin="normal"
            size="small"
            helperText="File name must end with .ipynb"
            error={!fileName.endsWith(".ipynb")}
          />
        )}
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            Error: {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          color="primary"
          variant="contained"
          disabled={
            isSaving ||
            !gitHubToken ||
            (saveOption === "new-gist" && !fileName.endsWith(".ipynb"))
          }
        >
          {saveOption === "new-gist"
            ? isSaving
              ? "Saving..."
              : "Save"
            : saveOption === "update-gist"
              ? isSaving
                ? "Updating..."
                : "Update"
              : isSaving
                ? "Saving..."
                : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CloudSaveDialog;
