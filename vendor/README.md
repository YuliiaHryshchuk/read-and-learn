# Browser runtime vendor files

`onnxruntime-worker-only.mjs` prevents Webpack from bundling the main-thread
ONNX Runtime and its 27 MiB WebGPU/JSEP binary.

`opencv-worker-only.mjs` prevents Webpack from bundling a second, main-thread
copy of OpenCV.js. The PaddleOCR package imports OpenCV statically even when
worker mode is enabled.

This application always runs PaddleOCR in its dedicated worker. That worker is
self-contained and still includes OpenCV; its ONNX Runtime WASM files are
served from `public/ocr/ort`.
