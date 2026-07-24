import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

export default function Footer() {
  const [backendVersion, setBackendVersion] = useState(null);

  useEffect(() => {
    // The actuator info endpoint is public, so a plain fetch (no auth header) is enough.
    fetch('/actuator/info')
      .then((response) => (response.ok ? response.json() : null))
      .then((info) => setBackendVersion(info?.version ?? null))
      .catch(() => setBackendVersion(null));
  }, []);

  return (
    <Box
      component="footer"
      sx={{
        py: 1.5,
        px: 3,
        mt: 'auto',
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        © {new Date().getFullYear()} Jan Benák — nCRM. Všechna práva vyhrazena.
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Verze {__APP_VERSION__}
        {backendVersion ? ` · backend ${backendVersion}` : ''}
      </Typography>
    </Box>
  );
}
