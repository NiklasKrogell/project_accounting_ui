// TabBar.tsx
import { Tab, Tabs } from "@mui/material"
import { useTranslation } from "react-i18next";
import React from "react";
import {theme} from "../../theme";

interface Props {
    subscriptionActive: boolean;
    activeTab: string;
    navigate: (value: string) => void;
}

export const TabBar: React.FC<Props> = ({ subscriptionActive, activeTab, navigate }) => {
    const { t } = useTranslation();
    
    return subscriptionActive ? (
        <Tabs sx={{ backgroundColor: "white", 
            borderBottom: `2px solid ${theme.palette.primary.main}`}}
            value={activeTab} 
            onChange={(_, value: string) => navigate(value)}>
            <Tab label={t('nav.dashboard')} value="/" />
            <Tab label={t('nav.fiscalYears')} value="/fiscal-years" />
        </Tabs>
    ) : null;
}
