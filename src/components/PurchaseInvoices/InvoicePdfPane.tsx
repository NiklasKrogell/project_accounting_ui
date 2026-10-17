import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { PdfViewer } from '../Pdf/PdfViewer';

// The backend's limit for a stored file (MAX_FILE_SIZE_BYTES).
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

interface InvoicePdfPaneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

// The right-hand side of the new purchase invoice dialog: until a PDF is
// added, a drop zone with a file picker; then the PDF itself, read from the
// file on this computer (nothing is uploaded before the invoice is saved).
// A file that is no PDF, or is larger than the server takes, is refused here.
export function InvoicePdfPane({ file, onFileChange }: InvoicePdfPaneProps) {
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const take = (picked: File | undefined) => {
    if (!picked) return;
    if (!isPdf(picked)) {
      setError(t('purchaseInvoices.dialog.pdfNotPdf', { name: picked.name }));
      return;
    }
    if (picked.size > MAX_FILE_SIZE_BYTES) {
      setError(t('purchaseInvoices.dialog.pdfTooLarge', { name: picked.name }));
      return;
    }
    setError(null);
    onFileChange(picked);
  };

  const handlePicked = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    // Cleared so that picking the same file again is still a change.
    e.target.value = '';
    take(picked);
  };

  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragging(false);
    take(e.dataTransfer.files[0]);
  };

  if (file) {
    return (
      <PdfViewer
        file={file}
        fileName={file.name}
        closeLabel={t('purchaseInvoices.dialog.removePdf')}
        onClose={() => onFileChange(null)}
      />
    );
  }

  return (
    <Box
      component="section"
      aria-label={t('purchaseInvoices.dialog.pdfZone')}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      sx={{
        flex: 1,
        m: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        border: 2,
        borderStyle: 'dashed',
        borderRadius: 1,
        borderColor: dragging ? 'primary.main' : 'divider',
        bgcolor: dragging ? 'action.hover' : 'transparent',
        textAlign: 'center',
        p: 3,
      }}
    >
      <UploadFileIcon color="action" sx={{ fontSize: 48 }} />
      <Typography>{t('purchaseInvoices.dialog.pdfDrop')}</Typography>
      <Button variant="outlined" onClick={() => fileInput.current?.click()}>
        {t('purchaseInvoices.dialog.pdfPick')}
      </Button>
      <input
        ref={fileInput}
        type="file"
        hidden
        accept="application/pdf,.pdf"
        aria-label={t('purchaseInvoices.dialog.pdfPick')}
        onChange={handlePicked}
      />
      <Typography variant="body2" color="text.secondary">
        {t('purchaseInvoices.dialog.pdfOptional')}
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
    </Box>
  );
}
