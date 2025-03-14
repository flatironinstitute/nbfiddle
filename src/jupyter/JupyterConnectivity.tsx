/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface PublicServer {
  name: string;
  url: string;
  description?: string;
}

export const publicServers: PublicServer[] = [
  {
    name: "NBFiddle Cloud",
    url: "http://165.227.178.51:8888",
    description: "Public NBFiddle server (requires token)",
  },
];

export type JupyterConnectivityState = {
  mode: "jupyter-server" | "jupyterlab-extension";
  jupyterServerUrl: string;
  jupyterServerToken: string;
  jupyterServerIsAvailable: boolean;
  refreshJupyter: () => void;
  changeJupyterServerUrl: () => void;
  changeJupyterServerToken: () => void;
  selectPublicServer: (server: PublicServer) => void;
  extensionKernel?: any;
  numActiveKernels: number;
};

const JupyterConnectivityContext = createContext<JupyterConnectivityState>({
  mode: "jupyter-server",
  jupyterServerUrl: "http://localhost:8888",
  jupyterServerToken: "",
  jupyterServerIsAvailable: false,
  refreshJupyter: () => {},
  changeJupyterServerUrl: () => {},
  changeJupyterServerToken: () => {},
  selectPublicServer: () => {},
  extensionKernel: undefined,
  numActiveKernels: 0,
});

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
        console.log("--- jupyterServerToken ---", jupyterServerToken);
        if (jupyterServerToken) {
          headers["Authorization"] = `token ${jupyterServerToken}`;
        }
        console.log("--- headers ---", headers);
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
    localStorage.setItem(
      "jupyter-server-token",
      tokenForPublicServer(server.name),
    );
    setJupyterServerUrl(server.url);
    setJupyterServerToken(tokenForPublicServer(server.name));
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

export const tokenForPublicServer = (serverName: string) => {
  try {
    const publicServerTokens = localStorage.getItem("public-server-tokens");
    if (publicServerTokens) {
      const tokens = JSON.parse(publicServerTokens);
      return tokens[serverName];
    }
  } catch (e) {
    console.error("Failed to get public server token", e);
  }
  return "";
};

export const setTokenForPublicServer = (serverName: string, token: string) => {
  try {
    const publicServerTokens = localStorage.getItem("public-server-tokens");
    const tokens = publicServerTokens ? JSON.parse(publicServerTokens) : {};
    tokens[serverName] = token;
    localStorage.setItem("public-server-tokens", JSON.stringify(tokens));
  } catch (e) {
    console.error("Failed to set public server token", e);
  }
};

export const useJupyterConnectivity = () => {
  const context = useContext(JupyterConnectivityContext);
  if (!context) {
    throw new Error(
      "useJupyterConnectivity must be used within a JupyterConnectivityProvider",
    );
  }
  return context;
};
