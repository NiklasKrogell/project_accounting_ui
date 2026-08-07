import type { KeyboardEvent } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableRow } from '@mui/material';
import type { Account } from '../../types/account';

export interface AccountsTableProps {
  accounts: Account[];
  // When omitted (e.g. the user may only read the chart), rows are inert.
  onSelect?: (account: Account) => void;
}

// Number + name only. No header row: the two columns repeat under every group
// heading and read unambiguously without one.
export function AccountsTable({ accounts, onSelect }: AccountsTableProps) {
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
