const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const SHORT_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/u;

export function encodeMaterialId(id: string) {
  if (!UUID_PATTERN.test(id)) return id;

  const hex = id.replaceAll("-", "");
  let binary = "";
  for (let index = 0; index < hex.length; index += 2) {
    binary += String.fromCharCode(Number.parseInt(hex.slice(index, index + 2), 16));
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

export function decodeMaterialId(value: string) {
  if (UUID_PATTERN.test(value)) return value.toLocaleLowerCase("en-US");
  if (!SHORT_ID_PATTERN.test(value)) return null;

  try {
    const base64 = `${value.replaceAll("-", "+").replaceAll("_", "/")}==`;
    const binary = atob(base64);
    if (binary.length !== 16) return null;

    const hex = Array.from(binary, (character) => character
      .charCodeAt(0)
      .toString(16)
      .padStart(2, "0"))
      .join("");

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join("-");
  } catch {
    return null;
  }
}
