const workerOnlyError = () => {
  throw new Error(
    "Main-thread ONNX Runtime is disabled. PaddleOCR must run in worker mode.",
  );
};

export const env = { wasm: {} };

export class Tensor {
  constructor() {
    workerOnlyError();
  }
}

export const InferenceSession = {
  create: workerOnlyError,
};
