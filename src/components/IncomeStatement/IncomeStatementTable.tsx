import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type {
  IncomeStatement,
  StatementAccountRow,
  StatementAmounts,
  StatementItemRow,
  StatementSubItem,
} from '../../types/incomeStatement';
import { formatCurrency, formatDateRange } from '../../lib/format';

interface IncomeStatementTableProps {
  // null while the first statement is loading.
  statement: IncomeStatement | null;
  lang: string;
  showAccounts: boolean;
  // Present items 1-5 combined as one "Bruttotulos" item.
  grossResult: boolean;
}

const numeric = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;

// The layout writes turnover and the three subtotals in capitals; they are
// also the rows that are shown even when empty.
const emphasised = { fontWeight: 700, textTransform: 'uppercase' } as const;

// An item with no figure in either period is left out of the statement
// (PMA 2:8 §). With no comparison period, comparisonAmount is null.
const isEmpty = ({ amount, comparisonAmount }: StatementAmounts) =>
  amount === 0 && (comparisonAmount ?? 0) === 0;

type Variant = 'emphasised' | 'item' | 'subItem' | 'account';

interface LineProps extends StatementAmounts {
  label: ReactNode;
  variant: Variant;
  // Indentation level; each level is one step further in.
  depth?: number;
  hasComparison: boolean;
  lang: string;
}

function Line({ label, variant, depth = 0, amount, comparisonAmount, hasComparison, lang }: LineProps) {
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

export function IncomeStatementTable({
  statement,
  lang,
  showAccounts,
  grossResult,
}: IncomeStatementTableProps) {
  const { t } = useTranslation();

  if (statement === null) {
    return (
      <Card>
        <CardContent>
          <Typography>{t('common.loading')}</Typography>
        </CardContent>
      </Card>
    );
  }

  const hasComparison = statement.comparison !== null;
  const shared = { hasComparison, lang };

  const accountLines = (accounts: StatementAccountRow[], depth: number) =>
    showAccounts
      ? accounts
          .filter((account) => !isEmpty(account))
          .map((account) => (
            <Line
              key={account.accountId}
              variant="account"
              depth={depth}
              label={`${account.accountNumber} ${account.accountName}`}
              amount={account.amount}
              comparisonAmount={account.comparisonAmount}
              {...shared}
            />
          ))
      : [];

  const subItemLines = (node: StatementSubItem, depth: number): ReactNode[] =>
    isEmpty(node)
      ? []
      : [
          <Line
            key={node.key}
            variant="subItem"
            depth={depth}
            label={t(`incomeStatementSubItem.${node.key}`)}
            amount={node.amount}
            comparisonAmount={node.comparisonAmount}
            {...shared}
          />,
          ...accountLines(node.accounts, depth + 1),
          ...node.children.flatMap((child) => subItemLines(child, depth + 1)),
        ];

  const itemLines = (row: StatementItemRow): ReactNode[] => {
    // Turnover is shown even when zero; every other empty item is left out.
    if (row.mainClass !== 'REVENUE' && isEmpty(row)) return [];
    const hasSubItems = row.subItems.length > 0;
    return [
      <Line
        key={row.mainClass}
        variant={row.mainClass === 'REVENUE' ? 'emphasised' : 'item'}
        label={t(`accountMainClass.${row.mainClass}`)}
        amount={row.amount}
        comparisonAmount={row.comparisonAmount}
        {...shared}
      />,
      ...row.subItems.flatMap((node) => subItemLines(node, 1)),
      // In an item with sub-items, postings of groups that have none get a
      // line of their own so the sub-items still add up to the item.
      ...(hasSubItems && !isEmpty(row.unallocated)
        ? [
            <Line
              key={`${row.mainClass}-unallocated`}
              variant="subItem"
              depth={1}
              label={<em>{t('incomeStatement.unallocated')}</em>}
              amount={row.unallocated.amount}
              comparisonAmount={row.unallocated.comparisonAmount}
              {...shared}
            />,
          ]
        : []),
      ...accountLines(row.accounts, hasSubItems ? 2 : 1),
    ];
  };

  const lines = statement.rows.flatMap((row, index): ReactNode[] => {
    if (row.kind === 'subtotal') {
      return [
        <Line
          key={row.key}
          variant="emphasised"
          label={t(`incomeStatement.subtotals.${row.key}`)}
          amount={row.amount}
          comparisonAmount={row.comparisonAmount}
          {...shared}
        />,
      ];
    }
    if (grossResult && row.inGrossResult) {
      // The combined item takes the place of the first item it replaces.
      const isFirst = statement.rows.findIndex((r) => r.kind === 'item' && r.inGrossResult) === index;
      return isFirst
        ? [
            <Line
              key="grossResult"
              variant="emphasised"
              label={t('incomeStatement.grossResult')}
              amount={statement.grossResult.amount}
              comparisonAmount={statement.grossResult.comparisonAmount}
              {...shared}
            />,
          ]
        : [];
    }
    return itemLines(row);
  });

  return (
    <Card>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell align="right" sx={numeric}>
                {formatDateRange(statement.period.from, statement.period.to, lang)}
              </TableCell>
              {statement.comparison && (
                <TableCell align="right" sx={numeric}>
                  {formatDateRange(statement.comparison.from, statement.comparison.to, lang)}
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>{lines}</TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
