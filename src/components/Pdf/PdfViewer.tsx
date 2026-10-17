import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { PdfPages } from './PdfPages';

interface PdfViewerProps {
  // The PDF to show; null while it is still being fetched.
  file: Blob | null;
  fileName: string;
  // What closing does where the viewer is shown ("Sulje tiliote", "Poista
  // PDF"): the close button's label.
  closeLabel: string;
  onClose: () => void;
  // Shown in place of the pages, e.g. why the file could not be fetched.
  message?: ReactNode;
}

// A PDF in a pane of its own: a bar with open in new tab, the name and close,
// and the pages under it. The pages are drawn by ourselves (PdfPages), which
// leaves the pane without the browser viewer's toolbar; the browser's own
// viewer is what "open in new tab" shows, and what the pane falls back to when
// the PDF can't be drawn here.
export function PdfViewer({ file, fileName, closeLabel, onClose, message }: PdfViewerProps) {
  const { t } = useTranslation();
  // Set when the PDF could not be drawn by ourselves (a browser too old for
  // the engine, a file it can't open): the browser's own viewer is shown in
  // the pane instead, from this object URL.
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [drawingFailed, setDrawingFailed] = useState(false);
  // The object URL handed to a tab of its own. It has to outlive this view, or
  // that tab could not be reloaded; the browser frees it with the page.
  const tabUrl = useRef<string | null>(null);

  useEffect(() => {
    tabUrl.current = null;
    setDrawingFailed(false);
  }, [file]);

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
          aria-label={t('pdf.openInNewTab')}
          title={t('pdf.openInNewTab')}
          disabled={!file}
          onClick={openInNewTab}
        >
          <OpenInNewIcon />
        </IconButton>
        {/* Not a heading: whatever hosts the viewer heads it with the name. */}
        <Typography variant="subtitle1" component="div" noWrap sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
          {fileName}
        </Typography>
        <IconButton aria-label={closeLabel} title={closeLabel} onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {message ? (
        message
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
