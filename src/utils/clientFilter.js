/**
 * Client-side evaluation of the raw `field:operator:value` filter expressions
 * produced by SearchFilterBar. Used by administrative lists that load the whole
 * (small) data set at once instead of calling a paginated /search endpoint.
 */

function resolve(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function normalize(value) {
  return String(value ?? '').toLocaleLowerCase('cs');
}

function isNumeric(value) {
  if (typeof value === 'number') return true;
  return value !== '' && value != null && !Number.isNaN(Number(value));
}

// Returns a negative number, zero or a positive number (like Array#sort comparators).
function compareValues(a, b) {
  if (isNumeric(a) && isNumeric(b)) return Number(a) - Number(b);
  return String(a ?? '').localeCompare(String(b ?? ''), 'cs');
}

function matches(item, raw) {
  const [field, operator, ...rest] = raw.split(':');
  const rawValue = rest.join(':');
  const actual = resolve(item, field);
  switch (operator) {
    case 'contains':
      return normalize(actual).includes(normalize(rawValue));
    case 'notContains':
      return !normalize(actual).includes(normalize(rawValue));
    case 'eq':
      return normalize(actual) === normalize(rawValue);
    case 'neq':
      return normalize(actual) !== normalize(rawValue);
    case 'lt':
      return compareValues(actual, rawValue) < 0;
    case 'gt':
      return compareValues(actual, rawValue) > 0;
    case 'between': {
      const [lower, upper] = rawValue.split(',');
      return compareValues(actual, lower) >= 0 && compareValues(actual, upper) <= 0;
    }
    default:
      return true;
  }
}

/**
 * Filters the list by all raw filter expressions (combined with a logical AND).
 */
export function applyClientFilters(items, filters) {
  if (!filters || filters.length === 0) return items;
  return items.filter((item) => filters.every((raw) => matches(item, raw)));
}
