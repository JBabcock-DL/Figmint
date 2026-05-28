export function truncateUnknown(value: unknown, maxLen = 120): string {
  const text = JSON.stringify(value);
  if (text.length <= maxLen) {
    return text;
  }
  return `${text.slice(0, maxLen - 1)}…`;
}

export function renderMetaBullets(fields: Record<string, string | undefined>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      lines.push(`- ${key}: ${value}`);
    }
  }
  return lines.join('\n');
}

export function renderGfmTable(headers: string[], rows: string[][]): string {
  if (headers.length === 0) {
    return '';
  }
  const separator = headers.map(() => '---');
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ];
  return lines.join('\n');
}
