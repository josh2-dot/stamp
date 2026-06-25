export function koboToNaira(kobo: number): number {
  return Math.round(kobo) / 100;
}

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function formatNaira(kobo: number): string {
  return `₦${koboToNaira(kobo).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) {
    return `+234 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

export function validateNigerianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) return true;
  if (digits.startsWith("0") && digits.length === 11) return true;
  return false;
}

export function makeReference(prefix = "STAMP"): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rnd}`.toUpperCase();
}
