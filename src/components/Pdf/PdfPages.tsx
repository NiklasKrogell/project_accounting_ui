import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography } from '@mui/material';
import { openPdf, type PdfDocumentHandle, type PdfPageSize } from '../../lib/pdf';

interface PdfPagesProps {
  file: Blob;
  // Names the document for assistive technology (its file name).
  label: string;
  // The document could not be opened or a page could not be drawn. Nothing is
  // shown then; the parent decides what to show instead.
  onError: (error: Error) => void;
}

// Space left around the sheets, in pixels on each side.
const GUTTER = 16;

// How long the pane's width has to stay put before the pages are drawn again
// for it. Until then the pages drawn so far are simply stretched.
const REFIT_DELAY_MS = 150;

// The rules PDF.js's own stylesheet has for its text layer
// (node_modules/pdfjs-dist/web/pdf_viewer.css, `.textLayer`), without the
// search highlights its viewer adds. The layer is a transparent copy of the
// page's text over the canvas: each span is placed and sized by PDF.js through
// the custom properties below, in terms of --total-scale-factor, which every
// sheet sets to its scale. Check these against that file when pdfjs-dist is
// upgraded.
const textLayerSx = {
  '& .textLayer': {
    position: 'absolute',
    inset: 0,
    overflow: 'clip',
    opacity: 1,
    lineHeight: 1,
    textAlign: 'initial',
    letterSpacing: 'normal',
    wordSpacing: 'normal',
    textSizeAdjust: 'none',
    forcedColorAdjust: 'none',
    transformOrigin: '0 0',
    caretColor: 'CanvasText',
    colorScheme: 'only light',
    zIndex: 0,
    '--min-font-size': '1',
    '--text-scale-factor': 'calc(var(--total-scale-factor) * var(--min-font-size))',
    '--min-font-size-inv': 'calc(1 / var(--min-font-size))',
    '& :is(span, br)': {
      color: 'transparent',
      position: 'absolute',
      whiteSpace: 'pre',
      cursor: 'text',
      transformOrigin: '0% 0%',
      userSelect: 'text',
    },
    '& > :not(.markedContent), & .markedContent span:not(.markedContent)': {
      zIndex: 1,
      '--font-height': '0',
      fontSize: 'calc(var(--text-scale-factor) * var(--font-height))',
      '--scale-x': '1',
      '--rotate': '0deg',
      transform: 'rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv))',
    },
    '& .markedContent': { display: 'contents' },
    '& span[role="img"]': { userSelect: 'none', cursor: 'default' },
    '& ::selection': { background: 'rgba(0, 0, 255, 0.25)', color: 'transparent' },
    '& br::selection': { background: 'transparent' },
    // The end of the text, spread under the spans while a selection is being
    // dragged, so that it has somewhere to end between them; without it the
    // selection jumps to the end of the page over every gap.
    '& .endOfContent': {
      display: 'block',
      position: 'absolute',
      inset: '100% 0 0',
      zIndex: 0,
      cursor: 'default',
      userSelect: 'none',
    },
    '&.selecting .endOfContent': { top: 0 },
    // A page that is stored turned: PDF.js lays its text out unturned and
    // marks the layer with the turn to give it.
    '&[data-main-rotation="90"]': { transform: 'rotate(90deg) translateY(-100%)' },
    '&[data-main-rotation="180"]': { transform: 'rotate(180deg) translate(-100%, -100%)' },
    '&[data-main-rotation="270"]': { transform: 'rotate(270deg) translateX(-100%)' },
  },
} as const;

// A PDF drawn by ourselves: its pages one under another, each fitted to the
// width of the pane, with the text selectable. There are no controls: the
// document is scrolled, and anything more is for the browser's own viewer.
export function PdfPages({ file, label, onError }: PdfPagesProps) {
  const { t } = useTranslation();
  const [document, setDocument] = useState<PdfDocumentHandle | null>(null);
  const [sizes, setSizes] = useState<PdfPageSize[] | null>(null);
  // The scrolling pane, as state so the sheets get it once it exists.
  const [pane, setPane] = useState<HTMLDivElement | null>(null);
  // The width the sheets have to fit, 0 until the pane has been measured.
  const [width, setWidth] = useState(0);

  // The parent's handler may be a new function on every render; opening the
  // document must not start over because of that.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const reportError = useCallback((error: unknown) => {
    onErrorRef.current(error instanceof Error ? error : new Error(String(error)));
  }, []);

  useEffect(() => {
    let stale = false;
    let opened: PdfDocumentHandle | null = null;
    setDocument(null);
    setSizes(null);
    openPdf(file)
      .then(async (handle) => {
        opened = handle;
        if (stale) {
          handle.destroy();
          return;
        }
        const pageSizes = await Promise.all(
          Array.from({ length: handle.pageCount }, (_, index) => handle.pageSize(index + 1)),
        );
        if (stale) return;
        setDocument(handle);
        setSizes(pageSizes);
      })
      .catch((err) => {
        if (!stale) reportError(err);
      });
    return () => {
      stale = true;
      opened?.destroy();
    };
  }, [file, reportError]);

  // The first measurement is taken at once; after that a change has to settle
  // (a window being dragged to a new size passes through many widths).
  useEffect(() => {
    if (!pane) return;
    const measure = () => setWidth(Math.max(0, pane.clientWidth - 2 * GUTTER));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    let timer: number | undefined;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(measure, REFIT_DELAY_MS);
    });
    observer.observe(pane);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [pane]);

  return (
    <Box
      ref={setPane}
      role="region"
      aria-label={label}
      tabIndex={0}
      sx={{
        flex: 1,
        minHeight: 0,
        // Always a scrollbar: one that came and went with the pages' height
        // would change the width they are fitted to.
        overflowY: 'scroll',
        overflowX: 'hidden',
        bgcolor: 'grey.200',
        p: `${GUTTER}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: `${GUTTER}px`,
        ...textLayerSx,
      }}
    >
      {document && sizes && width > 0 ? (
        sizes.map((size, index) => (
          <PdfSheet
            key={index}
            document={document}
            pageNumber={index + 1}
            pageCount={sizes.length}
            size={size}
            scale={width / size.width}
            pane={pane}
            onError={reportError}
          />
        ))
      ) : (
        <Typography sx={{ alignSelf: 'flex-start' }}>{t('common.loading')}</Typography>
      )}
    </Box>
  );
}

interface PdfSheetProps {
  document: PdfDocumentHandle;
  pageNumber: number;
  pageCount: number;
  size: PdfPageSize;
  scale: number;
  pane: HTMLDivElement | null;
  onError: (error: unknown) => void;
}

// One page: a white sheet of the page's size at the given scale, holding the
// canvas the page is painted on and, over it, the text layer. It is drawn when
// it comes near the visible part of the pane, and again when the scale has
// changed; between a change of scale and that, what was drawn is stretched.
function PdfSheet({ document, pageNumber, pageCount, size, scale, pane, onError }: PdfSheetProps) {
  const { t } = useTranslation();
  const sheet = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const textLayer = useRef<HTMLDivElement>(null);
  // Without IntersectionObserver every page counts as near, and is drawn.
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined');
  const drawnScale = useRef<number | null>(null);
  // From the mouse going down on the text until it comes up, wherever that is.
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    if (!selecting) return;
    const stop = () => setSelecting(false);
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, [selecting]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || !sheet.current) return;
    // "Near" reaches one pane's height above and below what is visible.
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), {
      root: pane,
      rootMargin: '100% 0px',
    });
    observer.observe(sheet.current);
    return () => observer.disconnect();
  }, [pane]);

  useEffect(() => {
    if (!near || drawnScale.current === scale || !canvas.current || !textLayer.current) return;
    let cancelled = false;
    const render = document.renderPage(pageNumber, {
      canvas: canvas.current,
      textLayer: textLayer.current,
      scale,
      pixelRatio: window.devicePixelRatio || 1,
    });
    render.done.then(
      () => {
        if (!cancelled) drawnScale.current = scale;
      },
      (err) => {
        if (!cancelled) onError(err);
      },
    );
    return () => {
      cancelled = true;
      render.cancel();
    };
  }, [document, pageNumber, scale, near, onError]);

  return (
    <Box
      ref={sheet}
      role="group"
      aria-label={t('pdfViewer.page', { page: pageNumber, count: pageCount })}
      sx={{ position: 'relative', flexShrink: 0, bgcolor: 'common.white', boxShadow: 1 }}
      style={
        {
          width: size.width * scale,
          height: size.height * scale,
          // What PDF.js sizes and places the text layer by.
          '--total-scale-factor': scale,
          '--scale-round-x': '1px',
          '--scale-round-y': '1px',
        } as CSSProperties
      }
    >
      <Box component="canvas" ref={canvas} sx={{ display: 'block', width: '100%', height: '100%' }} />
      {/* Filled by PDF.js; React only owns the element itself. */}
      <div
        ref={textLayer}
        className={selecting ? 'textLayer selecting' : 'textLayer'}
        onMouseDown={() => setSelecting(true)}
      />
    </Box>
  );
}
