import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { filesApi } from '../../api/files';

interface StatementPdfViewerProps {
  // The stored file holding the statement's PDF.
  fileId: string;
  fileName: string;
  onClose: () => void;
}

// The right-hand side of the bank statement page while a statement is open:
// its PDF, in place of the statement list. The bytes come through the API with
// the session cookie (the file API serves them as a download, never as a page
// of its own), so they are fetched and shown from an object URL.
export function StatementPdfViewer({ fileId, fileName, onClose }: StatementPdfViewerProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // An object URL that was opened in a tab of its own has to outlive this
  // view, or that tab could not be reloaded; the browser frees it with the
  // page.
  const openedInTab = useRef(false);

  useEffect(() => {
    let stale = false;
    let created: string | null = null;
    openedInTab.current = false;
    setUrl(null);
    setError(null);
    filesApi
      .content(fileId)
      .then((blob) => {
        if (stale) return;
        created = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        setUrl(created);
      })
      .catch((err) => {
        if (!stale) setError((err as Error).message);
      });
    return () => {
      stale = true;
      if (created && !openedInTab.current) URL.revokeObjectURL(created);
    };
  }, [fileId]);

  const openInNewTab = () => {
    if (!url) return;
    openedInTab.current = true;
    window.open(url, '_blank', 'noopener');
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
          disabled={!url}
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
      ) : url ? (
        <Box
          component="iframe"
          title={fileName}
          src={url}
          sx={{ flex: 1, minHeight: 0, width: '100%', border: 0 }}
        />
      ) : (
        <Typography sx={{ p: 2 }}>{t('common.loading')}</Typography>
      )}
    </Box>
  );
}
