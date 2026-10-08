// TabBar.tsx
import { Menu, MenuItem, Tab, Tabs } from "@mui/material"
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useTranslation } from "react-i18next";
import React, { useEffect, useRef, useState } from "react";
import { theme } from "../../theme";
import { useAuth } from "../../auth/AuthContext";
import { roleAtLeast } from "../../lib/roles";
import { NAV_TABS, type NavAction, type NavMenuEntry, type NavTab } from "./navConfig";

interface Props {
    subscriptionActive: boolean;
    activeTab: string;
    navigate: (value: string) => void;
    onAction: (action: NavAction) => void;
}

interface OpenMenu {
    tab: Extract<NavTab, { kind: 'menu' }>;
    anchorEl: HTMLElement;
    // Captured from the tab at open time so the dropdown matches its width.
    width: number;
}

// Mirrors MUI's default Tab styling (theme.typography.button + its layout)
// so dropdown items read as an extension of the tab they fell from.
const menuItemSx = {
    ...theme.typography.button,
    justifyContent: 'center',
    minHeight: 48,
    color: theme.palette.text.secondary,
    '&:hover': {
        color: theme.palette.primary.main,
    },
};

// Small grace period so moving the cursor from the tab into the menu (crossing
// the mouseleave/mouseenter boundary) doesn't flicker the menu closed.
const CLOSE_DELAY_MS = 120;

export const TabBar: React.FC<Props> = ({ subscriptionActive, activeTab, navigate, onAction }) => {
    const { t } = useTranslation();
    const { activeMembership } = useAuth();
    const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const paperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
    }, []);

    if (!subscriptionActive) return null;

    const visibleItems = (tab: Extract<NavTab, { kind: 'menu' }>) =>
        tab.items.filter((item) => !item.minRole || roleAtLeast(activeMembership?.role, item.minRole));

    const cancelClose = () => {
        if (closeTimer.current) {
            clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    };

    const openFor = (tab: Extract<NavTab, { kind: 'menu' }>, anchorEl: HTMLElement) => {
        cancelClose();
        if (visibleItems(tab).length === 0) return;
        setOpenMenu({ tab, anchorEl, width: anchorEl.getBoundingClientRect().width });
    };

    // Closing is paired with `disableRestoreFocus` on the Menu below. MUI's
    // focus trap would otherwise force-focus whatever was focused when the menu
    // took focus — after editing an account and scrolling away, that's an
    // off-screen table row, and re-focusing it yanks the viewport back down to
    // it. We restore focus ourselves instead: only when focus is actually
    // inside the menu (so a plain hover-out never steals it), only to the tab
    // that owns the menu, and never with a scroll.
    const finishClose = () => {
        const paper = paperRef.current;
        if (openMenu && paper?.contains(document.activeElement)) {
            openMenu.anchorEl.focus({ preventScroll: true });
        }
        setOpenMenu(null);
    };

    const closeMenu = () => {
        cancelClose();
        finishClose();
    };

    const scheduleClose = () => {
        cancelClose();
        closeTimer.current = setTimeout(finishClose, CLOSE_DELAY_MS);
    };

    const handleItemClick = (item: NavMenuEntry) => {
        closeMenu();
        if (item.path) navigate(item.path);
        else if (item.action) onAction(item.action);
    };

    return (
        <>
            <Tabs sx={{ backgroundColor: "white",
                borderBottom: `2px solid ${theme.palette.primary.main}`}}
                value={activeTab}
                onChange={(_, value: string) => {
                    // Menu tabs open on hover/click; only links navigate.
                    const tab = NAV_TABS.find((t) => t.value === value);
                    if (tab?.kind === 'link') navigate(value);
                }}>
                {NAV_TABS.map((tab) => {
                    if (tab.kind === 'link') {
                        return <Tab key={tab.value} label={t(tab.labelKey)} value={tab.value} />;
                    }
                    // Hide menus whose items are all role-filtered; menus with no
                    // items configured yet (placeholders) still show.
                    if (tab.items.length > 0 && visibleItems(tab).length === 0) return null;
                    return (
                        <Tab
                            key={tab.value}
                            label={t(tab.labelKey)}
                            value={tab.value}
                            icon={<KeyboardArrowDownIcon fontSize="small" />}
                            iconPosition="end"
                            sx={{ minHeight: 48 }}
                            // Hover opens; click still opens as a touch/keyboard fallback.
                            onMouseEnter={(e) => openFor(tab, e.currentTarget)}
                            onMouseLeave={scheduleClose}
                            onClick={(e) => openFor(tab, e.currentTarget)}
                        />
                    );
                })}
            </Tabs>
            <Menu
                anchorEl={openMenu?.anchorEl ?? null}
                open={openMenu !== null}
                onClose={closeMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                // See finishClose(): we handle focus restoration ourselves so
                // closing the menu can never scroll the page.
                disableRestoreFocus
                // Let hovers pass through the modal backdrop (so other tabs stay
                // hoverable), but re-enable pointer events on the menu paper.
                slotProps={{
                    root: { sx: { pointerEvents: 'none' } },
                    paper: {
                        ref: paperRef,
                        onMouseEnter: cancelClose,
                        onMouseLeave: scheduleClose,
                        sx: { pointerEvents: 'auto', minWidth: openMenu?.width },
                    },
                }}
            >
                {openMenu &&
                    visibleItems(openMenu.tab).map((item) => (
                        <MenuItem key={item.labelKey} onClick={() => handleItemClick(item)} sx={menuItemSx}>
                            {t(item.labelKey)}
                        </MenuItem>
                    ))}
            </Menu>
        </>
    );
}
