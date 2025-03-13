import { FunctionComponent } from 'react';
import { AppBar, Box, Toolbar as MuiToolbar, Typography } from '@mui/material';
import { useJupyterConnectivity } from '../jupyter/JupyterConnectivity';

type ToolbarProps = {
  executingCellId: string | null;
};

const Toolbar: FunctionComponent<ToolbarProps> = ({ executingCellId }) => {
  const { jupyterServerIsAvailable, numActiveKernels } = useJupyterConnectivity();
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <MuiToolbar variant="dense" sx={{ display: 'flex', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: jupyterServerIsAvailable ? '#4caf50' : '#d32f2f'
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {jupyterServerIsAvailable ?
              `Connected (${numActiveKernels} kernel${numActiveKernels === 1 ? '' : 's'})` :
              'Not Connected'}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          color={executingCellId ? "primary" : "text.secondary"}
          sx={{ fontFamily: 'monospace' }}
        >
          {executingCellId
            ? `Executing cell: ${executingCellId}`
            : 'Ready'}
        </Typography>
      </MuiToolbar>
    </AppBar>
  );
};

export default Toolbar;
