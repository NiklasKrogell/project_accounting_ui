import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '../../i18n';
import { openPdf, type PdfDocumentHandle, type PdfPageSize } from '../../lib/pdf';
import { PdfPages } from './PdfPages';

// The PDF engine itself can't be loaded by Jest (see src/lib/pdf.ts); what is
// tested here is what PdfPages asks of it.
jest.mock('../../lib/pdf');

const FILE = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
const A4: PdfPageSize = { width: 600, height: 800 };
const RECEIPT: PdfPageSize = { width: 300, height: 300 };

// jsdom lays nothing out, so the pane is given a width here: 632 leaves 600
// for the sheets after the gutter on both sides.
let paneWidth: number;

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => paneWidth,
  });
});

afterAll(() => {
  delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
});

interface FakeRender {
  pageNumber: number;
  scale: number;
  cancel: jest.Mock;
  finish: () => void;
  fail: (error: Error) => void;
}

// A document whose page renders stay unfinished until the test ends them.
function fakePdf(sizes: PdfPageSize[]) {
  const renders: FakeRender[] = [];
  const handle: PdfDocumentHandle = {
    pageCount: sizes.length,
    pageSize: jest.fn(async (pageNumber: number) => sizes[pageNumber - 1]),
    renderPage: jest.fn((pageNumber, target) => {
      let finish!: () => void;
      let fail!: (error: Error) => void;
      const done = new Promise<void>((resolve, reject) => {
        finish = resolve;
        fail = reject;
      });
      const cancel = jest.fn();
      renders.push({ pageNumber, scale: target.scale, cancel, finish, fail });
      return { done, cancel };
    }),
    destroy: jest.fn(),
  };
  return { handle, renders };
}

const drawn = (renders: FakeRender[]) => renders.map(({ pageNumber, scale }) => [pageNumber, scale]);
const sheet = (page: number, count: number) =>
  screen.getByRole('group', { name: `Sivu ${page} / ${count}` });

// jsdom has neither observer. Without them PdfPages measures its pane once and
// draws every page; a test that needs one installs these.
type Listener = (entries: Array<{ isIntersecting: boolean }>) => void;

class FakeResizeObserver {
  static resize: () => void = () => {};
  constructor(callback: () => void) {
    FakeResizeObserver.resize = callback;
  }
  observe() {}
  disconnect() {}
}

class FakeIntersectionObserver {
  static byElement = new Map<Element, Listener>();
  static options: unknown[] = [];
  constructor(
    private listener: Listener,
    options: unknown,
  ) {
    FakeIntersectionObserver.options.push(options);
  }
  observe(element: Element) {
    FakeIntersectionObserver.byElement.set(element, this.listener);
  }
  disconnect() {}
}

const scrollTo = (element: Element, near: boolean) =>
  act(() => FakeIntersectionObserver.byElement.get(element)!([{ isIntersecting: near }]));

type ObserverGlobals = { ResizeObserver?: unknown; IntersectionObserver?: unknown };

beforeEach(() => {
  paneWidth = 632;
});

afterEach(() => {
  delete (window as ObserverGlobals).ResizeObserver;
  delete (window as ObserverGlobals).IntersectionObserver;
  FakeIntersectionObserver.byElement.clear();
  FakeIntersectionObserver.options = [];
});

test('opens the file and lays out a sheet for every page, each fitted to the width of the pane', async () => {
  const { handle, renders } = fakePdf([A4, RECEIPT]);
  jest.mocked(openPdf).mockResolvedValue(handle);
  const onError = jest.fn();
  render(<PdfPages file={FILE} label="tiliote.pdf" onError={onError} />);

  const pane = screen.getByRole('region', { name: 'tiliote.pdf' });
  expect(pane).toHaveTextContent('Ladataan…');
  expect(openPdf).toHaveBeenCalledWith(FILE);

  const first = await screen.findByRole('group', { name: 'Sivu 1 / 2' });
  expect(first).toHaveStyle({ width: '600px', height: '800px' });
  expect(first.style.getPropertyValue('--total-scale-factor')).toBe('1');
  // The narrower page is shown at twice its size, to the same width.
  const second = sheet(2, 2);
  expect(second).toHaveStyle({ width: '600px', height: '600px' });
  expect(second.style.getPropertyValue('--total-scale-factor')).toBe('2');

  expect(drawn(renders)).toEqual([
    [1, 1],
    [2, 2],
  ]);
  expect(handle.renderPage).toHaveBeenCalledWith(1, {
    canvas: first.querySelector('canvas'),
    textLayer: first.querySelector('.textLayer'),
    scale: 1,
    pixelRatio: 1,
  });
  expect(onError).not.toHaveBeenCalled();
});

test('draws the pages again for a new width, once the pane has settled at it', async () => {
  (window as ObserverGlobals).ResizeObserver = FakeResizeObserver;
  const { handle, renders } = fakePdf([A4, A4]);
  jest.mocked(openPdf).mockResolvedValue(handle);
  render(<PdfPages file={FILE} label="tiliote.pdf" onError={jest.fn()} />);
  await screen.findByRole('group', { name: 'Sivu 1 / 2' });
  expect(drawn(renders)).toEqual([
    [1, 1],
    [2, 1],
  ]);
  // The first page is drawn; the second is still being drawn.
  await act(async () => renders[0].finish());

  paneWidth = 332;
  act(() => FakeResizeObserver.resize());
  // Not at once: a pane being dragged passes through many widths.
  expect(sheet(1, 2)).toHaveStyle({ width: '600px' });

  await waitFor(() => expect(sheet(1, 2)).toHaveStyle({ width: '300px', height: '400px' }));
  expect(drawn(renders).slice(2)).toEqual([
    [1, 0.5],
    [2, 0.5],
  ]);
  expect(renders[1].cancel).toHaveBeenCalled();
});

test('draws a page when it comes near the visible part of the pane, and once for a scale', async () => {
  (window as ObserverGlobals).IntersectionObserver = FakeIntersectionObserver;
  const { handle, renders } = fakePdf([A4, A4, A4]);
  jest.mocked(openPdf).mockResolvedValue(handle);
  render(<PdfPages file={FILE} label="tiliote.pdf" onError={jest.fn()} />);
  await screen.findByRole('group', { name: 'Sivu 1 / 3' });

  // Sheets are there for the scrollbar to be right, but nothing is drawn yet.
  expect(renders).toEqual([]);
  const pane = screen.getByRole('region', { name: 'tiliote.pdf' });
  expect(FakeIntersectionObserver.options[0]).toEqual({ root: pane, rootMargin: '100% 0px' });

  scrollTo(sheet(2, 3), true);
  expect(drawn(renders)).toEqual([[2, 1]]);

  // Scrolled away while still being drawn: given up, and started over later.
  scrollTo(sheet(2, 3), false);
  expect(renders[0].cancel).toHaveBeenCalled();
  scrollTo(sheet(2, 3), true);
  expect(drawn(renders)).toEqual([
    [2, 1],
    [2, 1],
  ]);

  // Once drawn, coming back to it draws nothing.
  await act(async () => renders[1].finish());
  scrollTo(sheet(2, 3), false);
  scrollTo(sheet(2, 3), true);
  expect(renders).toHaveLength(2);
});

test('marks a text layer as being selected in from mouse down until the mouse comes up anywhere', async () => {
  const { handle } = fakePdf([A4]);
  jest.mocked(openPdf).mockResolvedValue(handle);
  render(<PdfPages file={FILE} label="tiliote.pdf" onError={jest.fn()} />);
  const textLayer = (await screen.findByRole('group', { name: 'Sivu 1 / 1' })).querySelector('.textLayer')!;
  expect(textLayer).not.toHaveClass('selecting');

  fireEvent.mouseDown(textLayer);
  expect(textLayer).toHaveClass('textLayer', 'selecting');
  fireEvent.mouseUp(window);
  expect(textLayer).not.toHaveClass('selecting');
});

test('frees the document when it is unmounted, giving up what was being drawn', async () => {
  const { handle, renders } = fakePdf([A4]);
  jest.mocked(openPdf).mockResolvedValue(handle);
  const { unmount } = render(<PdfPages file={FILE} label="tiliote.pdf" onError={jest.fn()} />);
  await screen.findByRole('group', { name: 'Sivu 1 / 1' });
  expect(handle.destroy).not.toHaveBeenCalled();

  unmount();
  expect(renders[0].cancel).toHaveBeenCalled();
  expect(handle.destroy).toHaveBeenCalledTimes(1);
});

test('starts over with another file, freeing the one before', async () => {
  const first = fakePdf([A4]);
  const second = fakePdf([A4, A4]);
  jest.mocked(openPdf).mockResolvedValueOnce(first.handle).mockResolvedValueOnce(second.handle);
  const onError = jest.fn();
  const { rerender } = render(<PdfPages file={FILE} label="syyskuu.pdf" onError={onError} />);
  await screen.findByRole('group', { name: 'Sivu 1 / 1' });

  const other = new Blob(['%PDF-1.7'], { type: 'application/pdf' });
  rerender(<PdfPages file={other} label="elokuu.pdf" onError={onError} />);

  expect(await screen.findByRole('group', { name: 'Sivu 2 / 2' })).toBeInTheDocument();
  expect(openPdf).toHaveBeenLastCalledWith(other);
  expect(first.handle.destroy).toHaveBeenCalledTimes(1);
  expect(second.handle.destroy).not.toHaveBeenCalled();
  expect(screen.getByRole('region', { name: 'elokuu.pdf' })).toBeInTheDocument();
});

test('frees a document that finished opening after its file was replaced', async () => {
  const late = fakePdf([A4]);
  const current = fakePdf([A4, A4]);
  let finishOpening!: (handle: PdfDocumentHandle) => void;
  jest
    .mocked(openPdf)
    .mockReturnValueOnce(new Promise((resolve) => (finishOpening = resolve)))
    .mockResolvedValueOnce(current.handle);
  const { rerender } = render(<PdfPages file={FILE} label="syyskuu.pdf" onError={jest.fn()} />);
  rerender(<PdfPages file={new Blob(['%PDF-1.7'])} label="elokuu.pdf" onError={jest.fn()} />);
  await screen.findByRole('group', { name: 'Sivu 1 / 2' });

  await act(async () => finishOpening(late.handle));
  expect(late.handle.destroy).toHaveBeenCalledTimes(1);
  expect(late.handle.renderPage).not.toHaveBeenCalled();
  expect(sheet(2, 2)).toBeInTheDocument();
});

test("reports a file that can't be opened", async () => {
  jest.mocked(openPdf).mockRejectedValue(new Error('Invalid PDF structure'));
  const onError = jest.fn();
  render(<PdfPages file={FILE} label="tiliote.pdf" onError={onError} />);

  await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  expect(onError.mock.calls[0][0]).toEqual(new Error('Invalid PDF structure'));
  expect(screen.queryByRole('group')).not.toBeInTheDocument();
});

test("reports a page that can't be drawn", async () => {
  const { handle, renders } = fakePdf([A4]);
  jest.mocked(openPdf).mockResolvedValue(handle);
  const onError = jest.fn();
  render(<PdfPages file={FILE} label="tiliote.pdf" onError={onError} />);
  await screen.findByRole('group', { name: 'Sivu 1 / 1' });

  await act(async () => renders[0].fail(new Error('Unknown image format')));
  expect(onError).toHaveBeenCalledWith(new Error('Unknown image format'));
});
