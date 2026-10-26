import Dropdown, { type Option } from "react-dropdown";
import styles from "./imageOcr.module.scss";
import {
  isOcrLanguage,
  OCR_LANGUAGES,
  type OcrLanguage,
} from "./ocrLanguages";

type LanguageSelectionStepProps = {
  value: OcrLanguage | "";
  onChange: (language: OcrLanguage | "") => void;
};

const LANGUAGE_OPTIONS: Option[] = OCR_LANGUAGES;

export default function LanguageSelectionStep({
  value,
  onChange,
}: LanguageSelectionStepProps) {
  return (
    <section className={styles.languageStep} aria-labelledby="language-step-title">
      <h3 id="language-step-title" className="text-lg font-semibold line-heading">
        Choose the image language
      </h3>
      <p className="mt-2 text-muted text-md line-body">
        Select the language used in the image to improve recognition accuracy.
      </p>
      <label
        id="image-ocr-language-label"
        className={`${styles.languageLabel} mt-5 font-semibold line-heading`}
      >
        Text language
      </label>
      <Dropdown
        id="image-ocr-language"
        aria-labelledby="image-ocr-language-label"
        baseClassName="OcrLanguageDropdown"
        className={`${styles.languageDropdown} mt-2`}
        controlClassName={styles.languageDropdownControl}
        placeholderClassName={styles.languageDropdownValue}
        menuClassName={styles.languageDropdownMenu}
        optionClassName={styles.languageDropdownOption}
        arrowClosed={<span className={styles.languageDropdownArrow} />}
        arrowOpen={(
          <span
            className={`${styles.languageDropdownArrow} ${styles.languageDropdownArrowOpen}`}
          />
        )}
        options={LANGUAGE_OPTIONS}
        placeholder="Choose language"
        value={value || null}
        onChange={(option) => {
          const language = String(option.value);
          onChange(isOcrLanguage(language) ? language : "");
        }}
      />
    </section>
  );
}

