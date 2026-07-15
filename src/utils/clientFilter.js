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

function asComparable(value) {
  if (typeof value === 'number') return value;
  const num = Number(value);
  if (value !== '' && value != null && !Number.isNaN(num)) return num;
  return String(value ?? '');
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
      return asComparable(actual) < asComparable(rawValue);
    case 'gt':
      return asComparable(actual) > asComparable(rawValue);
    case 'between': {
      const [lower, upper] = rawValue.split(',');
      const value = asComparable(actual);
      return value >= asComparable(lower) && value <= asComparable(upper);
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
