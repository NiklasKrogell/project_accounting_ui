import type { ReactNode } from 'react';
import { TableCell, TableRow } from '@mui/material';
import type { StatementAmounts } from '../../types/incomeStatement';
import { formatCurrency } from '../../lib/format';

// The rows the income statement and the balance sheet tables are made of, so
// the two statements read as one set.

export const numeric = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;

// The layouts write their headline rows (turnover, the subtotals, the balance
// sheet totals) in capitals; they are also the rows shown even when empty.
const emphasised = { fontWeight: 700, textTransform: 'uppercase' } as const;

// An item with no figure in either column is left out of a statement
// (PMA 2:8 §). With no comparison column, comparisonAmount is null.
export const isEmpty = ({ amount, comparisonAmount }: StatementAmounts) =>
  amount === 0 && (comparisonAmount ?? 0) === 0;

export type StatementLineVariant = 'emphasised' | 'item' | 'subItem' | 'account';

interface StatementLineProps extends StatementAmounts {
  label: ReactNode;
  variant: StatementLineVariant;
  // Indentation level; each level is one step further in.
  depth?: number;
  hasComparison: boolean;
  lang: string;
}

export function StatementLine({
  label,
  variant,
  depth = 0,
  amount,
  comparisonAmount,
  hasComparison,
  lang,
}: StatementLineProps) {
  const text =
    variant === 'emphasised'
      ? emphasised
      : variant === 'item'
        ? { fontWeight: 600 }
        : variant === 'account'
          ? { color: 'text.secondary' }
          : {};

  return (
    <TableRow sx={variant === 'emphasised' ? { backgroundColor: 'action.hover' } : undefined}>
      <TableCell sx={{ pl: 2 + depth * 3, ...text }}>{label}</TableCell>
      <TableCell align="right" sx={{ ...numeric, ...text, textTransform: 'none' }}>
        {formatCurrency(amount, lang)}
      </TableCell>
      {hasComparison && (
        <TableCell align="right" sx={{ ...numeric, ...text, textTransform: 'none' }}>
          {formatCurrency(comparisonAmount ?? 0, lang)}
        </TableCell>
      )}
    </TableRow>
  );
}

interface StatementHeadingProps {
  label: ReactNode;
  hasComparison: boolean;
}

// A headline row without figures, such as the name of a balance sheet side.
export function StatementHeading({ label, hasComparison }: StatementHeadingProps) {
  return (
    <TableRow sx={{ backgroundColor: 'action.hover' }}>
      <TableCell colSpan={hasComparison ? 3 : 2} sx={{ pl: 2, ...emphasised }}>
        {label}
      </TableCell>
    </TableRow>
  );
}
