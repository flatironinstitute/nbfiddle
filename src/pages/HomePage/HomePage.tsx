/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useState } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import NotebookView from "./NotebookView";
import JupyterConfigurationView from "../../jupyter/JupyterConfigurationView";
import AboutView from "./AboutView";
import SettingsView from "./SettingsView";
import { ParsedUrlParams } from "../../shared/util/indexedDb";
import { JupyterConnectivityProvider } from "../../jupyter/JupyterConnectivityProvider";
import { useLocation } from "react-router-dom";

type HomePageProps = { width: number; height: number };

interface NotebookParams {
  parsedUrlParams: ParsedUrlParams | null;
  localname: string | undefined;
}

const getNotebookParamsFromUrlSearch = (urlSearch: string): NotebookParams => {
  const params = new URLSearchParams(urlSearch);
  const localname = params.get("localname") || undefined;
  const url = params.get("url") || undefined;

  let parsedUrlParams: ParsedUrlParams | null = null;
  if (url) {
    // Expected format: https://github.com/owner/repo/blob/branch/path/to/notebook.ipynb
    if (url.startsWith("https://github.com/")) {
      const withoutPrefix = url.substring("https://github.com/".length);
      const parts = withoutPrefix.split("/");

      // Need at least: [owner, repo, blob, branch, ...path]
      if (parts.length >= 5 && parts[2] === "blob") {
        const owner = parts[0];
        const repo = parts[1];
        const branch = parts[3];
        const path = parts.slice(4).join("/");

        parsedUrlParams = { type: "github", owner, repo, branch, path };
      } else {
        throw new Error(`Invalid GitHub URL: ${url}`);
      }
    } else if (url.startsWith("https://gist.github.com/")) {
      // Expected format: https://gist.github.com/owner/gistid#file-notebook-name-ipynb
      const withoutPrefix = url.substring("https://gist.github.com/".length);
      const hashIndex = withoutPrefix.indexOf("#");

      if (hashIndex === -1) {
        throw new Error("Missing file specifier in Gist URL");
      }

      const pathPart = withoutPrefix.substring(0, hashIndex);
      const hash = withoutPrefix.substring(hashIndex); // Keep the # character

      const [owner, gistId] = pathPart.split("/");
      if (!owner || !gistId) {
        throw new Error("Invalid Gist URL format");
      }

      if (!hash.startsWith("#file-")) {
        throw new Error("Invalid file specifier in Gist URL");
      }

      // Remove 'file-' prefix from the hash
      const gistFileMorphed = hash.substring(6); // Skip '#file-'
      parsedUrlParams = { type: "gist", owner, gistId, gistFileMorphed };
      console.log(parsedUrlParams);
    } else {
      throw new Error("Query parameter is not a GitHub or Gist URL");
    }
  }

  return { parsedUrlParams, localname };
};

const HomePage: FunctionComponent<HomePageProps> = ({ width, height }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [notebookParams, setNotebookParams] = useState<
    NotebookParams | undefined
  >(undefined);
  const [urlParseError, setUrlParseError] = useState<string | null>(null);

  const location = useLocation();
  const urlSearch = location.search;

  // Initialize notebook params from URL
  useEffect(() => {
    try {
      setUrlParseError(null);
      const params = getNotebookParamsFromUrlSearch(urlSearch);
      setNotebookParams(params);
    } catch (e: any) {
      setUrlParseError(e.message);
    }

    // Update params when URL changes
    const handleUrlChange = () => {
      setUrlParseError(null);
      try {
        const newParams = getNotebookParamsFromUrlSearch(urlSearch);
        setNotebookParams(newParams);
      } catch (e: any) {
        setUrlParseError(e.message);
      }
    };

    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, [urlSearch]);

  if (urlParseError) {
    return (
      <Box>
        <p>Error parsing URL: {urlParseError}</p>
      </Box>
    );
  }

  if (notebookParams === undefined) {
    return (
      <Box>
        <p>Loading...</p>
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
                px: 1.5,
                minWidth: "auto",
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
            parsedUrlParams={notebookParams.parsedUrlParams}
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
