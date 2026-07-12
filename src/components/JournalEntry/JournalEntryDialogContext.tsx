import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { JournalEntry } from '../../types/journal';
import JournalEntryDialog from './JournalEntryDialog';

interface OpenCreateOptions {
  onSaved?: (entry: JournalEntry) => void;
}

interface JournalEntryDialogValue {
  openCreate: (opts?: OpenCreateOptions) => void;
}

const JournalEntryDialogContext = createContext<JournalEntryDialogValue | null>(null);

// Mounts the journal entry dialog once (inside Layout) so any component — the
// TabBar's "Uusi → Kirjaus" action or a page button — can open it via
// useJournalEntryDialog(). Edit mode can later extend the same state with an
// openEdit(entry) and a mode field.
export function JournalEntryDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; onSaved?: (entry: JournalEntry) => void }>({
    open: false,
  });

  const openCreate = useCallback((opts?: OpenCreateOptions) => {
    setState({ open: true, onSaved: opts?.onSaved });
  }, []);

  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  return (
    <JournalEntryDialogContext.Provider value={{ openCreate }}>
      {children}
      <JournalEntryDialog open={state.open} onClose={close} onSaved={state.onSaved} />
    </JournalEntryDialogContext.Provider>
  );
}

export function useJournalEntryDialog(): JournalEntryDialogValue {
  const value = useContext(JournalEntryDialogContext);
  if (!value) {
    throw new Error('useJournalEntryDialog must be used within JournalEntryDialogProvider');
  }
  return value;
}
