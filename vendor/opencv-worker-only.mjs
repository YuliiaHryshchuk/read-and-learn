const workerOnlyError = () => {
  throw new Error(
    "Main-thread OpenCV is disabled. PaddleOCR must run in worker mode.",
  );
};

const workerOnlyOpenCv = new Proxy({}, {
  get: workerOnlyError,
  set: workerOnlyError,
});

export default workerOnlyOpenCv;
