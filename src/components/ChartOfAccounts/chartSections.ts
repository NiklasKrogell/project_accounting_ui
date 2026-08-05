import type { Account, AccountGroup, AccountMainClass } from '../../types/account';

export interface ChartGroup {
  id: string;
  name: string;
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
    section.groups.push({ id: group.id, name: group.name, accounts: group.accounts ?? [] });
  }
  return [...sections.values()];
}
