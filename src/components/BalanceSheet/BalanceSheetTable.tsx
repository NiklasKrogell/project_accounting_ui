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
import type { StatementAccountRow } from '../../types/incomeStatement';
import type {
  BalanceSheet,
  BalanceSheetClass,
  BalanceSheetNode,
  BalanceSheetSide,
} from '../../types/balanceSheet';
import { balanceSheetLabel } from '../../lib/balanceSheetScheme';
import { formatDate } from '../../lib/format';
import { StatementHeading, StatementLine, isEmpty, numeric } from '../Statement/StatementLine';

interface BalanceSheetTableProps {
  // null while the first balance sheet is loading.
  sheet: BalanceSheet | null;
  lang: string;
  showAccounts: boolean;
  // Present the abridged balance sheet (lyhennetty tase) a small undertaking
  // may use: the roman-numeral level only (PMA 2:4.2-4 §).
  abridged: boolean;
}

export function BalanceSheetTable({ sheet, lang, showAccounts, abridged }: BalanceSheetTableProps) {
  const { t } = useTranslation();

  if (sheet === null) {
    return (
      <Card>
        <CardContent>
          <Typography>{t('common.loading')}</Typography>
        </CardContent>
      </Card>
    );
  }

  const hasComparison = sheet.comparisonDate !== null;
  const shared = { hasComparison, lang };
  // The abridged layout has no items to hang accounts on.
  const withAccounts = showAccounts && !abridged;

  const accountLines = (accounts: StatementAccountRow[], depth: number) =>
    withAccounts
      ? accounts
          .filter((account) => !isEmpty(account))
          .map((account) => (
            <StatementLine
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

  // In the abridged layout a node's children are folded into it, except that
  // the long-term part of receivables must still be shown separately.
  const showsChildren = (node: BalanceSheetNode) => !abridged || node.key === 'RECEIVABLES';

  const nodeLines = (node: BalanceSheetNode, depth: number): ReactNode[] =>
    isEmpty(node)
      ? []
      : [
          <StatementLine
            key={node.key}
            variant="subItem"
            depth={depth}
            label={balanceSheetLabel(node.key, t)}
            amount={node.amount}
            comparisonAmount={node.comparisonAmount}
            {...shared}
          />,
          ...accountLines(node.accounts, depth + 1),
          // The part of a result item that comes from the income statement
          // accounts rather than from accounts of its own.
          ...(withAccounts && node.derived && !isEmpty(node.derived)
            ? [
                <StatementLine
                  key={`${node.key}-derived`}
                  variant="account"
                  depth={depth + 1}
                  label={<em>{t('balanceSheet.derivedResult')}</em>}
                  amount={node.derived.amount}
                  comparisonAmount={node.derived.comparisonAmount}
                  {...shared}
                />,
              ]
            : []),
          ...(showsChildren(node)
            ? node.children.flatMap((child) => nodeLines(child, depth + 1))
            : []),
        ];

  // Accumulated appropriations and provisions are shown as one amount each in
  // the abridged layout.
  const showsItems = (section: BalanceSheetClass) =>
    !abridged ||
    (section.mainClass !== 'ACCUMULATED_APPROPRIATIONS' && section.mainClass !== 'PROVISIONS');

  const classLines = (section: BalanceSheetClass): ReactNode[] =>
    isEmpty(section)
      ? []
      : [
          <StatementLine
            key={section.mainClass}
            variant="item"
            label={t(`accountMainClass.${section.mainClass}`)}
            amount={section.amount}
            comparisonAmount={section.comparisonAmount}
            {...shared}
          />,
          ...(showsItems(section) ? section.items.flatMap((node) => nodeLines(node, 1)) : []),
          // Postings of groups that have no item get a line of their own so
          // the items still add up to the section.
          ...(showsItems(section) && !isEmpty(section.unallocated)
            ? [
                <StatementLine
                  key={`${section.mainClass}-unallocated`}
                  variant="subItem"
                  depth={1}
                  label={<em>{t('balanceSheet.unallocated')}</em>}
                  amount={section.unallocated.amount}
                  comparisonAmount={section.unallocated.comparisonAmount}
                  {...shared}
                />,
              ]
            : []),
          ...accountLines(section.accounts, 2),
        ];

  // The name of the side and its total are shown even when the side is empty.
  const sideLines = (side: BalanceSheetSide): ReactNode[] => [
    <StatementHeading
      key={side.side}
      label={t(`balanceSheet.sides.${side.side}`)}
      hasComparison={hasComparison}
    />,
    ...side.classes.flatMap(classLines),
    <StatementLine
      key={`${side.side}-total`}
      variant="emphasised"
      label={t(`balanceSheet.totals.${side.side}`)}
      amount={side.amount}
      comparisonAmount={side.comparisonAmount}
      {...shared}
    />,
  ];

  return (
    <Card>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell align="right" sx={numeric}>
                {formatDate(sheet.date, lang)}
              </TableCell>
              {sheet.comparisonDate && (
                <TableCell align="right" sx={numeric}>
                  {formatDate(sheet.comparisonDate, lang)}
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>{sheet.sides.flatMap(sideLines)}</TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
