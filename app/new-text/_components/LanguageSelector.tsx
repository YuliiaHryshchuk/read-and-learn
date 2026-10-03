"use client";

import { useEffect, useRef } from "react";
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
        menuRef.current?.removeAttribute("open");
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  return (
    <div
      className={`${styles.languageSelector} d-flex align-items-center gap-2 text-default`}
    >
      <span>Explanation language:</span>
      <details ref={menuRef} className={styles.languageMenu}>
        <summary
          className={`${styles.languageSummary} d-inline-flex align-items-center gap-2 cursor-pointer font-semibold`}
          aria-label={`Explanation language: ${effectiveLanguage || "not selected"}`}
          aria-disabled={disabled}
          onClick={(event) => {
            if (disabled) event.preventDefault();
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
          <label className="visually-hidden" htmlFor="explanation-language">
            Explanation language
          </label>
          <input
            id="explanation-language"
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
                  menuRef.current?.removeAttribute("open");
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
        </div>
      </details>
    </div>
  );
}
