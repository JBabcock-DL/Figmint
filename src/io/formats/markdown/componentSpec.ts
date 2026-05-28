import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';

import { renderGfmTable } from './shared';

function formatDefault(value: string | number | boolean | undefined): string {
  if (value === undefined) {
    return '—';
  }
  return String(value);
}

function formatEnum(values: (string | number | boolean)[] | undefined): string {
  if (!values || values.length === 0) {
    return '—';
  }
  return values.map(String).join(', ');
}

export function renderComponentSpecMarkdown(doc: ComponentSpecV1): string {
  const sections: string[] = [`# component-spec v1`, ''];

  const headerParts = [`**Name:** ${doc.name}`, `**Framework:** ${doc.framework}`];
  if (doc.category) {
    headerParts.push(`**Category:** ${doc.category}`);
  }
  if (doc.archetype) {
    headerParts.push(`**Archetype:** ${doc.archetype}`);
  }
  sections.push(headerParts.join(' · '));
  sections.push('');

  const variantKeys = Object.keys(doc.variantMatrix).sort();
  if (variantKeys.length > 0) {
    sections.push('## Variant matrix');
    sections.push('');
    const variantRows = variantKeys.map((key) => [
      key,
      doc.variantMatrix[key].map(String).join(', '),
    ]);
    sections.push(renderGfmTable(['Variant', 'Values'], variantRows));
    sections.push('');
  }

  if (doc.props.length > 0) {
    sections.push('## Props');
    sections.push('');
    const propRows = [...doc.props]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((prop) => [
        prop.name,
        prop.type,
        formatDefault(prop.default),
        formatEnum(prop.enum),
      ]);
    sections.push(renderGfmTable(['name', 'type', 'default', 'enum'], propRows));
    sections.push('');
  }

  if (doc.bindings.length > 0) {
    sections.push('## Bindings');
    sections.push('');
    const bindingRows = [...doc.bindings]
      .sort((a, b) => a.selector.localeCompare(b.selector))
      .map((binding) => [binding.selector, binding.variable]);
    sections.push(renderGfmTable(['selector', 'variable'], bindingRows));
    sections.push('');
  }

  sections.push('## Layout');
  sections.push('');
  sections.push(
    renderGfmTable(
      ['Property', 'Value'],
      [
        ['direction', doc.layout.direction],
        ['gap', doc.layout.gap],
        ['padding', doc.layout.padding ?? '—'],
        ['horizontal sizing', doc.layout.sizing.horizontal],
        ['vertical sizing', doc.layout.sizing.vertical],
      ],
    ),
  );
  sections.push('');

  if (doc.subComponents && doc.subComponents.length > 0) {
    sections.push('## Subcomponents');
    sections.push('');
    for (const sub of doc.subComponents) {
      sections.push(`- ${sub.name} → ${sub.registryRef}`);
    }
    sections.push('');
  }

  if (doc.confidence?.unresolved && doc.confidence.unresolved.length > 0) {
    sections.push('## Unresolved');
    sections.push('');
    for (const item of doc.confidence.unresolved) {
      sections.push(`- ${item}`);
    }
    sections.push('');
  }

  return sections.join('\n').trimEnd() + '\n';
}
