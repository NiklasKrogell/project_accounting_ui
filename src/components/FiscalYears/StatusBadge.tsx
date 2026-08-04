import { useTranslation } from 'react-i18next';
import { Chip } from '@mui/material';
import type { PeriodStatus } from '../../types/fiscal';

export function StatusBadge({ status }: { status: PeriodStatus }) {
  const { t } = useTranslation();
  return (
    <Chip size="small" label={t(`fiscalYears.status.${status}`)} color={status === 'OPEN' ? 'success' : 'error'} />
  );
}
