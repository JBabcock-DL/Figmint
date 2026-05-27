/** Lowercase slash path → kebab segments joined by `-`. */
export function toKebabPath(name: string): string {
  return name.toLowerCase().replace(/\//g, '-');
}

export function isPresent(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== '';
}

/** Lowercase a path segment and split embedded hyphens into dot segments. */
export function splitIosSegments(segment: string): string[] {
  return segment.toLowerCase().split('-');
}
