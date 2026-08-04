import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Card, CardContent, MenuItem, TextField, Typography } from '@mui/material';
import { fiscalYearsApi } from '../../api/fiscalYears';
import type { PeriodGranularity } from '../../types/fiscal';

interface NewFiscalYearFormProps {
  onCreated: () => void;
  onError: (message: string) => void;
}

export function NewFiscalYearForm({ onCreated, onError }: NewFiscalYearFormProps) {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [granularity, setGranularity] = useState<PeriodGranularity>('MONTH');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await fiscalYearsApi.create({ startDate, endDate, granularity });
      onCreated();
    } catch (err) {
      onError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          {t('fiscalYears.form.title')}
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <TextField
              type="date"
              label={t('fiscalYears.form.startDate')}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type="date"
              label={t('fiscalYears.form.endDate')}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              select
              label={t('fiscalYears.form.granularity')}
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as PeriodGranularity)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="MONTH">{t('fiscalYears.granularity.MONTH')}</MenuItem>
              <MenuItem value="QUARTER">{t('fiscalYears.granularity.QUARTER')}</MenuItem>
            </TextField>
          </Box>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? t('fiscalYears.form.submitting') : t('fiscalYears.form.submit')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
