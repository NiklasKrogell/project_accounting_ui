import { useTranslation } from 'react-i18next';
import { Chip, type ChipProps } from '@mui/material';
import type { PurchaseInvoiceStatus } from '../../types/purchaseInvoice';

const STATUS_CHIP: Record<PurchaseInvoiceStatus, Pick<ChipProps, 'color' | 'variant'>> = {
  NEW: { color: 'default', variant: 'outlined' },
  APPROVED: { color: 'primary', variant: 'filled' },
  PAID: { color: 'success', variant: 'filled' },
  REJECTED: { color: 'error', variant: 'outlined' },
};

export function PurchaseInvoiceStatusChip({ status }: { status: PurchaseInvoiceStatus }) {
  const { t } = useTranslation();
  return <Chip size="small" {...STATUS_CHIP[status]} label={t(`purchaseInvoices.status.${status}`)} />;
}
