import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@mui/material';
import { filesApi } from '../../api/files';
import { PdfViewer } from '../Pdf/PdfViewer';

interface StatementPdfViewerProps {
  // The stored file holding the statement's PDF.
  fileId: string;
  fileName: string;
  onClose: () => void;
}

// The right-hand side of the bank statement page while a statement is open:
// its PDF, in place of the statement list. The bytes come through the API with
// the session cookie (the file API serves them as a download, never as a page
// of its own), so they are fetched here and handed to PdfViewer.
export function StatementPdfViewer({ fileId, fileName, onClose }: StatementPdfViewerProps) {
  const { t } = useTranslation();
  const [file, setFile] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    setFile(null);
    setError(null);
    filesApi
      .content(fileId)
      .then((blob) => {
        if (!stale) setFile(new Blob([blob], { type: 'application/pdf' }));
      })
      .catch((err) => {
        if (!stale) setError((err as Error).message);
      });
    return () => {
      stale = true;
    };
  }, [fileId]);

  return (
    <PdfViewer
      file={file}
      fileName={fileName}
      closeLabel={t('bankStatements.pdf.close')}
      onClose={onClose}
      message={
        error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )
      }
    />
  );
}
