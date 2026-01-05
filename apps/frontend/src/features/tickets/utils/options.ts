export function normalizeTicketOptionKey(value?: string | null) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

type DefaultableOption = {
  key?: string | null;
  active?: boolean;
  isDefault?: boolean;
};

export function getDefaultTicketOptionKey(items: DefaultableOption[]) {
  const active = (items || []).filter(
    (item) => item?.active !== false && typeof item?.key === "string"
  ) as Array<Required<Pick<DefaultableOption, "key">> & DefaultableOption>;

  const defaultItem = active.find((item) => item.isDefault);
  const explicitNew = active.find((item) => normalizeTicketOptionKey(item.key) === "new");
  return normalizeTicketOptionKey(defaultItem?.key || explicitNew?.key || active[0]?.key || "new");
}

export function createTicketOptionLabelMap(
  items: Array<{ key?: string | null; label?: string | null }> | undefined | null
) {
  const map: Record<string, string> = {};
  (items || []).forEach((item) => {
    const key = normalizeTicketOptionKey(item?.key || "");
    const label = (item?.label || "").trim();
    if (key && label) map[key] = label;
  });
  return map;
}

export function createTicketOptionHoursMap(
  items: Array<{ key?: string | null; nextActionDueHours?: number | null }> | undefined | null
) {
  const map: Record<string, number> = {};
  (items || []).forEach((item) => {
    const key = normalizeTicketOptionKey(item?.key || "");
    const hours = item?.nextActionDueHours;
    if (key && typeof hours === "number") map[key] = hours;
  });
  return map;
}
