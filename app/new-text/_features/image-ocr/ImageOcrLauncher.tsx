"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./imageOcr.module.scss";

const ImageOcrDialog = dynamic(() => import("./ImageOcrDialog"), {
  ssr: false,
});

type ImageOcrLauncherProps = {
  disabled?: boolean;
  text: string;
  onTextChange: (text: string) => void;
};

export default function ImageOcrLauncher({
  disabled = false,
  text,
  onTextChange,
}: ImageOcrLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeDialog = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <button
        type="button"
        className={styles.launcher}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen(true)}
      >
        <Image src="/icons/scan-text.svg" width={22} height={22} alt="" />
        <span>Extract from image</span>
      </button>

      {isOpen && createPortal(
        <ImageOcrDialog
          text={text}
          onClose={closeDialog}
          onTextChange={onTextChange}
        />,
        document.body,
      )}
    </>
  );
}
