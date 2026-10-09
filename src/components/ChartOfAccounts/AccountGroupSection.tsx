import { useTranslation } from 'react-i18next';
import { Box, Chip, IconButton, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { Account } from '../../types/account';
import { balanceSheetItemLabel } from '../../lib/balanceSheetScheme';
import { subItemLabel } from '../../lib/incomeStatementScheme';
import type { ChartGroup } from './chartSections';
import { AccountsTable } from './AccountsTable';

interface AccountGroupSectionProps {
  group: ChartGroup;
  vatRegistered: boolean;
  onSelectAccount?: (account: Account) => void;
  // When omitted (read-only access), the group can't be edited.
  onEditGroup?: (group: ChartGroup) => void;
}

// One account group inside a main class card: its name, the income statement
// sub-item or balance sheet item it is classified as (if any), and its
// accounts.
export function AccountGroupSection({
  group,
  vatRegistered,
  onSelectAccount,
  onEditGroup,
}: AccountGroupSectionProps) {
  const { t } = useTranslation();

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle2" component="h3" color="text.secondary">
          {group.name}
        </Typography>
        {group.incomeStatementSubItem && (
          <Chip
            size="small"
            variant="outlined"
            label={subItemLabel(group.incomeStatementSubItem, t)}
          />
        )}
        {group.balanceSheetItem && (
          <Chip
            size="small"
            variant="outlined"
            label={balanceSheetItemLabel(group.balanceSheetItem, t)}
          />
        )}
        {onEditGroup && (
          <IconButton
            size="small"
            aria-label={t('chartOfAccounts.editGroup', { name: group.name })}
            onClick={() => onEditGroup(group)}
          >
            <EditOutlinedIcon fontSize="inherit" />
          </IconButton>
        )}
      </Box>
      {group.accounts.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('chartOfAccounts.emptyGroup')}
        </Typography>
      ) : (
        <AccountsTable
          accounts={group.accounts}
          vatRegistered={vatRegistered}
          onSelect={onSelectAccount}
        />
      )}
    </Box>
  );
}
