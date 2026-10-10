"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import styles from "./imageOcr.module.scss";

const ImageOcrDialog = dynamic(() => import("./ImageOcrDialog"), {
  ssr: false,
});

type ImageOcrLauncherProps = {
  currentText: string;
  maxCharacters: number;
  onTextChange: (text: string) => void;
  disabled?: boolean;
};

export default function ImageOcrLauncher({
  currentText,
  maxCharacters,
  onTextChange,
  disabled = false,
}: ImageOcrLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeDialog = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <button
        type="button"
        className={styles.launcher}
        aria-label="Extract text from image"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title="Extract text from image"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
      >
        <Image src="/icons/scan-text.svg" width={22} height={22} alt="" />
      </button>

      {isOpen && (
        <ImageOcrDialog
          currentText={currentText}
          maxCharacters={maxCharacters}
          onTextChange={onTextChange}
          onClose={closeDialog}
        />
      )}
    </>
  );
}
