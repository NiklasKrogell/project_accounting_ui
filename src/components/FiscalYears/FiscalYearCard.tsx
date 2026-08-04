import { useTranslation } from 'react-i18next';
import { Box, Button, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableRow, Typography } from '@mui/material';
import { fiscalYearsApi } from '../../api/fiscalYears';
import type { FiscalYear } from '../../types/fiscal';
import { formatDateRange } from '../../lib/format';
import { StatusBadge } from './StatusBadge';

interface FiscalYearCardProps {
  fy: FiscalYear;
  lang: string;
  canManage: boolean;
  busyId: string | null;
  onRun: (id: string, action: () => Promise<unknown>) => void;
}

export function FiscalYearCard({ fy, lang, canManage, busyId, onRun }: FiscalYearCardProps) {
  const { t } = useTranslation();
  const isOpen = fy.status === 'OPEN';
  const allPeriodsClosed = fy.periods.every((p) => p.status === 'CLOSED');
  const range = formatDateRange(fy.startDate, fy.endDate, lang);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="h6" component="h2">
              {range}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {t('fiscalYears.granularityLabel', { value: t(`fiscalYears.granularity.${fy.granularity}`) })}
            </Typography>
          </Box>
          <StatusBadge status={fy.status} />
        </Box>

        {canManage && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 2 }}>
            {isOpen ? (
              <Button
                variant="outlined"
                disabled={!allPeriodsClosed || busyId === fy.id}
                title={!allPeriodsClosed ? t('fiscalYears.hints.closeYearBlocked') : undefined}
                onClick={() => onRun(fy.id, () => fiscalYearsApi.close(fy.id))}
              >
                {t('fiscalYears.actions.closeYear')}
              </Button>
            ) : (
              <Button
                variant="outlined"
                disabled={busyId === fy.id}
                onClick={() => onRun(fy.id, () => fiscalYearsApi.reopen(fy.id))}
              >
                {t('fiscalYears.actions.reopenYear')}
              </Button>
            )}
            {isOpen && (
              <Button
                variant="outlined"
                color="error"
                disabled={busyId === fy.id}
                onClick={() => {
                  if (window.confirm(t('fiscalYears.confirmDelete', { range }))) {
                    onRun(fy.id, () => fiscalYearsApi.remove(fy.id));
                  }
                }}
              >
                {t('fiscalYears.actions.deleteYear')}
              </Button>
            )}
          </Box>
        )}

        <Typography variant="subtitle1" component="h3" sx={{ mt: 2 }}>
          {t('fiscalYears.periodsTitle')}
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableBody>
              {fy.periods.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{t('fiscalYears.period', { index: p.index })}</TableCell>
                  <TableCell>{formatDateRange(p.startDate, p.endDate, lang)}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell align="right">
                    {canManage &&
                      isOpen &&
                      (p.status === 'OPEN' ? (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={busyId === p.id}
                          onClick={() => onRun(p.id, () => fiscalYearsApi.closePeriod(p.id))}
                        >
                          {t('fiscalYears.actions.closePeriod')}
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={busyId === p.id}
                          onClick={() => onRun(p.id, () => fiscalYearsApi.reopenPeriod(p.id))}
                        >
                          {t('fiscalYears.actions.reopenPeriod')}
                        </Button>
                      ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
