import type { HandoffComponentUsage } from '@detroitlabs/fighub-contracts';

export function mergeComponentUsages(
  lists: HandoffComponentUsage[][],
): HandoffComponentUsage[] {
  const merged = new Map<string, HandoffComponentUsage>();

  for (let i = 0; i < lists.length; i++) {
    const list = lists[i];
    for (let j = 0; j < list.length; j++) {
      const usage = list[j];
      const existing = merged.get(usage.name);
      if (existing === undefined) {
        merged.set(usage.name, {
          name: usage.name,
          instances: usage.instances,
          codeConnectUrl: usage.codeConnectUrl,
        });
        continue;
      }

      existing.instances += usage.instances;
      if (
        (existing.codeConnectUrl === undefined || existing.codeConnectUrl === '') &&
        usage.codeConnectUrl !== undefined &&
        usage.codeConnectUrl !== ''
      ) {
        existing.codeConnectUrl = usage.codeConnectUrl;
      }
    }
  }

  const names = Array.from(merged.keys()).sort(function (left, right) {
    return left.localeCompare(right);
  });

  const result: HandoffComponentUsage[] = [];
  for (let i = 0; i < names.length; i++) {
    const entry = merged.get(names[i]);
    if (entry !== undefined) {
      result.push(entry);
    }
  }

  return result;
}

export function mergeTokenLists(lists: string[][]): string[] {
  const union = new Set<string>();
  for (let i = 0; i < lists.length; i++) {
    const list = lists[i];
    for (let j = 0; j < list.length; j++) {
      union.add(list[j]);
    }
  }
  return Array.from(union).sort(function (left, right) {
    return left.localeCompare(right);
  });
}
