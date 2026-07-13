import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Grid,
  Typography,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import client from '../api/client';
import { useAuth } from '../auth/AuthContext';

function ReportCard({ title, description, onDownload }) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
      <CardActions>
        <Button startIcon={<PictureAsPdfIcon />} onClick={onDownload}>
          Stáhnout PDF
        </Button>
      </CardActions>
    </Card>
  );
}

export default function ReportsPage() {
  const { isOwner } = useAuth();
  const [error, setError] = useState('');

  const download = async (url, filename) => {
    setError('');
    try {
      const res = await client.get(url, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError('Report se nepodařilo stáhnout.');
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Reporty
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {isOwner && (
          <Grid item xs={12} sm={6} md={4}>
            <ReportCard
              title="Přehled prodejů"
              description="Souhrnný report prodejů celé firmy pro majitele — objednávky, tržby a výkonnost."
              onDownload={() => download('/reports/owner/sales-overview', 'prehled-prodeju.pdf')}
            />
          </Grid>
        )}
        <Grid item xs={12} sm={6} md={4}>
          <ReportCard
            title="Výkon obchodního zástupce"
            description="Report výkonnosti obchodního zástupce — schůzky, objednávky a dosažené tržby."
            onDownload={() =>
              download('/reports/representative/performance', 'vykon-zastupce.pdf')
            }
          />
        </Grid>
      </Grid>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Report objednávek konkrétního zákazníka je dostupný na detailu zákazníka.
      </Typography>
    </Box>
  );
}
