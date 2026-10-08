import type {
  Account,
  AccountGroup,
  AccountMainClass,
  IncomeStatementSubItem,
} from '../../types/account';

export interface ChartGroup {
  id: string;
  name: string;
  mainClass: AccountMainClass;
  incomeStatementSubItem: IncomeStatementSubItem | null;
  accounts: Account[];
}

export interface ChartSection {
  mainClass: AccountMainClass;
  groups: ChartGroup[];
}

// Folds the backend's flat group list into one section per main class. The
// backend already orders groups by main class (enum order) and then by name, so
// a Map preserves that order for both sections and the groups inside them.
export function buildChartSections(groups: AccountGroup[]): ChartSection[] {
  const sections = new Map<AccountMainClass, ChartSection>();
  for (const group of groups) {
    let section = sections.get(group.mainClass);
    if (!section) {
      section = { mainClass: group.mainClass, groups: [] };
      sections.set(group.mainClass, section);
    }
    section.groups.push({
      id: group.id,
      name: group.name,
      mainClass: group.mainClass,
      incomeStatementSubItem: group.incomeStatementSubItem,
      accounts: group.accounts ?? [],
    });
  }
  return [...sections.values()];
}
