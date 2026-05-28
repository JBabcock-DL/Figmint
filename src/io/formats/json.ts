import type { FormattableDocument } from './index';
import { stableStringify } from './stableStringify';

export function serializeJson(doc: FormattableDocument): string {
  return stableStringify(doc, 2);
}
