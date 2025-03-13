import { FunctionComponent, useEffect, useState } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import NotebookView from "./NotebookView";
import { JupyterConnectivityProvider } from "../../jupyter/JupyterConnectivity";
import JupyterConfigurationView from "../../jupyter/JupyterConfigurationView";
import { GithubNotebookParams } from "../../shared/util/indexedDb";

type HomePageProps = { width: number; height: number };

const getGithubParamsFromUrl = (): GithubNotebookParams | null => {
  const params = new URLSearchParams(window.location.search);
  const url = params.get("url");
  if (!url) return null;

  // Expected format: https://github.com/owner/repo/blob/branch/path/to/notebook.ipynb
  try {
    const githubUrl = new URL(url);
    if (!githubUrl.hostname.includes("github.com")) return null;

    const pathParts = githubUrl.pathname.split("/");
    // Remove empty first element
    pathParts.shift();

    // Need at least: [owner, repo, blob, branch, ...path]
    if (pathParts.length < 5 || pathParts[2] !== "blob") return null;

    const owner = pathParts[0];
    const repo = pathParts[1];
    const branch = pathParts[3];
    const path = pathParts.slice(4).join("/");

    return { owner, repo, branch, path };
  } catch {
    return null;
  }
};

const HomePage: FunctionComponent<HomePageProps> = ({ width, height }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [githubParams, setGithubParams] = useState<
    GithubNotebookParams | null | undefined
  >(undefined);

  // Initialize GitHub params from URL
  useEffect(() => {
    const params = getGithubParamsFromUrl();
    setGithubParams(params);

    // Update params when URL changes
    const handleUrlChange = () => {
      const newParams = getGithubParamsFromUrl();
      setGithubParams(newParams);
    };

    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, []);

  if (githubParams === undefined) {
    return (
      <Box>
        <h1>Loading...</h1>
      </Box>
    );
  }

  return (
    <JupyterConnectivityProvider mode="jupyter-server">
      <Box sx={{ width: "100%", height: "100%" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={selectedTab}
            onChange={(_, newValue) => setSelectedTab(newValue)}
          >
            <Tab label="Notebook" />
            <Tab label="Jupyter Configuration" />
          </Tabs>
        </Box>
        <Box
          sx={{
            display: selectedTab === 0 ? "block" : "none",
            height: "calc(100% - 48px)",
          }}
        >
          <NotebookView
            width={width}
            height={height - 48}
            githubParams={githubParams}
          />
        </Box>
        <Box
          sx={{
            display: selectedTab === 1 ? "block" : "none",
            height: "calc(100% - 48px)",
          }}
        >
          <JupyterConfigurationView width={width} height={height - 48} />
        </Box>
      </Box>
    </JupyterConnectivityProvider>
  );
};

export default HomePage;
