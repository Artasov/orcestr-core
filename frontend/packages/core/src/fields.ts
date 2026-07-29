import type { ApiFieldError, FieldPathPart } from "./types.js";

export function fieldPathToPointer(path: readonly FieldPathPart[]): string {
  return `/${path
    .map((part) => String(part).replaceAll("~", "~0").replaceAll("/", "~1"))
    .join("/")}`;
}

export function fieldPathToFormName(path: readonly FieldPathPart[]): string {
  return path
    .map((part, index) =>
      typeof part === "number"
        ? `[${part}]`
        : index === 0
          ? part
          : `.${part}`,
    )
    .join("");
}

export function groupFieldErrors(
  fields: readonly ApiFieldError[],
): ReadonlyMap<string, readonly ApiFieldError[]> {
  const grouped = new Map<string, ApiFieldError[]>();
  for (const field of fields) {
    const key = fieldPathToPointer(field.path);
    const group = grouped.get(key);
    if (group) group.push(field);
    else grouped.set(key, [field]);
  }
  return grouped;
}

export function firstFieldError(
  fields: readonly ApiFieldError[],
  path: readonly FieldPathPart[],
): ApiFieldError | undefined {
  const target = fieldPathToPointer(path);
  return fields.find((field) => fieldPathToPointer(field.path) === target);
}

