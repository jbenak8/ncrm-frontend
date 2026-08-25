import { describe, expect, it } from 'vitest';
import { customerToPayload } from './customerPayload';

describe('customerToPayload', () => {
  it('maps customer detail fields and preserves nested collections', () => {
    const customer = {
      id: '1',
      name: 'Firma s.r.o.',
      registrationId: '12345678',
      active: true,
      sites: [{ id: 's1', name: 'Sklad' }],
      contactPersons: [{ id: 'p1', firstName: 'Jan', lastName: 'Novák' }],
    };
    const payload = customerToPayload(customer);
    expect(payload.name).toBe('Firma s.r.o.');
    expect(payload.registrationId).toBe('12345678');
    expect(payload.salesRepresentativeId).toBeNull();
    expect(payload.sites).toEqual(customer.sites);
    expect(payload.contactPersons).toEqual(customer.contactPersons);
  });

  it('defaults missing collections to empty arrays and inactive flag handling', () => {
    const payload = customerToPayload({ name: 'X', active: false });
    expect(payload.sites).toEqual([]);
    expect(payload.contactPersons).toEqual([]);
    expect(payload.active).toBe(false);
    expect(payload.headquartersAddress).toBeNull();
  });
});
