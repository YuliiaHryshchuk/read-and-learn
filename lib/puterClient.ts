let puterClientPromise: Promise<
  typeof import("@heyputer/puter.js")["puter"]
> | null = null;

export function getPuterClient() {
  puterClientPromise ??= import("@heyputer/puter.js").then(
    ({ puter }) => puter,
  );
  return puterClientPromise;
}
