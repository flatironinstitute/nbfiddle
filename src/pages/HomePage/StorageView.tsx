import { Box } from "@mui/material";
import { FunctionComponent } from "react";
import StoredNotebooksView from "../../components/StoredNotebooksView";
import ScrollY from "@components/ScrollY";

type StorageViewProps = {
  width: number;
  height: number;
  onOpenNotebook?: () => void;
};

const StorageView: FunctionComponent<StorageViewProps> = ({
  width,
  height,
  onOpenNotebook,
}) => {
  return (
    <ScrollY width={width} height={height}>
      <Box sx={{ padding: 3, width: width - 60 }}>
        <h2>Browser Storage</h2>
        <p style={{ marginBottom: "20px" }}>
          Manage notebooks stored in your browser's local storage.
        </p>
        <StoredNotebooksView onOpenNotebook={onOpenNotebook} />
      </Box>
    </ScrollY>
  );
};

export default StorageView;
