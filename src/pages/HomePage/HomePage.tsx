/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import NotebookView from "./NotebookView";
import JupyterConfigurationView from "../../jupyter/JupyterConfigurationView";
import StorageView from "./StorageView";
import AboutView from "./AboutView";
import SettingsView from "./SettingsView";
import { ParsedUrlParams } from "../../shared/util/indexedDb";
import { JupyterConnectivityProvider } from "../../jupyter/JupyterConnectivityProvider";
import { useLocation } from "react-router-dom";
import HorizontalSplitter from "@components/HorizontalSplitter";
import ChatInterface from "../../chat/ChatInterface";
import {
  emptyNotebook,
  ImmutableCell,
  ImmutableNotebook,
} from "@nteract/commutable";

type HomePageProps = { width: number; height: number };

interface NotebookParams {
  parsedUrlParams: ParsedUrlParams | null;
  localname: string | undefined;
  embedded: boolean;
}

const getNotebookParamsFromUrlSearch = (urlSearch: string): NotebookParams => {
  const params = new URLSearchParams(urlSearch);
  const localname = params.get("localname") || undefined;
  const url = params.get("url") || undefined;
  const embedded = params.get("embedded") === "1";

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

  return { parsedUrlParams, localname, embedded };
};

type NotebookHistoryState = {
  historyIndex: number;
  notebookHistory: ImmutableNotebook[];
};

const defaultNotebookHistoryState: NotebookHistoryState = {
  historyIndex: -1,
  notebookHistory: [],
};

const HomePage: FunctionComponent<HomePageProps> = ({ width, height }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [notebookParams, setNotebookParams] = useState<
    NotebookParams | undefined
  >(undefined);
  const [urlParseError, setUrlParseError] = useState<string | null>(null);

  const [chatEnabled, setChatEnabled] = useState(
    () => localStorage.getItem("chatEnabled") === "1",
  );
  const [fullWidthEnabled, setFullWidthEnabled] = useState(
    () => localStorage.getItem("fullWidthEnabled") === "1",
  );

  const location = useLocation();
  const urlSearch = location.search;

  const [notebook, setNotebook0] = useState<ImmutableNotebook>(emptyNotebook);
  const [notebookIsTrusted, setNotebookIsTrusted] = useState(true);
  const [notebookHistory, setNotebookHistory] = useState<NotebookHistoryState>(
    defaultNotebookHistoryState,
  );

  // reset the history if parsedUrlParams or localname changes
  useEffect(() => {
    setNotebookHistory(defaultNotebookHistoryState);
  }, [notebookParams]);

  const setNotebook = useCallback(
    (notebook: ImmutableNotebook, o: { isTrusted?: boolean }) => {
      setNotebook0(notebook);
      if (o.isTrusted !== undefined) {
        setNotebookIsTrusted(o.isTrusted);
      }
      // Add new state to history, removing any future states if we're not at the end
      setNotebookHistory((prev) => {
        let newHistory = prev.notebookHistory.slice(0, prev.historyIndex + 1);
        newHistory.push(notebook);
        // we want a maximum of 30 notebook states in the history
        // (don't worry, the data are note duplicated, it's largerly references)
        if (newHistory.length > 30) {
          newHistory = newHistory.slice(-30);
        }
        return {
          historyIndex: newHistory.length - 1,
          notebookHistory: newHistory,
        };
      });
    },
    [],
  );

  const handleUndo = useCallback(() => {
    setNotebookHistory((prev) => {
      if (prev.historyIndex - 1 >= 0) {
        setNotebook0(prev.notebookHistory[prev.historyIndex - 1]);
        return {
          historyIndex: prev.historyIndex - 1,
          notebookHistory: prev.notebookHistory,
        };
      }
      return prev;
    });
  }, [setNotebook0]);

  const handleRedo = useCallback(() => {
    setNotebookHistory((prev) => {
      if (prev.historyIndex + 1 < prev.notebookHistory.length) {
        setNotebook0(prev.notebookHistory[prev.historyIndex + 1]);
        return {
          historyIndex: prev.historyIndex + 1,
          notebookHistory: prev.notebookHistory,
        };
      }
      return prev;
    });
  }, []);

  const [activeCellId, setActiveCellId] = useState<string | undefined>(
    undefined,
  );

  const canUndo = notebookHistory.historyIndex > 0;
  const canRedo =
    notebookHistory.historyIndex < notebookHistory.notebookHistory.length - 1;

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

  const handleReplaceActiveCell = (content: string) => {
    if (!activeCellId) return;
    const c = notebook.cellMap.get(activeCellId);
    if (!c) return;
    let c2: ImmutableCell;
    if (c.cell_type === "code") {
      c2 = c.set("source", content);
    } else if (c.cell_type === "markdown") {
      c2 = c.set("source", content);
    } else {
      return;
    }
    setNotebook(notebook.setIn(["cellMap", activeCellId], c2), {
      isTrusted: undefined,
    });
  };

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
          <Box
            sx={{ display: "flex", alignItems: "center", padding: 0, gap: 0 }}
          >
            {width > 700 && (
              <img
                src="/nbfiddle-logo.svg"
                alt="nbfiddle logo"
                style={{
                  height: "28px",
                  marginLeft: "8px",
                  marginRight: "-15px",
                }}
              />
            )}
            <Tabs
              value={selectedTab}
              onChange={(_, newValue) => setSelectedTab(newValue)}
              variant="scrollable"
              scrollButtons={true}
              allowScrollButtonsMobile={true}
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
              <Tab label="Storage" />
              <Tab label="Settings" />
              <Tab label="About" />
            </Tabs>
          </Box>
        </Box>
        <Box
          sx={{
            display: selectedTab === 0 ? "block" : "none",
            height: "calc(100% - 36px)",
          }}
        >
          <HorizontalSplitter
            width={width}
            height={height - 40}
            initialSplitterPosition={Math.min(350, width / 3)}
            hideFirstChild={!chatEnabled}
          >
            <ChatInterface
              width={0}
              height={0}
              onReplaceActiveCell={handleReplaceActiveCell}
            />
            <NotebookView
              width={0}
              height={0}
              parsedUrlParams={notebookParams.parsedUrlParams}
              localname={notebookParams.localname}
              embedded={notebookParams.embedded}
              onJupyterConfigClick={() => setSelectedTab(1)}
              fullWidthEnabled={fullWidthEnabled}
              notebook={notebook}
              setNotebook={setNotebook}
              notebookIsTrusted={notebookIsTrusted}
              onUndo={canUndo ? handleUndo : undefined}
              onRedo={canRedo ? handleRedo : undefined}
              activeCellId={activeCellId}
              setActiveCellId={setActiveCellId}
            />
          </HorizontalSplitter>
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
          <StorageView
            width={width}
            height={height - 36}
            onOpenNotebook={() => setSelectedTab(0)}
          />
        </Box>
        <Box
          sx={{
            display: selectedTab === 3 ? "block" : "none",
            height: "calc(100% - 36px)",
          }}
        >
          <SettingsView
            width={width}
            height={height - 36}
            chatEnabled={chatEnabled}
            setChatEnabled={setChatEnabled}
            fullWidthEnabled={fullWidthEnabled}
            setFullWidthEnabled={setFullWidthEnabled}
          />
        </Box>
        <Box
          sx={{
            display: selectedTab === 4 ? "block" : "none",
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
