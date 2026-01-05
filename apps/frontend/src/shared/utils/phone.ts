export function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits || null;
}

const COUNTRY_CALLING_CODES: Record<string, string> = {
  US: "+1",
  CA: "+1",
  GB: "+44",
  AU: "+61",
};

export function getCountryCallingCode(country?: string | null): string {
  const key = (country || "").trim().toUpperCase();
  return COUNTRY_CALLING_CODES[key] ?? "+1";
}

export function formatPhoneForDisplay(
  value?: string | null,
  options?: {
    country?: "US";
    includeCountryCode?: boolean;
    emptyDisplay?: string;
  }
): string {
  const raw = value ?? "";
  const digits = raw.replace(/\D/g, "");
  const country = options?.country ?? "US";
  const includeCountryCode = options?.includeCountryCode ?? false;
  const emptyDisplay = options?.emptyDisplay ?? "";

  if (!digits) return emptyDisplay;

  if (country === "US" && digits.length === 10) {
    const area = digits.slice(0, 3);
    const prefix = digits.slice(3, 6);
    const line = digits.slice(6);
    const base = `(${area}) ${prefix}-${line}`;
    return includeCountryCode ? `+1 ${base}` : base;
  }

  return raw || digits;
}

export function getPhoneDisplayAndHref(
  value?: string | null
): { display: string; href?: string } {
  const raw = value ?? "";
  const digits = raw.replace(/\D/g, "");

  if (!digits) {
    return { display: raw || "—" };
  }

  const href = `tel:${digits}`;
  const display = formatPhoneForDisplay(value, { includeCountryCode: true, emptyDisplay: "—" });
  return { display, href };
}
