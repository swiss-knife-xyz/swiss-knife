/** XNS labels and namespaces each follow the registry's 1–20 character rules. */
export function isXnsName(value: string): boolean {
  const parts = value.split("@");
  return parts.length === 2 && parts.every((part) =>
    part.length >= 1 && part.length <= 20 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part)
  );
}
