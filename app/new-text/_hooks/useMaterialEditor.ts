"use client";

import { useEffect, useState } from "react";
import { usePuterAuth } from "@/components/PuterAuthProvider";
import { getMaterial } from "@/lib/api/materialsClient";
import { decodeMaterialId } from "@/lib/materialId";
import { useTextStore } from "@/stores/useTextStore";

export type NewTextMode = "create" | "edit";

function getEditingMaterialId() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (segments.length !== 2 || segments[0] !== "edit") return null;

  try {
    return decodeMaterialId(decodeURIComponent(segments[1]));
  } catch {
    return null;
  }
}

export function useMaterialEditor(mode: NewTextMode) {
  const { requireAuthToken } = usePuterAuth();
  const hasHydrated = useTextStore((state) => state.hasHydrated);
  const startEditingMaterial = useTextStore(
    (state) => state.startEditingMaterial,
  );
  const startNewText = useTextStore((state) => state.startNewText);
  const [isLoadingSavedMaterial, setIsLoadingSavedMaterial] = useState(false);
  const [materialMessage, setMaterialMessage] = useState("");

  useEffect(() => {
    if (!hasHydrated) return;
    const currentDraft = useTextStore.getState();
    if (mode === "create") {
      if (currentDraft.editingMaterial) startNewText();
      return;
    }

    const editingMaterialId = getEditingMaterialId();
    if (!editingMaterialId) return;

    if (
      currentDraft.editingMaterial?.id === editingMaterialId
      && currentDraft.result?.kind === "structured"
      && currentDraft.text === currentDraft.result.sourceText
    ) {
      return;
    }

    let isCurrent = true;
    async function loadSavedMaterial() {
      setIsLoadingSavedMaterial(true);
      setMaterialMessage("");
      try {
        const authToken = await requireAuthToken();
        const material = await getMaterial(authToken, editingMaterialId!);
        if (material.id !== editingMaterialId) {
          throw new Error("The material returned an invalid response.");
        }

        if (isCurrent) startEditingMaterial(material);
      } catch (error) {
        if (isCurrent) {
          setMaterialMessage(
            error instanceof Error
              ? error.message
              : "The material could not be loaded.",
          );
        }
      } finally {
        if (isCurrent) setIsLoadingSavedMaterial(false);
      }
    }

    void loadSavedMaterial();
    return () => {
      isCurrent = false;
    };
  }, [
    hasHydrated,
    mode,
    requireAuthToken,
    startEditingMaterial,
    startNewText,
  ]);

  return { isLoadingSavedMaterial, materialMessage };
}
