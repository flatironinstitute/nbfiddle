import { useCallback, useEffect, useState } from "react";
import PythonSessionClient from "../../../jupyter/PythonSessionClient";
import { useJupyterConnectivity } from "../../../jupyter/JupyterConnectivity";

export const useSessionClient = () => {
  const [sessionClient, setSessionClient] =
    useState<PythonSessionClient | null>(null);
  const jupyterConnectivityState = useJupyterConnectivity();

  const handleRestartSession = useCallback(async () => {
    if (sessionClient) {
      await sessionClient.shutdown();
      setSessionClient(null);
    }
    if (jupyterConnectivityState.jupyterServerIsAvailable) {
      const newClient = new PythonSessionClient(jupyterConnectivityState);
      await newClient.initiate();
      setSessionClient(newClient);
    }
  }, [sessionClient, jupyterConnectivityState]);

  useEffect(() => {
    if (!sessionClient && jupyterConnectivityState.jupyterServerIsAvailable) {
      handleRestartSession();
    }
  }, [sessionClient, jupyterConnectivityState, handleRestartSession]);

  return { sessionClient, handleRestartSession };
};
