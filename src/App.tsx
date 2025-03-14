import "@css/App.css";
import { useWindowDimensions } from "@fi-sci/misc";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  AppBar,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import {
  Route,
  BrowserRouter as Router,
  Routes,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import HomePage from "./pages/HomePage/HomePage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import { JupyterConnectivityProvider } from "./jupyter/JupyterConnectivity";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#7d8cc4",
      dark: "#6b77a8",
      light: "#8f9ed4",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#a8c0ff",
      dark: "#8f9ed4",
      light: "#c5d4ff",
      contrastText: "#2c3554",
    },
    text: {
      primary: "#2c3554",
      secondary: "#4a577d",
    },
    background: {
      default: "#f5f7ff",
      paper: "#ffffff",
    },
  },
});

const AppContent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { width, height } = useWindowDimensions();
  let hideAppBar = searchParams.get("embedded") === "1";

  // for now let's always hide the app bar
  // because it's not used for anything
  // we don't use the settings page, etc
  hideAppBar = true;

  const appBarHeight = hideAppBar ? 0 : 50; // hard-coded to match the height of the AppBar
  const mainHeight = height - appBarHeight;
  return (
    <div
      className="AppContentDiv"
      style={{ position: "absolute", width, height, overflow: "hidden" }}
    >
      {!hideAppBar && (
        <div
          className="AppBarDiv"
          style={{
            position: "absolute",
            width,
            height: appBarHeight,
            overflow: "hidden",
          }}
        >
          <AppBar position="static">
            <Toolbar>
              <img
                src="/nbfiddle-logo.svg"
                alt="nbfiddle logo"
                style={{
                  height: "32px",
                  marginRight: "10px",
                  cursor: "pointer",
                  // filter: "brightness(1.35) contrast(1.15) saturate(1.1)",
                }}
                onClick={() => navigate("/")}
              />
              <Typography
                variant="h6"
                component="div"
                sx={{
                  flexGrow: 1,
                  cursor: "pointer",
                  "&:hover": {
                    opacity: 0.8,
                  },
                }}
                onClick={() => navigate("/")}
              >
                nbfiddle
              </Typography>
              <Tooltip title="Settings">
                <IconButton
                  color="inherit"
                  onClick={() => navigate("/settings")}
                  sx={{ ml: 2 }}
                >
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </Toolbar>
          </AppBar>
        </div>
      )}

      <div
        className="NotebookDiv"
        style={{
          position: "absolute",
          width,
          height: mainHeight,
          overflow: "hidden",
          top: appBarHeight,
        }}
      >
        <Routes>
          <Route
            path="/"
            element={<HomePage width={width} height={mainHeight} />}
          />
          <Route
            path="/settings"
            element={<SettingsPage width={width} height={mainHeight} />}
          />
        </Routes>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <JupyterConnectivityProvider mode="jupyter-server">
          <AppContent />
        </JupyterConnectivityProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
