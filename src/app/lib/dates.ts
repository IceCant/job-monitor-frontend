const HAS_TIMEZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i;

function parseApiDate(value: string) {
  const normalized = HAS_TIMEZONE.test(value) ? value : `${value}Z`;
  return new Date(normalized);
}

export function formatApiDateTime(value: string | null | undefined) {
  if (!value) return "-";

  const date = parseApiDate(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString();
}

