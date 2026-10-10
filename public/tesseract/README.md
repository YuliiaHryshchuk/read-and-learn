# Local Tesseract.js runtime

These browser assets are copied from the installed `tesseract.js@7.0.0` and
`tesseract.js-core@7.0.0` packages. They allow the OCR worker and LSTM WASM core
to load from this application instead of a CDN.

The application configuration lives in
`app/new-text/_features/image-ocr/tesseractRuntime.ts`.

Only the LSTM core variants are included because Tesseract.js uses LSTM-only
mode by default. The standard, SIMD, and relaxed-SIMD variants cover the browser
capabilities selected by Tesseract.js at runtime.
