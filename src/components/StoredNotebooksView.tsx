import { Box, Button } from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteNotebookFromStorage,
  listStoredNotebooks,
} from "../shared/util/indexedDb";

interface StoredNotebook {
  id: string;
  name: string;
  type: string;
  size: number;
  cells: number;
  lastModified: Date;
}

interface StoredNotebooksViewProps {
  onOpenNotebook?: () => void;
}

const StoredNotebooksView: React.FC<StoredNotebooksViewProps> = ({
  onOpenNotebook,
}) => {
  const [notebooks, setNotebooks] = useState<StoredNotebook[]>([]);
  const navigate = useNavigate();

  const loadNotebooks = async () => {
    try {
      const stored = await listStoredNotebooks();
      const processed = stored.map(({ key, metadata }) => {
        let name = key;
        let type = "Unknown";

        if (key.startsWith("local:")) {
          name = key.split(":")[1];
          type = "Local";
        } else if (key.startsWith("github:")) {
          name = key.split(":")[1];
          type = "GitHub";
        } else if (key.startsWith("gist:")) {
          name = key.split(":")[1];
          type = "Gist";
        }

        return {
          id: key,
          name,
          type,
          size: metadata.size,
          cells: metadata.numCells,
          lastModified: new Date(metadata.lastModified),
        };
      });
      setNotebooks(processed);
    } catch (error) {
      console.error("Error loading notebooks:", error);
    }
  };

  useEffect(() => {
    loadNotebooks();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this notebook?")) {
      await deleteNotebookFromStorage(id);
      await loadNotebooks();
    }
  };

  const handleOpen = (key: string) => {
    if (key.startsWith("local:")) {
      navigate(`?localname=${key.substring("local:".length)}`);
    } else if (key.startsWith("github:")) {
      const owner = key.substring("github:".length).split("/")[0];
      const repo = key.substring("github:".length).split("/")[1];
      const branch = key.substring("github:".length).split("/")[2];
      const path = key
        .substring("github:".length)
        .split("/")
        .slice(3)
        .join("/");
      navigate(
        `?url=https://github.com/${owner}/${repo}/blob/${branch}/${path}`,
      );
    } else if (key.startsWith("gist:")) {
      const owner = key.substring("gist:".length).split("/")[0];
      const gistId = key.substring("gist:".length).split("/")[1];
      const fileName = key.substring("gist:".length).split("/")[2];
      const morphedFileName = fileName.replace(/[^a-zA-Z0-9]/g, "-");
      navigate(
        `?url=https://gist.github.com/${owner}/${gistId}%23file-${morphedFileName}`,
      );
    }
    onOpenNotebook?.();
  };

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 3,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Box
          component="span"
          sx={{
            cursor: "pointer",
            color: "primary.main",
            "&:hover": {
              textDecoration: "underline",
            },
          }}
          onClick={() => handleOpen(params.row.id)}
        >
          {params.value}
        </Box>
      ),
    },
    { field: "type", headerName: "Type", flex: 1, minWidth: 100 },
    {
      field: "size",
      headerName: "Size",
      flex: 1,
      minWidth: 80,
      valueFormatter: (value) => Math.floor(value / 100) / 10 + " KB",
    },
    { field: "cells", headerName: "# cells", flex: 0.5, minWidth: 80 },
    {
      field: "lastModified",
      headerName: "Last Modified",
      flex: 1,
      minWidth: 180,
      valueFormatter: (value: Date) => value.toLocaleString(),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Button
            size="small"
            color="error"
            onClick={() => handleDelete(params.row.id)}
          >
            Delete local copy
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ mb: 2 }}>
        <Button onClick={loadNotebooks} variant="outlined">
          Refresh
        </Button>
      </Box>
      <DataGrid
        rows={notebooks}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 15, page: 0 },
          },
          sorting: {
            sortModel: [{ field: "lastModified", sort: "desc" }],
          },
        }}
        pageSizeOptions={[5]}
      />
    </Box>
  );
};

export default StoredNotebooksView;
