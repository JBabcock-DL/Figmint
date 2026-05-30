export interface SelectionSummary {
  count: number;
  names: string[];
}

export function selectionSummary(selection: readonly { name: string }[]): SelectionSummary {
  const count = selection.length;
  const names: string[] = [];
  const limit = count < 5 ? count : 5;
  for (let i = 0; i < limit; i++) {
    names.push(selection[i].name);
  }
  return { count: count, names: names };
}
