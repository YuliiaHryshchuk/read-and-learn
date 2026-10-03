"use client";

import { useEffect, useRef } from "react";
import type { NewTextMode } from "./useMaterialEditor";

export function useEditorViewportHeight(mode: NewTextMode) {
  const editorViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorViewportRef.current;
    if (!editor) return;
    const editorElement = editor;

    let frame = 0;
    let isCurrent = true;
    const main = editorElement.closest("main");
    const header = document.querySelector("body header");
    const footer = document.querySelector("body > footer");

    function updateHeight() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!isCurrent) return;

        const editorTop = editorElement.getBoundingClientRect().top + window.scrollY;
        const mainPaddingBottom = main
          ? Number.parseFloat(getComputedStyle(main).paddingBottom) || 0
          : 0;
        const footerSpace = footer
          ? footer.getBoundingClientRect().height
            + (Number.parseFloat(getComputedStyle(footer).marginTop) || 0)
          : 0;
        const availableHeight = window.innerHeight
          - editorTop
          - mainPaddingBottom
          - footerSpace;

        editorElement.style.setProperty(
          "--editor-viewport-height",
          `${Math.max(320, Math.floor(availableHeight))}px`,
        );
      });
    }

    updateHeight();
    window.addEventListener("resize", updateHeight);

    const observer = new ResizeObserver(updateHeight);
    if (header) observer.observe(header);
    if (footer) observer.observe(footer);
    void document.fonts.ready.then(updateHeight);

    return () => {
      isCurrent = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateHeight);
      observer.disconnect();
    };
  }, [mode]);

  return editorViewportRef;
}
