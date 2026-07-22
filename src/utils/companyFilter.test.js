import { describe, expect, it } from 'vitest';
import { filterByCompanyIds } from './companyFilter';

const items = [
  { id: 1, companyId: 'a' },
  { id: 2, companyId: 'b' },
  { id: 3, companyId: null },
];

describe('filterByCompanyIds', () => {
  it('returns all items when no restriction is given (administrator, Zobrazit vše)', () => {
    expect(filterByCompanyIds(items, null)).toEqual(items);
    expect(filterByCompanyIds(items, undefined)).toEqual(items);
  });

  it('keeps only items of the allowed companies (active company)', () => {
    expect(filterByCompanyIds(items, ['a'])).toEqual([{ id: 1, companyId: 'a' }]);
  });

  it('supports multiple assigned companies (owner / rep, Zobrazit vše)', () => {
    expect(filterByCompanyIds(items, ['a', 'b']).map((i) => i.id)).toEqual([1, 2]);
  });

  it('drops items without a company when a restriction applies', () => {
    expect(filterByCompanyIds(items, ['b'])).toEqual([{ id: 2, companyId: 'b' }]);
  });

  it('filters everything out for an empty allowed list', () => {
    expect(filterByCompanyIds(items, [])).toEqual([]);
  });
});
