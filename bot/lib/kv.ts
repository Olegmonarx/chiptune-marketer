import type { JsonObject, JsonValue } from "@grok/agent-sdk";

export function asObject(value: JsonValue | undefined): JsonObject | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return undefined;
}

export function readItems(value: JsonValue | undefined): JsonObject[] {
  const obj = asObject(value);
  const items = obj?.items;
  if (!Array.isArray(items)) return [];
  return items.filter(
    (x): x is JsonObject => !!x && typeof x === "object" && !Array.isArray(x),
  );
}

export function readIds(value: JsonValue | undefined): string[] {
  const obj = asObject(value);
  const ids = obj?.ids;
  if (!Array.isArray(ids)) return [];
  return ids.filter((x): x is string => typeof x === "string");
}
