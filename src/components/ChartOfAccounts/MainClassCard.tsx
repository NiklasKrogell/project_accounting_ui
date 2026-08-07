import { useTranslation } from 'react-i18next';
import { Card, CardContent, Typography } from '@mui/material';
import type { Account } from '../../types/account';
import type { ChartSection } from './chartSections';
import { AccountGroupSection } from './AccountGroupSection';

interface MainClassCardProps {
  section: ChartSection;
  onSelectAccount?: (account: Account) => void;
}

// One card per account main class (Pysyvät vastaavat, Liikevaihto, …),
// containing that class's account groups.
export function MainClassCard({ section, onSelectAccount }: MainClassCardProps) {
  const { t } = useTranslation();

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" component="h2">
          {t(`accountMainClass.${section.mainClass}`)}
        </Typography>
        {section.groups.map((group) => (
          <AccountGroupSection key={group.id} group={group} onSelectAccount={onSelectAccount} />
        ))}
      </CardContent>
    </Card>
  );
}
