import { FunctionComponent, useState } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import NotebookView from "./NotebookView";
import { JupyterConnectivityProvider } from "../../jupyter/JupyterConnectivity";
import JupyterConfigurationView from "../../jupyter/JupyterConfigurationView";

type HomePageProps = { width: number; height: number };

const HomePage: FunctionComponent<HomePageProps> = ({ width, height }) => {
  const [selectedTab, setSelectedTab] = useState(0);

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
          <NotebookView width={width} height={height - 48} />
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
