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

export type JupyterConnectivityState = {
  mode: "jupyter-server" | "jupyterlab-extension";
  jupyterServerUrl: string;
  jupyterServerToken: string;
  jupyterServerIsAvailable: boolean;
  refreshJupyter: () => void;
  changeJupyterServerUrl: () => void;
  changeJupyterServerToken: () => void;
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
        });
        if (resp.ok) {
          const kernels = await resp.json();
          setJupyterServerIsAvailable(true);
          setNumActiveKernels(kernels.length);
        } else {
          setJupyterServerIsAvailable(false);
          setNumActiveKernels(0);
        }
      } catch {
        setJupyterServerIsAvailable(false);
      }
    } else if (mode === "jupyterlab-extension") {
      setJupyterServerIsAvailable(!!extensionKernel);
    }
  }, [jupyterServerUrl, jupyterServerToken, mode, extensionKernel]);
  const [refreshCode, setRefreshCode] = useState(0);
  useEffect(() => {
    check();
  }, [check, refreshCode, jupyterServerUrl, jupyterServerToken]);
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
    if (newToken) {
      localStorage.setItem("jupyter-server-token", newToken);
      setJupyterServerToken(newToken);
      setRefreshCode((c) => c + 1);
    }
  }, [jupyterServerToken]);
  const value = useMemo(
    () => ({
      mode,
      jupyterServerUrl,
      jupyterServerToken,
      jupyterServerIsAvailable,
      refreshJupyter,
      changeJupyterServerUrl,
      changeJupyterServerToken,
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

export const useJupyterConnectivity = () => {
  const context = useContext(JupyterConnectivityContext);
  if (!context) {
    throw new Error(
      "useJupyterConnectivity must be used within a JupyterConnectivityProvider",
    );
  }
  return context;
};
