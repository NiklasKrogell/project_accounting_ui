import type { CompanyInfo } from '../types/settings';

// Upper bounds of a company's details, mirroring the backend's schemas for
// registering a company (company.controller.ts) and for changing its details
// (company-info.controller.ts) — change them together.
export const COMPANY_FIELD_MAX_LENGTH: Record<keyof CompanyInfo, number> = {
  name: 200,
  businessId: 50,
  billingEmail: 254,
  billingAddress: 200,
  billingPostalCode: 20,
  billingCity: 100,
  billingCountry: 100,
};
