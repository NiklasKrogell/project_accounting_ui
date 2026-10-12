// Copies the files PDF.js fetches while it runs from node_modules into
// public/pdfjs/, where the dev server and the build serve them from (see
// src/lib/pdfEngine.ts). Run before `npm start` and `npm run build`, so the
// copies always match the installed pdfjs-dist; the folder is not committed.
const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist');
const target = path.join(__dirname, '..', 'public', 'pdfjs');

fs.rmSync(target, { recursive: true, force: true });

// The decoders for JBIG2 and JPEG 2000 images (what scanned pages are often
// made of) and for colour profiles. The QuickJS sandbox in the same folder
// runs scripts embedded in PDF forms, which we never do.
fs.cpSync(path.join(source, 'wasm'), path.join(target, 'wasm'), {
  recursive: true,
  filter: (file) => !path.basename(file).startsWith('quickjs'),
});

// The 14 standard fonts a PDF may use without embedding them.
fs.cpSync(path.join(source, 'standard_fonts'), path.join(target, 'standard_fonts'), {
  recursive: true,
});
