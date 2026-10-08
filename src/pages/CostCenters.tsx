import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { useAuth } from '../auth/AuthContext';
import { costCentersApi } from '../api/costCenters';
import { costCenterLabel, type CostCenter } from '../types/costCenter';
import { roleAtLeast } from '../lib/roles';
import {
  CostCenterDialog,
  type CostCenterDialogTarget,
} from '../components/CostCenters/CostCenterDialog';

// Cost center (kustannuspaikka) management. Everyone with access can view;
// adding, editing and deleting require LEDGER+ (mirrors the backend). The list
// is reloaded after each mutation so it always reflects server state.
export default function CostCenters() {
  const { t } = useTranslation();
  const { activeMembership } = useAuth();
  const canManage = roleAtLeast(activeMembership?.role, 'LEDGER');

  const [costCenters, setCostCenters] = useState<CostCenter[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [target, setTarget] = useState<CostCenterDialogTarget | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setCostCenters(await costCentersApi.list());
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, activeMembership?.companyId]);

  // The backend refuses to delete a cost center that is used on a journal
  // entry line; that message lands in the page alert.
  async function handleDelete(costCenter: CostCenter) {
    if (!window.confirm(t('costCenters.confirmDelete', { label: costCenterLabel(costCenter) }))) {
      return;
    }
    setBusyId(costCenter.id);
    setError(null);
    try {
      await costCentersApi.remove(costCenter.id);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Typography variant="h4" component="h1">
          {t('costCenters.title')}
        </Typography>
        {canManage && (
          <Button variant="contained" onClick={() => setTarget({ mode: 'create' })}>
            {t('costCenters.newButton')}
          </Button>
        )}
      </Box>

      {!canManage && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {t('costCenters.readOnlyNote')}
        </Typography>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        {costCenters === null ? (
          <CardContent>
            <Typography>{t('common.loading')}</Typography>
          </CardContent>
        ) : costCenters.length === 0 ? (
          <CardContent>
            <Typography color="text.secondary">{t('costCenters.empty')}</Typography>
          </CardContent>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('costCenters.columns.code')}</TableCell>
                  <TableCell>{t('costCenters.columns.name')}</TableCell>
                  {canManage && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {costCenters.map((costCenter) => (
                  <TableRow key={costCenter.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {costCenter.code}
                    </TableCell>
                    <TableCell sx={{ width: '100%' }}>{costCenter.name}</TableCell>
                    {canManage && (
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <IconButton
                          size="small"
                          aria-label={t('costCenters.edit', { label: costCenterLabel(costCenter) })}
                          disabled={busyId === costCenter.id}
                          onClick={() => setTarget({ mode: 'edit', costCenter })}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label={t('costCenters.delete', { label: costCenterLabel(costCenter) })}
                          disabled={busyId === costCenter.id}
                          onClick={() => void handleDelete(costCenter)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <CostCenterDialog
        target={target}
        onClose={() => setTarget(null)}
        onSaved={() => void load()}
      />
    </Box>
  );
}
