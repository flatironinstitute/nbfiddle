import { FunctionComponent, useEffect, useState } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import NotebookView from "./NotebookView";
import JupyterConfigurationView from "../../jupyter/JupyterConfigurationView";
import AboutView from "./AboutView";
import SettingsView from "./SettingsView";
import { GithubNotebookParams } from "../../shared/util/indexedDb";
import { JupyterConnectivityProvider } from "../../jupyter/JupyterConnectivityProvider";

type HomePageProps = { width: number; height: number };

interface NotebookParams {
  githubParams: GithubNotebookParams | null;
  localname: string | undefined;
}

const getNotebookParamsFromUrl = (): NotebookParams => {
  const params = new URLSearchParams(window.location.search);
  const url = params.get("url");
  const localname = params.get("localname") || undefined;

  let githubParams: GithubNotebookParams | null = null;
  if (url) {
    // Expected format: https://github.com/owner/repo/blob/branch/path/to/notebook.ipynb
    try {
      const githubUrl = new URL(url);
      if (githubUrl.hostname.includes("github.com")) {
        const pathParts = githubUrl.pathname.split("/");
        // Remove empty first element
        pathParts.shift();

        // Need at least: [owner, repo, blob, branch, ...path]
        if (pathParts.length >= 5 && pathParts[2] === "blob") {
          const owner = pathParts[0];
          const repo = pathParts[1];
          const branch = pathParts[3];
          const path = pathParts.slice(4).join("/");

          githubParams = { owner, repo, branch, path };
        }
      }
    } catch {
      githubParams = null;
    }
  }

  return { githubParams, localname };
};

const HomePage: FunctionComponent<HomePageProps> = ({ width, height }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [notebookParams, setNotebookParams] = useState<
    NotebookParams | undefined
  >(undefined);

  // Initialize notebook params from URL
  useEffect(() => {
    const params = getNotebookParamsFromUrl();
    setNotebookParams(params);

    // Update params when URL changes
    const handleUrlChange = () => {
      const newParams = getNotebookParamsFromUrl();
      setNotebookParams(newParams);
    };

    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, []);

  if (notebookParams === undefined) {
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
            sx={{
              minHeight: 36,
              "& .MuiTab-root": {
                minHeight: 36,
                py: 0,
                px: 0.5, // Minimal horizontal padding (4px)
                minWidth: "auto", // Allow tabs to be more compact
              },
            }}
          >
            <Tab label="Notebook" />
            <Tab label="Jupyter Config" />
            <Tab label="Settings" />
            <Tab label="About" />
          </Tabs>
        </Box>
        <Box
          sx={{
            display: selectedTab === 0 ? "block" : "none",
            height: "calc(100% - 36px)",
          }}
        >
          <NotebookView
            width={width}
            height={height - 36}
            githubParams={notebookParams.githubParams}
            localname={notebookParams.localname}
          />
        </Box>
        <Box
          sx={{
            display: selectedTab === 1 ? "block" : "none",
            height: "calc(100% - 36px)",
          }}
        >
          <JupyterConfigurationView width={width - 32} height={height - 36} />
        </Box>
        <Box
          sx={{
            display: selectedTab === 2 ? "block" : "none",
            height: "calc(100% - 36px)",
          }}
        >
          <SettingsView width={width} height={height - 36} />
        </Box>
        <Box
          sx={{
            display: selectedTab === 3 ? "block" : "none",
            height: "calc(100% - 36px)",
          }}
        >
          <AboutView width={width} height={height - 36} />
        </Box>
      </Box>
    </JupyterConnectivityProvider>
  );
};

export default HomePage;
