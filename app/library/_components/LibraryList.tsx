"use client";

import { useEffect, useState } from "react";

type MaterialListItem = {
  id: string;
  title: string;
};

function getResponseError(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const message = (payload as { error?: { message?: unknown } }).error?.message;
  return typeof message === "string" ? message : null;
}

export default function LibraryList() {
  const [materials, setMaterials] = useState<MaterialListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function loadMaterials() {
      try {
        const { puter } = await import("@heyputer/puter.js");
        if (!puter.auth.isSignedIn() || !puter.authToken) {
          throw new Error("Log in with Puter to view your library.");
        }

        const response = await fetch("/api/materials", {
          headers: {
            Authorization: `Bearer ${puter.authToken}`,
          },
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            getResponseError(payload) ?? "The library could not be loaded.",
          );
        }

        const loadedMaterials = payload && typeof payload === "object"
          ? (payload as { materials?: unknown }).materials
          : null;
        if (!Array.isArray(loadedMaterials)) {
          throw new Error("The library returned an invalid response.");
        }

        if (isCurrent) {
          setMaterials(
            loadedMaterials.filter(
              (item): item is MaterialListItem => Boolean(
                item
                && typeof item === "object"
                && typeof (item as MaterialListItem).id === "string"
                && typeof (item as MaterialListItem).title === "string",
              ),
            ),
          );
        }
      } catch (error) {
        if (isCurrent) {
          setMessage(
            error instanceof Error
              ? error.message
              : "The library could not be loaded.",
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void loadMaterials();
    return () => {
      isCurrent = false;
    };
  }, []);

  if (isLoading) return <p>Loading…</p>;
  if (message) return <p role="alert">{message}</p>;
  if (materials.length === 0) return <p>Your library is empty.</p>;

  return (
    <ul>
      {materials.map((material) => (
        <li key={material.id}>{material.title}</li>
      ))}
    </ul>
  );
}
