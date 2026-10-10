# PP-OCRv6 browser models

These uncompressed model archives are the official PaddleOCR ONNX exports used by
`@paddleocr/paddleocr-js`.

- `PP-OCRv6_small_det_onnx_infer.bin`
- `PP-OCRv6_small_rec_onnx_infer.bin`

The files contain uncompressed TAR archives. They use a `.bin` suffix because
Wrangler's local static server otherwise labels `.tar` responses as gzip without
compressing their bodies, which browsers reject with `ERR_CONTENT_DECODING_FAILED`.

The recognition model is multilingual. A single local copy serves English,
Spanish, French, and German; these are the Latin-script languages currently
shared with the application's explanation-language list.

Source: `https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0/`

SHA-256 checksums:

- detection: `D218F6FBF0F1C23D2161BD6AC7F5EAA6104FA89955C09290497E31008E2618E4`
- recognition: `D267AB077A44A0EEDB1EA8F8C542D263F211DE8E9D7A029BF9FCFFF7E5A88FB1`
