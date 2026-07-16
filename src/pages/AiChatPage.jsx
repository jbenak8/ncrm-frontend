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
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import client from '../api/client';

const PROVIDERS = [
  { value: 'CLAUDE', label: 'Claude' },
  { value: 'CHATGPT', label: 'ChatGPT' },
];

// Converts the conversation to plain text used for the clipboard and the export.
function conversationToText(messages, providerLabel) {
  return messages
    .map((m) => `${m.role === 'user' ? 'Já' : providerLabel}:\n${m.content}`)
    .join('\n\n');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Direct conversation with the selected AI chatbot (Claude / ChatGPT).
 * The conversation history is kept client-side and sent with every request,
 * so the backend chat endpoint stays stateless. The conversation can be
 * copied to the clipboard, exported to a text file or printed.
 */
export default function AiChatPage() {
  const [provider, setProvider] = useState('CLAUDE');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(conversationToText(messages, providerLabel));
      setSnack('Konverzace byla zkopírována do schránky.');
    } catch {
      setError('Kopírování do schránky se nezdařilo.');
    }
  };

  const handleExport = () => {
    const text = conversationToText(messages, providerLabel);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-chat-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSnack('Konverzace byla exportována.');
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) {
      setError('Nepodařilo se otevřít okno pro tisk.');
      return;
    }
    const body = messages
      .map(
        (m) => `
        <div class="message ${m.role === 'user' ? 'user' : 'assistant'}">
          <div class="author">${m.role === 'user' ? 'Já' : escapeHtml(providerLabel)}</div>
          <div class="content">${escapeHtml(m.content)}</div>
        </div>`
      )
      .join('');
    win.document.write(`<!DOCTYPE html>
      <html lang="cs">
      <head>
        <meta charset="utf-8" />
        <title>AI chat — ${escapeHtml(providerLabel)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #222; }
          h1 { font-size: 18px; }
          .message { margin-bottom: 16px; }
          .author { font-weight: bold; margin-bottom: 4px; }
          .content { white-space: pre-wrap; }
          .user .author { color: #1565c0; }
        </style>
      </head>
      <body>
        <h1>AI chat — ${escapeHtml(providerLabel)}</h1>
        ${body}
      </body>
      </html>`);
    win.document.close();
    win.focus();
    win.print();
  };

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
          <Tooltip title="Zkopírovat konverzaci">
            <span>
              <IconButton onClick={handleCopy} disabled={messages.length === 0}>
                <ContentCopyIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Exportovat konverzaci">
            <span>
              <IconButton onClick={handleExport} disabled={messages.length === 0}>
                <DownloadIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Vytisknout konverzaci">
            <span>
              <IconButton onClick={handlePrint} disabled={messages.length === 0}>
                <PrintIcon />
              </IconButton>
            </span>
          </Tooltip>
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

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Box>
  );
}
