import { useCallback, useEffect, useState } from "react";
import { useJupyterConnectivity } from "../../../jupyter/JupyterConnectivity";
import PythonSessionClient from "../../../jupyter/PythonSessionClient";

export const useSessionClient = () => {
  const [sessionClient, setSessionClient] =
    useState<PythonSessionClient | null>(null);
  const jupyterConnectivityState = useJupyterConnectivity();

  const [restartCode, setRestartCode] = useState(0);

  useEffect(() => {
    let canceled = false;
    let newSessionClient: PythonSessionClient | undefined = undefined;
    (async () => {
      if (jupyterConnectivityState.jupyterServerIsAvailable) {
        const s = new PythonSessionClient(jupyterConnectivityState);
        // wait a bit so that we don't simultaneously start multiple sessions if jupyterConnectivityState is changing rapidly
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (canceled) {
          s.shutdown();
          return;
        }
        await s.initiate();
        if (canceled) {
          s.shutdown();
          return;
        }
        newSessionClient = s;
        setSessionClient(newSessionClient);
      }
    })();
    return () => {
      canceled = true;
      if (newSessionClient) {
        newSessionClient.shutdown();
      }
    };
  }, [jupyterConnectivityState, restartCode]);

  const handleRestartSession = useCallback(() => {
    setRestartCode((c) => c + 1);
  }, []);

  return { sessionClient, handleRestartSession };
};
