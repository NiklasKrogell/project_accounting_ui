import { Table, TableBody, TableCell, TableContainer, TableRow } from '@mui/material';
import type { Account } from '../../types/account';

// Number + name only. No header row: the two columns repeat under every group
// heading and read unambiguously without one.
export function AccountsTable({ accounts }: { accounts: Account[] }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.id}>
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
