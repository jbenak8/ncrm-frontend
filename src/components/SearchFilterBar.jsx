import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ClearAllIcon from '@mui/icons-material/ClearAll';

// Operators of the generic backend search API (filter=field:operator:value).
const OPERATORS = [
  { value: 'contains', label: 'obsahuje', types: ['text'] },
  { value: 'notContains', label: 'neobsahuje', types: ['text'] },
  { value: 'eq', label: 'rovná se', types: ['text', 'number', 'date', 'datetime', 'boolean', 'enum'] },
  { value: 'neq', label: 'nerovná se', types: ['text', 'number', 'date', 'datetime', 'boolean', 'enum'] },
  { value: 'lt', label: 'menší než', types: ['number', 'date', 'datetime'] },
  { value: 'gt', label: 'větší než', types: ['number', 'date', 'datetime'] },
  { value: 'between', label: 'mezi', types: ['number', 'date', 'datetime'] },
];

function defaultOperator(type) {
  return type === 'text' ? 'contains' : 'eq';
}

function ValueInput({ field, value, onChange, size = 'small' }) {
  if (field.type === 'boolean') {
    return (
      <TextField select size={size} label="Hodnota" value={value} onChange={onChange} sx={{ minWidth: 140 }}>
        <MenuItem value="true">Ano</MenuItem>
        <MenuItem value="false">Ne</MenuItem>
      </TextField>
    );
  }
  if (field.type === 'enum') {
    return (
      <TextField select size={size} label="Hodnota" value={value} onChange={onChange} sx={{ minWidth: 160 }}>
        {(field.options || []).map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }
  const inputType =
    field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'datetime' ? 'datetime-local' : 'text';
  return (
    <TextField
      size={size}
      label="Hodnota"
      type={inputType}
      value={value}
      onChange={onChange}
      InputLabelProps={inputType === 'text' ? undefined : { shrink: true }}
      sx={{ minWidth: 180 }}
    />
  );
}

/**
 * Generic criteria search bar for the backend search API. The user composes
 * conditions (field, operator, value) which are passed to the parent as raw
 * `field:operator:value` filter expressions understood by the /search endpoints.
 *
 * Props:
 *  - fields: [{ name, label, type: 'text'|'number'|'date'|'datetime'|'boolean'|'enum', options? }]
 *  - filters: currently active raw filter expressions (controlled)
 *  - onChange(filters): called when the active filter set changes
 */
export default function SearchFilterBar({ fields, filters, onChange }) {
  const [field, setField] = useState(fields[0]?.name || '');
  const [operator, setOperator] = useState(defaultOperator(fields[0]?.type || 'text'));
  const [value, setValue] = useState('');
  const [valueTo, setValueTo] = useState('');

  const selectedField = fields.find((f) => f.name === field) || fields[0];
  const operators = OPERATORS.filter((o) => o.types.includes(selectedField?.type || 'text'));

  const handleFieldChange = (e) => {
    const next = fields.find((f) => f.name === e.target.value);
    setField(e.target.value);
    setOperator(defaultOperator(next?.type || 'text'));
    setValue('');
    setValueTo('');
  };

  const addFilter = () => {
    if (!selectedField || value === '' || (operator === 'between' && valueTo === '')) return;
    const raw = `${selectedField.name}:${operator}:${operator === 'between' ? `${value},${valueTo}` : value}`;
    onChange([...filters, raw]);
    setValue('');
    setValueTo('');
  };

  const removeFilter = (raw) => onChange(filters.filter((f) => f !== raw));

  const describe = (raw) => {
    const [name, op, ...rest] = raw.split(':');
    const f = fields.find((x) => x.name === name);
    const o = OPERATORS.find((x) => x.value === op);
    let val = rest.join(':');
    if (f?.type === 'enum') {
      val = val
        .split(',')
        .map((v) => f.options?.find((x) => x.value === v)?.label || v)
        .join(' – ');
    } else if (f?.type === 'boolean') {
      val = val === 'true' ? 'Ano' : 'Ne';
    } else if (op === 'between') {
      val = val.replace(',', ' – ');
    }
    return `${f?.label || name} ${o?.label || op} ${val}`;
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        <SearchIcon color="action" />
        <TextField select size="small" label="Pole" value={field} onChange={handleFieldChange} sx={{ minWidth: 160 }}>
          {fields.map((f) => (
            <MenuItem key={f.name} value={f.name}>
              {f.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Podmínka"
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          {operators.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
        <ValueInput field={selectedField} value={value} onChange={(e) => setValue(e.target.value)} />
        {operator === 'between' && (
          <ValueInput field={selectedField} value={valueTo} onChange={(e) => setValueTo(e.target.value)} />
        )}
        <Tooltip title="Přidat podmínku">
          <span>
            <IconButton color="primary" onClick={addFilter} disabled={value === ''}>
              <AddIcon />
            </IconButton>
          </span>
        </Tooltip>
        {filters.length > 0 && (
          <Button size="small" startIcon={<ClearAllIcon />} onClick={() => onChange([])}>
            Zrušit filtry
          </Button>
        )}
      </Stack>
      {filters.length > 0 && (
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {filters.map((raw) => (
            <Chip key={raw} size="small" label={describe(raw)} onDelete={() => removeFilter(raw)} />
          ))}
        </Box>
      )}
    </Paper>
  );
}
