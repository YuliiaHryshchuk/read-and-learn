"use client";

import Image from "next/image";
import {
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { getImageFileError, IMAGE_ACCEPT } from "./imageFileValidation";
import styles from "./imageOcr.module.scss";
import { isMobileDevice } from "./mobileDevice";

// Device type is static for the lifetime of the page, so there is nothing to subscribe to. Required for useSyncExternalStore
const subscribeToDeviceType = () => () => {};

function getMobileDeviceSnapshot() {
  return typeof navigator !== "undefined" && isMobileDevice(navigator);
}

function formatFileSize(size: number) {
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export type SelectedImage = {
  file: File;
  previewUrl: string;
};

type ImagePickerProps = {
  selectedImage: SelectedImage | null;
  onSelectedImageChange: (image: SelectedImage | null) => void;
};

export default function ImagePicker({
  selectedImage,
  onSelectedImageChange,
}: ImagePickerProps) {
  const chooseInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const selectionRequestRef = useRef(0);
  const dragDepthRef = useRef(0);
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const isMobile = useSyncExternalStore(
    subscribeToDeviceType,
    getMobileDeviceSnapshot,
    () => false,
  );

  async function selectFiles(files: FileList | File[]) {
    const requestId = ++selectionRequestRef.current;
    setMessage("");

    if (files.length !== 1) {
      setMessage("Choose one image at a time.");
      return;
    }

    const file = files[0];
    const error = await getImageFileError(file);
    if (requestId !== selectionRequestRef.current) return;
    if (error) {
      setMessage(selectedImage
        ? `${error} The previous image is still selected.`
        : error);
      return;
    }

    onSelectedImageChange({
      file,
      previewUrl: URL.createObjectURL(file),
    });
  }

  function selectFromInput(event: ChangeEvent<HTMLInputElement>) {
    const files = event.currentTarget.files;
    if (files) void selectFiles(files);
    event.currentTarget.value = "";
  }

  function removeImage() {
    selectionRequestRef.current += 1;
    onSelectedImageChange(null);
    setMessage("");
  }

  function enterDropzone(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  }

  function leaveDropzone(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragging(false);
    }
  }

  function dropImage(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    void selectFiles(event.dataTransfer.files);
  }

  const inputs = (
    <>
      <input
        ref={chooseInputRef}
        className={styles.fileInput}
        type="file"
        accept={IMAGE_ACCEPT}
        aria-label="Choose image file"
        onChange={selectFromInput}
      />
      {isMobile && (
        <input
          ref={cameraInputRef}
          className={styles.fileInput}
          type="file"
          accept={IMAGE_ACCEPT}
          capture="environment"
          aria-label="Take a photo"
          onChange={selectFromInput}
        />
      )}
    </>
  );

  if (selectedImage) {
    const { file: selectedFile, previewUrl } = selectedImage;
    return (
      <div className={styles.selectedImage}>
        {inputs}
        {message && (
          <p className={`${styles.fileError} text-danger text-sm`} role="alert">
            {message}
          </p>
        )}
        <div className={styles.preview}>
          <Image
            key={previewUrl}
            src={previewUrl}
            alt="Selected image preview"
            fill
            sizes="(max-width: 719px) calc(100vw - 2rem), 480px"
            unoptimized
            onError={() => {
              onSelectedImageChange(null);
              setMessage("This image could not be opened.");
            }}
          />
        </div>
        <div className={styles.fileDetails}>
          <p className="font-semibold line-heading">{selectedFile.name}</p>
          <p className="mt-1 text-muted text-sm">
            {formatFileSize(selectedFile.size)} · JPEG or PNG
          </p>
        </div>
        <div className={styles.selectedActions}>
          <button
            type="button"
            className={`${styles.secondaryButton} button px-5 py-3`}
            onClick={() => chooseInputRef.current?.click()}
          >
            Choose another image
          </button>
          <button
            type="button"
            className={styles.removeButton}
            onClick={removeImage}
          >
            Remove image
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {inputs}
      {message && (
        <p className={`${styles.fileError} text-danger text-sm`} role="alert">
          {message}
        </p>
      )}
      <div
        className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""}`}
        role="region"
        aria-label="Image drop area"
        onDragEnter={enterDropzone}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={leaveDropzone}
        onDrop={dropImage}
      >
        <span className={styles.dropzoneIcon} aria-hidden="true">
          <Image src="/icons/scan-text.svg" width={32} height={32} alt="" />
        </span>
        <p className="mt-4 text-lg font-semibold line-heading">
          Drop an image here
        </p>
        <p className="mt-2 text-muted text-md">or choose how to add it</p>
        <div className={styles.pickerActions}>
          <button
            type="button"
            className="button button-primary px-5 py-3"
            onClick={() => chooseInputRef.current?.click()}
          >
            Choose image
          </button>
          {isMobile && (
            <button
              type="button"
              className={`${styles.secondaryButton} button px-5 py-3`}
              onClick={() => cameraInputRef.current?.click()}
            >
              Take a photo
            </button>
          )}
        </div>
        <p className="mt-4 text-muted text-sm line-body">
          One JPEG, JPG, or PNG image, up to 10 MB. Processed only in your
          browser.
        </p>
      </div>
    </>
  );
}
