// Mirrors the backend cost center API (see cost-center.controller.ts). The
// code is unique within a company, like an account number.

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// The update endpoint is a full replace (PUT).
export interface CostCenterInput {
  code: string;
  name: string;
}

export const costCenterLabel = (costCenter: Pick<CostCenter, 'code' | 'name'>) =>
  `${costCenter.code} ${costCenter.name}`;
