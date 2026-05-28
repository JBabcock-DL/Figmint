async function loadFontForStyle(family: string, styleName: string): Promise<void> {
  try {
    await figma.loadFontAsync({ family: family, style: styleName });
  } catch {
    try {
      await figma.loadFontAsync({ family: family, style: 'Regular' });
    } catch {
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    }
  }
}

export async function applyTextStyleByName(textNode: TextNode, styleName: string): Promise<void> {
  const styles = await figma.getLocalTextStylesAsync();
  let matched: TextStyle | null = null;
  for (let i = 0; i < styles.length; i++) {
    if (styles[i].name === styleName) {
      matched = styles[i];
      break;
    }
  }
  if (matched === null) {
    throw new Error('Missing text style: ' + styleName);
  }
  await loadFontForStyle(matched.fontName.family, matched.fontName.style);
  textNode.textStyleId = matched.id;
}
