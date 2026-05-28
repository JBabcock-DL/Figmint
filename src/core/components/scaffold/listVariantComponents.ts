export function listVariantComponents(componentSet: ComponentSetNode): ComponentNode[] {
  const variants: ComponentNode[] = [];

  for (let i = 0; i < componentSet.children.length; i++) {
    const child = componentSet.children[i];
    if (child.type === 'COMPONENT') {
      variants.push(child as ComponentNode);
    }
  }

  return variants;
}
