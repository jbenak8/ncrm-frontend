// Builds the CustomerRequest payload from a loaded customer detail so that the
// nested collections (sites, contactPersons) can be extended and the customer
// saved via PUT /customers/{id}.
export function customerToPayload(customer) {
  return {
    designation: customer.designation || '',
    name: customer.name || '',
    registrationId: customer.registrationId || '',
    vatId: customer.vatId || '',
    email: customer.email || '',
    phone: customer.phone || '',
    headquartersAddress: customer.headquartersAddress || null,
    salesRepresentativeId: customer.salesRepresentativeId || null,
    active: customer.active !== false,
    note: customer.note || '',
    sites: customer.sites || [],
    contactPersons: customer.contactPersons || [],
  };
}
