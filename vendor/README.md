# Browser runtime vendor files

`onnxruntime-worker-only.mjs` prevents Webpack from bundling the main-thread
ONNX Runtime and its 27 MiB WebGPU/JSEP binary. This application always runs
PaddleOCR in its dedicated worker, whose WASM runtime is served from
`public/ocr/ort`.
