# Tesseract language data

Local LSTM language models for Tesseract.js. The worker is configured with
`langPath: "/tessdata"` in
`app/new-text/_features/image-ocr/tesseractRuntime.ts`; gzip support is enabled.

Sources:

- `eng.traineddata.gz`: https://github.com/naptha/tessdata/raw/gh-pages/4.0.0_best_int/eng.traineddata.gz
- `rus.traineddata.gz`: https://github.com/naptha/tessdata/raw/gh-pages/4.0.0_best_int/rus.traineddata.gz

SHA-256:

- `eng.traineddata.gz`: `45B4CB346724AC1774F1C36F42F182B887BCDB28EBE63E6FFF90AC41F3FCFF91`
- `rus.traineddata.gz`: `F51F5EDC992249FF9B70A227B22F242DFA47B2B1BBC7AE0EA74908640C101F6A`
