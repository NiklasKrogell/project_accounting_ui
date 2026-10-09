import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableContainer, TableRow } from '@mui/material';
import type { Account } from '../../types/account';
import { formatVatRate } from '../../lib/vat';

export interface AccountsTableProps {
  accounts: Account[];
  // Whether the company books VAT; when it doesn't, the default VAT rates are
  // greyed out (they are kept, but not used on entry lines).
  vatRegistered: boolean;
  // When omitted (e.g. the user may only read the chart), rows are inert.
  onSelect?: (account: Account) => void;
}

// Number, name and the default VAT rate, where the account has one. No header
// row: the columns repeat under every group heading and read unambiguously
// without one, the VAT rate because it carries its own label.
export function AccountsTable({ accounts, vatRegistered, onSelect }: AccountsTableProps) {
  const { t } = useTranslation();

  const handleKeyDown = (account: Account) => (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(account);
    }
  };

  return (
    <TableContainer>
      <Table size="small">
        <TableBody>
          {accounts.map((account) => (
            <TableRow
              key={account.id}
              hover={Boolean(onSelect)}
              onClick={onSelect && (() => onSelect(account))}
              // Rows act as buttons when selectable, so they need to be
              // reachable and activatable from the keyboard too.
              tabIndex={onSelect ? 0 : undefined}
              onKeyDown={onSelect && handleKeyDown(account)}
              sx={onSelect ? { cursor: 'pointer' } : undefined}
            >
              <TableCell sx={{ width: 120, fontVariantNumeric: 'tabular-nums' }}>
                {account.number}
              </TableCell>
              <TableCell>{account.name}</TableCell>
              <TableCell
                align="right"
                sx={{
                  width: 120,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                  color: vatRegistered ? undefined : 'text.disabled',
                }}
              >
                {account.defaultVatRate !== null &&
                  t('chartOfAccounts.defaultVat', { rate: formatVatRate(account.defaultVatRate) })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
