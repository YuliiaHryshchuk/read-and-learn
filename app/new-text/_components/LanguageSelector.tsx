"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  EXPLANATION_LANGUAGES,
  MAX_TARGET_LANGUAGE_LENGTH,
} from "@/lib/languages";
import styles from "../page.module.scss";

type LanguageSelectorProps = {
  value: string;
  disabled: boolean;
  onChange: (language: string) => void;
};

export default function LanguageSelector({
  value,
  disabled,
  onChange,
}: LanguageSelectorProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false);
  const effectiveLanguage = value.trim();
  const isCustomLanguage = Boolean(effectiveLanguage)
    && !EXPLANATION_LANGUAGES.some(
      (language) =>
        language.toLocaleLowerCase("en-US")
        === effectiveLanguage.toLocaleLowerCase("en-US"),
    );

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !menuRef.current?.contains(target)) {
        setIsDesktopMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!isMobileDialogOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousOverflow = document.documentElement.style.overflow;
    const desktopQuery = window.matchMedia("(min-width: 720px)");
    const closeOnDesktop = () => {
      if (desktopQuery.matches) setIsMobileDialogOpen(false);
    };

    dialog.showModal();
    dialog.focus();
    document.documentElement.style.overflow = "hidden";
    desktopQuery.addEventListener("change", closeOnDesktop);

    return () => {
      desktopQuery.removeEventListener("change", closeOnDesktop);
      document.documentElement.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [isMobileDialogOpen]);

  function renderLanguageControls(
    inputId: string,
    closeAfterSelection: () => void,
  ) {
    return (
      <>
        <label className="visually-hidden" htmlFor={inputId}>
          Explanation language
        </label>
        <input
          id={inputId}
          className="form-control width-100"
          type="text"
          value={value}
          maxLength={MAX_TARGET_LANGUAGE_LENGTH}
          placeholder="Type any language"
          autoComplete="off"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <div className={`${styles.languageOptions} d-grid gap-1 mt-2`}>
          {EXPLANATION_LANGUAGES.map((language) => (
            <button
              key={language}
              type="button"
              className="width-100 p-2 text-left cursor-pointer"
              aria-pressed={
                language.toLocaleLowerCase("en-US")
                === effectiveLanguage.toLocaleLowerCase("en-US")
              }
              disabled={disabled}
              onClick={() => {
                onChange(language);
                closeAfterSelection();
              }}
            >
              {language}
            </button>
          ))}
        </div>
        {isCustomLanguage && (
          <p
            className={`${styles.languageWarning} d-flex gap-2 mt-3 text-sm line-body`}
          >
            <span aria-hidden="true">⚠</span>
            <span>
              Results for languages outside the list may be unsatisfactory.
            </span>
          </p>
        )}
      </>
    );
  }

  function closeMobileDialogOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) setIsMobileDialogOpen(false);
  }

  function closeDesktopMenu() {
    setIsDesktopMenuOpen(false);
  }

  return (
    <div
      className={`${styles.languageSelector} d-flex align-items-center gap-2 text-default`}
    >
      <span>Explanation language:</span>
      <details
        ref={menuRef}
        className={`${styles.languageMenu} ${styles.desktopLanguageMenu}`}
        open={isDesktopMenuOpen}
      >
        <summary
          className={`${styles.languageSummary} d-inline-flex align-items-center gap-2 cursor-pointer font-semibold`}
          aria-label={`Explanation language: ${effectiveLanguage || "not selected"}`}
          aria-disabled={disabled}
          onClick={(event) => {
            event.preventDefault();
            if (!disabled) setIsDesktopMenuOpen((isOpen) => !isOpen);
          }}
        >
          <span>{effectiveLanguage || "Choose language"}</span>
          {isCustomLanguage && (
            <span
              className={styles.languageWarningIcon}
              title="Results for languages outside the list may be unsatisfactory."
              aria-label="Custom language warning"
            >
              ⚠
            </span>
          )}
        </summary>
        <div className={`${styles.languageMenuPanel} position-absolute p-3`}>
          {renderLanguageControls(
            "explanation-language",
            closeDesktopMenu,
          )}
        </div>
      </details>

      <button
        className={`${styles.languageSummary} ${styles.mobileLanguageSummary} align-items-center gap-2 cursor-pointer font-semibold`}
        type="button"
        aria-label={`Choose explanation language: ${effectiveLanguage || "not selected"}`}
        aria-haspopup="dialog"
        aria-expanded={isMobileDialogOpen}
        disabled={disabled}
        onClick={() => setIsMobileDialogOpen(true)}
      >
        <span>{effectiveLanguage || "Choose language"}</span>
        {isCustomLanguage && (
          <span
            className={styles.languageWarningIcon}
            title="Results for languages outside the list may be unsatisfactory."
            aria-hidden="true"
          >
            ⚠
          </span>
        )}
      </button>

      {isMobileDialogOpen && (
        <dialog
          ref={dialogRef}
          className={styles.languageDialog}
          aria-labelledby="language-dialog-title"
          tabIndex={-1}
          onClick={closeMobileDialogOnBackdrop}
          onCancel={(event) => {
            event.preventDefault();
            setIsMobileDialogOpen(false);
          }}
        >
          <section className={styles.languageDialogCard}>
            <header className="d-flex align-items-center justify-content-between gap-4 mb-4">
              <h2 id="language-dialog-title" className="m-0 text-xl font-bold line-heading">
                Explanation language
              </h2>
              <button
                className={`${styles.languageDialogClose} d-grid place-items-center flex-none cursor-pointer`}
                type="button"
                aria-label="Close language selection"
                onClick={() => setIsMobileDialogOpen(false)}
              >
                ×
              </button>
            </header>
            {renderLanguageControls(
              "mobile-explanation-language",
              () => setIsMobileDialogOpen(false),
            )}
          </section>
        </dialog>
      )}
    </div>
  );
}
