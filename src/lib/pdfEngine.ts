// The PDF engine: Mozilla's PDF.js (pdfjs-dist). This is the only file that
// touches it, and it is reached only through src/lib/pdf.ts, which loads it on
// first use.
//
// - The `legacy` build is the one for browsers other than the very latest.
// - The parts of its API used here are described below by hand: the package's
//   own type definitions are written for a newer TypeScript than this
//   project's.
// - A PDF is parsed in a worker and painted on a canvas. Nothing in it is run:
//   no form scripts, no links.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PdfDocumentHandle, PdfRender, PdfRenderTarget } from './pdf';

interface Viewport {
  width: number;
  height: number;
}

interface RenderTask {
  promise: Promise<unknown>;
  cancel: () => void;
}

interface Page {
  getViewport: (params: { scale: number }) => Viewport;
  render: (params: {
    canvas: HTMLCanvasElement;
    viewport: Viewport;
    transform: number[] | null;
  }) => RenderTask;
  streamTextContent: () => ReadableStream;
}

interface LoadedDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<Page>;
}

interface LoadingTask {
  promise: Promise<LoadedDocument>;
  destroy: () => Promise<void>;
}

interface TextLayer {
  render: () => Promise<unknown>;
  cancel: () => void;
}

interface PdfJs {
  GlobalWorkerOptions: { workerPort: Worker | null };
  getDocument: (source: {
    data: ArrayBuffer;
    wasmUrl: string;
    standardFontDataUrl: string;
  }) => LoadingTask;
  TextLayer: new (params: {
    textContentSource: ReadableStream;
    container: HTMLElement;
    viewport: Viewport;
  }) => TextLayer;
}

const engine = pdfjs as unknown as PdfJs;

// The worker that does the parsing, set up as PDF.js's own webpack entry
// (pdfjs-dist/webpack.mjs) does it, but for the legacy build: webpack bundles
// the worker as a chunk of its own.
engine.GlobalWorkerOptions.workerPort = new Worker(
  new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url),
);

// What the worker fetches when a PDF needs it: image decoders and the
// standard fonts, copied to public/pdfjs/ by scripts/copy-pdfjs-assets.js.
// Absolute, because the worker resolves a URL from its own location.
const ASSETS = new URL(`${process.env.PUBLIC_URL}/pdfjs/`, window.location.href).href;

// A canvas of more pixels than this is slow to paint and may not be given by
// the browser at all; a larger page is drawn at a lower pixel ratio instead.
const MAX_CANVAS_PIXELS = 2 ** 24;

// PDF.js refuses to draw on a canvas it is still drawing on, so a render waits
// for the one before it on the same canvas to have ended (it is the caller's
// to cancel it first).
const lastRender = new WeakMap<HTMLCanvasElement, Promise<void>>();

export async function openDocument(file: Blob): Promise<PdfDocumentHandle> {
  const loading = engine.getDocument({
    data: await file.arrayBuffer(),
    wasmUrl: `${ASSETS}wasm/`,
    standardFontDataUrl: `${ASSETS}standard_fonts/`,
  });
  const loaded = await loading.promise;

  const pages = new Map<number, Promise<Page>>();
  const pageOf = (pageNumber: number) => {
    let page = pages.get(pageNumber);
    if (!page) {
      page = loaded.getPage(pageNumber);
      pages.set(pageNumber, page);
    }
    return page;
  };

  function renderPage(pageNumber: number, target: PdfRenderTarget): PdfRender {
    const { canvas, textLayer, scale } = target;
    let cancelled = false;
    let renderTask: RenderTask | null = null;
    let text: TextLayer | null = null;
    const previous = lastRender.get(canvas);

    const done = (async () => {
      const page = await pageOf(pageNumber);
      await previous;
      if (cancelled) return;

      const viewport = page.getViewport({ scale });
      const pixelRatio = Math.min(
        target.pixelRatio,
        Math.sqrt(MAX_CANVAS_PIXELS / (viewport.width * viewport.height)),
      );
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      renderTask = page.render({
        canvas,
        viewport,
        transform: pixelRatio === 1 ? null : [pixelRatio, 0, 0, pixelRatio, 0, 0],
      });

      textLayer.replaceChildren();
      text = new engine.TextLayer({
        textContentSource: page.streamTextContent(),
        container: textLayer,
        viewport,
      });
      await Promise.all([renderTask.promise, text.render()]);

      // What PDF.js's own viewer puts at the end of a text layer: something
      // for a selection to end on when the mouse is over no text (see the
      // `selecting` class in PdfPages).
      const endOfContent = window.document.createElement('div');
      endOfContent.className = 'endOfContent';
      textLayer.append(endOfContent);
    })().catch((err) => {
      // Cancelling ends a render with an error of its own; that is no failure.
      if (!cancelled) throw err;
    });

    lastRender.set(
      canvas,
      done.catch(() => {}),
    );
    return {
      done,
      cancel: () => {
        cancelled = true;
        renderTask?.cancel();
        text?.cancel();
      },
    };
  }

  return {
    pageCount: loaded.numPages,
    async pageSize(pageNumber) {
      const { width, height } = (await pageOf(pageNumber)).getViewport({ scale: 1 });
      return { width, height };
    },
    renderPage,
    destroy: () => {
      // Renders still running end with an error, which their callers have
      // cancelled or no longer wait for.
      void loading.destroy().catch(() => {});
    },
  };
}
