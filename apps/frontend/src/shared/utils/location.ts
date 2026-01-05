export function formatCityState(
  city?: string | null,
  state?: string | null,
  empty = "—"
) {
  const cityText = (city || "").trim();
  const stateText = (state || "").trim();
  const joined = [cityText, stateText].filter(Boolean).join(", ");
  return joined || empty;
}

