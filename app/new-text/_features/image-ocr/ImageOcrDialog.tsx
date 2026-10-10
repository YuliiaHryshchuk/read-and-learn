"use client";

import { useEffect, useRef } from "react";
import ImageOcrWizard from "./ImageOcrWizard";
import styles from "./imageOcr.module.scss";

type ImageOcrDialogProps = {
  currentText: string;
  maxCharacters: number;
  onTextChange: (text: string) => void;
  onClose: () => void;
};

export default function ImageOcrDialog({
  currentText,
  maxCharacters,
  onTextChange,
  onClose,
}: ImageOcrDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousOverflow = document.documentElement.style.overflow;
    const keepDialogOpen = (event: Event) => event.preventDefault();
    const syncUnexpectedClose = () => onClose();

    dialog.addEventListener("cancel", keepDialogOpen);
    dialog.addEventListener("close", syncUnexpectedClose);
    if (!dialog.open) dialog.showModal();
    document.documentElement.style.overflow = "hidden";

    return () => {
      dialog.removeEventListener("cancel", keepDialogOpen);
      dialog.removeEventListener("close", syncUnexpectedClose);
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="image-ocr-title"
      aria-describedby="image-ocr-description"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <section className={styles.dialogCard}>
        <header className={styles.dialogHeader}>
          <div>
            <h2 id="image-ocr-title" className="text-xl font-bold line-heading">
              Extract text from image
            </h2>
            <p
              id="image-ocr-description"
              className="mt-2 text-muted text-md line-body"
            >
              Add an image to turn the text in it into editable text.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Close image text dialog"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <ImageOcrWizard
          currentText={currentText}
          maxCharacters={maxCharacters}
          onTextChange={onTextChange}
          onClose={onClose}
        />
      </section>
    </dialog>
  );
}
