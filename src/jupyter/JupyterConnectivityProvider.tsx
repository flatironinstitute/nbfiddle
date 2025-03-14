/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { PublicServer, publicServers } from "./publicServers";
import {
  JupyterConnectivityContext,
  setTokenForPublicServer,
  tokenForPublicServer,
} from "./JupyterConnectivity";

export const JupyterConnectivityProvider: FunctionComponent<
  PropsWithChildren<{
    mode: "jupyter-server" | "jupyterlab-extension";
    extensionKernel?: any;
  }>
> = ({ children, mode, extensionKernel }) => {
  const [jupyterServerUrl, setJupyterServerUrl] = useState("");
  const [jupyterServerToken, setJupyterServerToken] = useState("");

  useEffect(() => {
    const localStorageKey = "jupyter-server-url";
    const storedJupyterServerUrl = localStorage.getItem(localStorageKey);
    setJupyterServerUrl(storedJupyterServerUrl || "http://localhost:8888");
    setJupyterServerToken(localStorage.getItem("jupyter-server-token") || "");
  }, []);

  const [jupyterServerIsAvailable, setJupyterServerIsAvailable] =
    useState(false);
  const [numActiveKernels, setNumActiveKernels] = useState(0);

  const check = useCallback(async () => {
    if (mode === "jupyter-server") {
      try {
        console.log(`Fetching ${jupyterServerUrl}/api/kernels`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const headers: { [key: string]: string } = {
          "Content-Type": "application/json",
        };
        if (jupyterServerToken) {
          headers["Authorization"] = `token ${jupyterServerToken}`;
        }
        const resp = await fetch(`${jupyterServerUrl}/api/kernels`, {
          method: "GET",
          // apparently it's import to specify the header here, otherwise it seems the header fields can violate CORS
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (resp.ok) {
          const kernels = await resp.json();
          setJupyterServerIsAvailable(true);
          setNumActiveKernels(kernels.length);
        } else {
          console.error("Failed to fetch kernels", resp);
          setJupyterServerIsAvailable(false);
          setNumActiveKernels(0);
        }
      } catch {
        console.error("Failed to fetch kernels *");
        setJupyterServerIsAvailable(false);
        setNumActiveKernels(0);
      }
    } else if (mode === "jupyterlab-extension") {
      setJupyterServerIsAvailable(!!extensionKernel);
    }
  }, [jupyterServerUrl, jupyterServerToken, mode, extensionKernel]);

  const [refreshCode, setRefreshCode] = useState(0);

  useEffect(() => {
    check();
  }, [check, refreshCode]);

  const refreshJupyter = useCallback(() => setRefreshCode((c) => c + 1), []);

  const changeJupyterServerUrl = useCallback(() => {
    const newUrl = prompt(
      "Enter the URL of your Jupyter runtime",
      jupyterServerUrl,
    );
    if (newUrl) {
      localStorage.setItem("jupyter-server-url", newUrl);
      setJupyterServerUrl(newUrl);
      setRefreshCode((c) => c + 1);
    }
  }, [jupyterServerUrl]);

  const changeJupyterServerToken = useCallback(() => {
    const newToken = prompt(
      "Enter the token of your Jupyter runtime",
      jupyterServerToken,
    );
    if (newToken !== null) {
      localStorage.setItem("jupyter-server-token", newToken);
      setJupyterServerToken(newToken);
      setRefreshCode((c) => c + 1);
      for (const server of publicServers) {
        if (server.url === jupyterServerUrl) {
          setTokenForPublicServer(server.name, newToken);
        }
      }
    }
  }, [jupyterServerToken, jupyterServerUrl]);

  const selectPublicServer = useCallback((server: PublicServer) => {
    localStorage.setItem("jupyter-server-url", server.url);
    localStorage.setItem("jupyter-server-name", server.name);
    let t = tokenForPublicServer(server.name);
    if (!t) {
      const newToken = prompt("Enter the token for this public server");
      if (!newToken) {
        return;
      }
      t = newToken;
    }
    localStorage.setItem("jupyter-server-token", t);
    setJupyterServerUrl(server.url);
    setJupyterServerToken(t);
    setRefreshCode((c) => c + 1);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      jupyterServerUrl,
      jupyterServerToken,
      jupyterServerIsAvailable,
      refreshJupyter,
      changeJupyterServerUrl,
      changeJupyterServerToken,
      selectPublicServer,
      extensionKernel,
      numActiveKernels,
    }),
    [
      mode,
      jupyterServerUrl,
      jupyterServerToken,
      jupyterServerIsAvailable,
      refreshJupyter,
      changeJupyterServerUrl,
      changeJupyterServerToken,
      selectPublicServer,
      extensionKernel,
      numActiveKernels,
    ],
  );

  return (
    <JupyterConnectivityContext.Provider value={value}>
      {children}
    </JupyterConnectivityContext.Provider>
  );
};
