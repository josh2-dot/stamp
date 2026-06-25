export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export function withSuffix(base: string, suffix: string): string {
  const trimmed = base.slice(0, 50).replace(/-+$/g, "");
  return `${trimmed}-${suffix}`;
}
