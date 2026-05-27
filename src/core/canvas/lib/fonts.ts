const CANVAS_FONT_FAMILIES = ['Inter', 'Roboto Mono', 'SF Mono'];
const CANVAS_FONT_STYLES = ['Regular', 'Medium', 'Italic', 'Bold'];

let fontsLoaded = false;

/** Load Inter + mono families once per plugin session (matches legacy `_lib.js`). */
export async function loadFontsForCanvas(): Promise<void> {
  if (fontsLoaded) {
    return;
  }
  const jobs: Promise<void>[] = [];
  for (let fi = 0; fi < CANVAS_FONT_FAMILIES.length; fi++) {
    const family = CANVAS_FONT_FAMILIES[fi];
    for (let si = 0; si < CANVAS_FONT_STYLES.length; si++) {
      const style = CANVAS_FONT_STYLES[si];
      jobs.push(
        figma.loadFontAsync({ family: family, style: style }).catch(function () {
          return undefined;
        }),
      );
    }
  }
  await Promise.all(jobs);
  fontsLoaded = true;
}

/** Test-only reset — allows spy assertions on second call. */
export function resetFontsLoadedForTests(): void {
  fontsLoaded = false;
}
