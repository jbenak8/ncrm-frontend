import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import client from '../api/client';

const PROVIDERS = [
  { value: 'CLAUDE', label: 'Claude' },
  { value: 'CHATGPT', label: 'ChatGPT' },
];

/**
 * Direct conversation with the selected AI chatbot (Claude / ChatGPT).
 * The conversation history is kept client-side and sent with every request,
 * so the backend chat endpoint stays stateless.
 */
export default function AiChatPage() {
  const [provider, setProvider] = useState('CLAUDE');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    const message = input.trim();
    if (!message || loading) return;
    setError('');
    setInput('');
    const history = messages;
    setMessages((m) => [...m, { role: 'user', content: message }]);
    setLoading(true);
    try {
      const { data } = await client.post('/ai/chat', { message, history, provider });
      setMessages((m) => [...m, { role: 'assistant', content: data.content || '' }]);
    } catch {
      setError('Komunikace s AI chatbotem se nezdařila.');
    } finally {
      setLoading(false);
    }
  };

  const providerLabel = PROVIDERS.find((p) => p.value === provider)?.label || provider;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          AI chat
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            select
            size="small"
            label="Chatbot"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            {PROVIDERS.map((p) => (
              <MenuItem key={p.value} value={p.value}>
                {p.label}
              </MenuItem>
            ))}
          </TextField>
          <Tooltip title="Vymazat konverzaci">
            <span>
              <IconButton onClick={() => setMessages([])} disabled={messages.length === 0}>
                <DeleteSweepIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ flexGrow: 1, p: 2, overflowY: 'auto', mb: 2 }}>
        {messages.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            Začněte konverzaci s chatbotem {providerLabel}.
          </Typography>
        )}
        <Stack spacing={1.5}>
          {messages.map((m, i) => (
            <Stack
              key={i}
              direction="row"
              spacing={1}
              justifyContent={m.role === 'user' ? 'flex-end' : 'flex-start'}
            >
              {m.role !== 'user' && (
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  <SmartToyIcon fontSize="small" />
                </Avatar>
              )}
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  maxWidth: '75%',
                  bgcolor: m.role === 'user' ? 'primary.light' : 'background.paper',
                  color: m.role === 'user' ? 'primary.contrastText' : 'text.primary',
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {m.content}
                </Typography>
              </Paper>
              {m.role === 'user' && (
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                  <PersonIcon fontSize="small" />
                </Avatar>
              )}
            </Stack>
          ))}
          {loading && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                <SmartToyIcon fontSize="small" />
              </Avatar>
              <CircularProgress size={20} />
            </Stack>
          )}
        </Stack>
        <div ref={bottomRef} />
      </Paper>

      <Box component="form" onSubmit={handleSend} sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={`Napište zprávu pro ${providerLabel}…`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <Button type="submit" variant="contained" endIcon={<SendIcon />} disabled={loading || !input.trim()}>
          Odeslat
        </Button>
      </Box>
    </Box>
  );
}
