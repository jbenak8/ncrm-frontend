import { useEffect, useRef, useState } from 'react';
import { Box, Divider, IconButton, Tooltip, Typography } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatClearIcon from '@mui/icons-material/FormatClear';
import LinkIcon from '@mui/icons-material/Link';
import TitleIcon from '@mui/icons-material/Title';

// Simple HTML WYSIWYG editor based on contentEditable + document.execCommand.
// Images can be pasted from the clipboard (or dropped) and are embedded
// as base64 data URIs directly into the HTML body.
export default function RichTextEditor({ label, value, onChange, required, minHeight = 220 }) {
  const editorRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  // Sync external value changes (e.g. AI-generated content) into the editor
  // without breaking the caret position while the user is typing.
  useEffect(() => {
    const el = editorRef.current;
    if (el && (value || '') !== el.innerHTML) {
      el.innerHTML = value || '';
    }
  }, [value]);

  const emitChange = () => {
    const el = editorRef.current;
    if (el) onChange(el.innerHTML);
  };

  const exec = (command, arg = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    emitChange();
  };

  const handleLink = () => {
    // eslint-disable-next-line no-alert
    const url = window.prompt('Adresa odkazu (URL):', 'https://');
    if (url) exec('createLink', url);
  };

  const insertImageFile = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      editorRef.current?.focus();
      document.execCommand(
        'insertHTML',
        false,
        `<img src="${reader.result}" alt="" style="max-width: 100%;" />`,
      );
      emitChange();
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) insertImageFile(file);
    }
  };

  // Places the caret at the drop position so the image is inserted where the user dropped it.
  const moveCaretToPoint = (x, y) => {
    const selection = window.getSelection();
    if (!selection) return;
    let range = null;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y);
    } else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
      }
    }
    if (range) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const handleDragOver = (e) => {
    if (Array.from(e.dataTransfer?.types || []).includes('Files')) {
      // Prevent the browser from opening the dropped file in a new tab.
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (!dragOver) setDragOver(true);
    }
  };

  const handleDragLeave = () => {
    if (dragOver) setDragOver(false);
  };

  const handleDrop = (e) => {
    setDragOver(false);
    const files = Array.from(e.dataTransfer?.files || []).filter((f) =>
      f.type.startsWith('image/'),
    );
    if (files.length > 0) {
      e.preventDefault();
      moveCaretToPoint(e.clientX, e.clientY);
      files.forEach(insertImageFile);
    }
  };

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        '&:focus-within': { borderColor: 'primary.main' },
      }}
    >
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, pt: 1, display: 'block' }}>
          {label}
          {required ? ' *' : ''}
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', px: 0.5 }}>
        <Tooltip title="Tučné">
          <IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')}>
            <FormatBoldIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Kurzíva">
          <IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')}>
            <FormatItalicIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Podtržení">
          <IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('underline')}>
            <FormatUnderlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Nadpis">
          <IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('formatBlock', '<h3>')}>
            <TitleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Odrážkový seznam">
          <IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertUnorderedList')}>
            <FormatListBulletedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Číslovaný seznam">
          <IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertOrderedList')}>
            <FormatListNumberedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Odkaz">
          <IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={handleLink}>
            <LinkIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Vyčistit formátování">
          <IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('removeFormat')}>
            <FormatClearIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', pr: 1 }}>
          Obrázky lze vložit ze schránky (Ctrl+V) nebo přetažením (drag&drop)
        </Typography>
      </Box>
      <Divider />
      <Box
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          minHeight,
          maxHeight: 480,
          overflowY: 'auto',
          px: 1.5,
          py: 1,
          outline: 'none',
          typography: 'body2',
          bgcolor: dragOver ? 'action.hover' : 'transparent',
          '& img': { maxWidth: '100%' },
        }}
      />
    </Box>
  );
}
