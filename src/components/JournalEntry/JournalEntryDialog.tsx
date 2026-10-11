import { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import type { JournalEntry } from '../../types/journal';
import JournalEntryForm from './JournalEntryForm';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (entry: JournalEntry) => void;
}

// The journal entry form in a dialog, for creating an entry from anywhere via
// JournalEntryDialogContext. The dialog mounts its content each time it opens,
// so the form always starts empty and reads the company's data afresh.
export default function JournalEntryDialog({ open, onClose, onSaved }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <JournalEntryForm
        target={{ mode: 'create' }}
        onCancel={onClose}
        onSaved={(entry) => {
          onSaved?.(entry);
          onClose();
        }}
      >
        {({ title, body, actions }) => (
          <>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>{body}</DialogContent>
            <DialogActions>{actions}</DialogActions>
          </>
        )}
      </JournalEntryForm>
    </Dialog>
  );
}
