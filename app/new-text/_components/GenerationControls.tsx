"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import styles from "../page.module.scss";

type GenerationControlsProps = {
  hasResult: boolean;
  disabled: boolean;
  isLoadingSavedMaterial: boolean;
  isPending: boolean;
  onGenerate: (forceRegenerate?: boolean) => void;
};

export default function GenerationControls({
  hasResult,
  disabled,
  isLoadingSavedMaterial,
  isPending,
  onGenerate,
}: GenerationControlsProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !menuRef.current?.contains(target)) {
        menuRef.current?.removeAttribute("open");
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  if (!hasResult) {
    return (
      <button
        type="button"
        className={`${styles.generate} py-3 px-4 font-semibold cursor-pointer mobile-width-100`}
        onClick={() => onGenerate()}
        disabled={disabled}
      >
        {isLoadingSavedMaterial
          ? "Loading saved text…"
          : isPending
            ? "Generating…"
            : "Generate explanation"}
      </button>
    );
  }

  return (
    <div
      className={`${styles.generateGroup} d-flex position-relative mobile-width-100`}
    >
      <button
        type="button"
        className={`${styles.generate} ${styles.generateMain} flex-1 py-3 px-4 font-semibold cursor-pointer`}
        onClick={() => onGenerate()}
        disabled={disabled}
      >
        {isLoadingSavedMaterial
          ? "Loading saved text…"
          : isPending
            ? "Updating…"
            : "Update explanation"}
      </button>
      <details ref={menuRef} className={styles.generateMenu}>
        <summary
          className={`${styles.generateToggle} d-grid place-items-center height-100 cursor-pointer`}
          aria-label="More generation options"
          aria-disabled={disabled}
          onClick={(event) => {
            if (disabled) event.preventDefault();
          }}
        >
          <Image
            className={styles.generateChevron}
            src="/icons/chevron-down.svg"
            width={18}
            height={18}
            alt=""
          />
        </summary>
        <div className={`${styles.generateMenuPanel} position-absolute p-1`}>
          <button
            type="button"
            className="width-100 p-3 text-left cursor-pointer"
            disabled={disabled}
            onClick={() => {
              menuRef.current?.removeAttribute("open");
              onGenerate(true);
            }}
          >
            Generate again
          </button>
        </div>
      </details>
    </div>
  );
}
