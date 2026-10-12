// Drawing a PDF ourselves, instead of handing it to the browser's own viewer
// (which brings its toolbar along). This is all the rest of the app knows of
// it; the engine behind it is Mozilla's PDF.js, kept to src/lib/pdfEngine.ts.
//
// The engine is loaded on first use, as a chunk of its own, so nothing of it
// is in the main bundle. That also keeps it out of the tests: it is ESM-only
// and sets its worker up with import.meta, neither of which Jest can load, so
// a test mocks this module like any API module and the engine is never read.

// A page's size in CSS pixels at scale 1.
export interface PdfPageSize {
  width: number;
  height: number;
}

export interface PdfRenderTarget {
  canvas: HTMLCanvasElement;
  // Filled with the page's text as transparent, selectable spans. Lay it over
  // the canvas, styled as PDF.js expects (see PdfPages).
  textLayer: HTMLElement;
  // CSS pixels per PDF unit: pageSize * scale is the size the page is shown at.
  scale: number;
  // Device pixels per CSS pixel, for a canvas that is sharp on the screen.
  pixelRatio: number;
}

export interface PdfRender {
  // Settles when the page is drawn. A cancelled render resolves too.
  done: Promise<void>;
  cancel: () => void;
}

export interface PdfDocumentHandle {
  pageCount: number;
  // Pages are numbered from 1.
  pageSize: (pageNumber: number) => Promise<PdfPageSize>;
  // Cancel a canvas's render before starting another one on it.
  renderPage: (pageNumber: number, target: PdfRenderTarget) => PdfRender;
  // Frees the document; call it when done with it.
  destroy: () => void;
}

export async function openPdf(file: Blob): Promise<PdfDocumentHandle> {
  const { openDocument } = await import('./pdfEngine');
  return openDocument(file);
}
