import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { filesApi } from '../../api/files';
import { PdfPages } from '../Pdf/PdfPages';

interface StatementPdfViewerProps {
  // The stored file holding the statement's PDF.
  fileId: string;
  fileName: string;
  onClose: () => void;
}

// The right-hand side of the bank statement page while a statement is open:
// its PDF, in place of the statement list. The bytes come through the API with
// the session cookie (the file API serves them as a download, never as a page
// of its own), so they are fetched here. The pages are drawn by ourselves
// (PdfPages), which leaves the pane with this bar and the statement only; the
// browser's own viewer, with its toolbar, is what "open in new tab" shows.
export function StatementPdfViewer({ fileId, fileName, onClose }: StatementPdfViewerProps) {
  const { t } = useTranslation();
  const [file, setFile] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set when the PDF could not be drawn by ourselves (a browser too old for
  // the engine, a file it can't open): the browser's own viewer is shown in
  // the pane instead, from this object URL.
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [drawingFailed, setDrawingFailed] = useState(false);
  // The object URL handed to a tab of its own. It has to outlive this view, or
  // that tab could not be reloaded; the browser frees it with the page.
  const tabUrl = useRef<string | null>(null);

  useEffect(() => {
    let stale = false;
    tabUrl.current = null;
    setFile(null);
    setError(null);
    setDrawingFailed(false);
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

  useEffect(() => {
    if (!file || !drawingFailed) return;
    const url = URL.createObjectURL(file);
    setFallbackUrl(url);
    return () => {
      setFallbackUrl(null);
      URL.revokeObjectURL(url);
    };
  }, [file, drawingFailed]);

  const handleDrawingError = useCallback((err: Error) => {
    console.warn("The PDF could not be drawn; showing it in the browser's own viewer.", err);
    setDrawingFailed(true);
  }, []);

  const openInNewTab = () => {
    if (!file) return;
    tabUrl.current ??= URL.createObjectURL(file);
    window.open(tabUrl.current, '_blank', 'noopener');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1,
          py: 0.5,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <IconButton
          aria-label={t('bankStatements.pdf.openInNewTab')}
          title={t('bankStatements.pdf.openInNewTab')}
          disabled={!file}
          onClick={openInNewTab}
        >
          <OpenInNewIcon />
        </IconButton>
        {/* Not a heading: the left pane already heads the page with the name. */}
        <Typography variant="subtitle1" component="div" noWrap sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          {fileName}
        </Typography>
        <IconButton
          aria-label={t('bankStatements.pdf.close')}
          title={t('bankStatements.pdf.close')}
          onClick={onClose}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      ) : !file ? (
        <Typography sx={{ p: 2 }}>{t('common.loading')}</Typography>
      ) : !drawingFailed ? (
        <PdfPages file={file} label={fileName} onError={handleDrawingError} />
      ) : (
        fallbackUrl && (
          <Box
            component="iframe"
            title={fileName}
            src={fallbackUrl}
            sx={{ flex: 1, minHeight: 0, width: '100%', border: 0 }}
          />
        )
      )}
    </Box>
  );
}
