import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { PurchaseInvoice } from '../../types/purchaseInvoice';
import NewPurchaseInvoiceDialog from './NewPurchaseInvoiceDialog';

interface OpenCreateOptions {
  onSaved?: (invoice: PurchaseInvoice) => void;
}

interface PurchaseInvoiceDialogValue {
  openCreate: (opts?: OpenCreateOptions) => void;
}

const PurchaseInvoiceDialogContext = createContext<PurchaseInvoiceDialogValue | null>(null);

// Mounts the new purchase invoice dialog once (inside Layout) so any component
// — the TabBar's "Ostot → Uusi ostolasku" action or a page button — can open
// it via usePurchaseInvoiceDialog(), as JournalEntryDialogContext does for
// journal entries.
export function PurchaseInvoiceDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    onSaved?: (invoice: PurchaseInvoice) => void;
  }>({ open: false });

  const openCreate = useCallback((opts?: OpenCreateOptions) => {
    setState({ open: true, onSaved: opts?.onSaved });
  }, []);

  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  return (
    <PurchaseInvoiceDialogContext.Provider value={{ openCreate }}>
      {children}
      <NewPurchaseInvoiceDialog open={state.open} onClose={close} onSaved={state.onSaved} />
    </PurchaseInvoiceDialogContext.Provider>
  );
}

export function usePurchaseInvoiceDialog(): PurchaseInvoiceDialogValue {
  const value = useContext(PurchaseInvoiceDialogContext);
  if (!value) {
    throw new Error('usePurchaseInvoiceDialog must be used within PurchaseInvoiceDialogProvider');
  }
  return value;
}
