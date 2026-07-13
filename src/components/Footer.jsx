import { Box, Typography } from '@mui/material';

export default function Footer() {
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
      </Typography>
    </Box>
  );
}
