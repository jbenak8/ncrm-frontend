// Filtering of company-scoped data (orders, invoices, meetings, campaigns) shown
// on the dashboard. Items carry the issuing company in the `companyId` field.

/**
 * Returns only the items issued by one of the allowed companies.
 * `allowedCompanyIds === null` means "no restriction" (administrator with
 * "Zobrazit vše" checked) and all items are returned unchanged.
 */
export function filterByCompanyIds(items, allowedCompanyIds) {
  if (allowedCompanyIds == null) return items;
  return items.filter((item) => allowedCompanyIds.includes(item.companyId));
}
