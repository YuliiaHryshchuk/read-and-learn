# Browser runtime vendor files

`ort.bundle.min.mjs` is copied unchanged from `onnxruntime-web@1.30.0`. PaddleOCR's
generated worker refers to this entry by filename, so both Next.js bundlers need a
stable project-relative path for it.
