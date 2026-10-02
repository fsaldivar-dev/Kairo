import type { DiagramNode, NodeLayout } from './types';
import { shapeText } from './shapes';

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const graphemes = (text: string) => Array.from(segmenter.segment(text), part => part.segment);
// Conservative, deterministic advance estimate; shared with server-side SVG exports (no font/DOM dependency).
const advance = (character: string) => /[\p{Extended_Pictographic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(character) ? 2 : /[WM@%#&]/.test(character) ? 1.6 : 1;

/** Wrap plain text without splitting a grapheme. Explicit newlines are retained; overflow is ellipsised. */
export function wrapLabel(text: string, width: number, maxLines = 3): string[] {
  const capacity = Math.max(1, (Number.isFinite(width) ? width : 1) / (13 * .61));
  const limit = Math.max(1, Math.min(100, Math.floor(maxLines) || 1));
  const lines: string[] = [];
  let line: string[] = [], used = 0, overflow = false;
  const push = () => { lines.push(line.join('')); line = []; used = 0; return lines.length < limit; };
  outer: for (const [index, paragraph] of text.replace(/\r\n?/g, '\n').split('\n').entries()) {
    if (index && !push()) { overflow = true; break; }
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      const chars = graphemes(word), size = chars.reduce((sum, char) => sum + advance(char), 0);
      if (line.length && used + 1 + size > capacity) {
        if (!push()) { overflow = true; break outer; }
      } else if (line.length) { line.push(' '); used++; }
      for (const char of chars) {
        if (used + advance(char) > capacity && line.length && !push()) { overflow = true; break outer; }
        line.push(char); used += advance(char);
      }
    }
  }
  if (!overflow) lines.push(line.join(''));
  if (overflow) {
    const last = graphemes(lines.at(-1) ?? '');
    let size = last.reduce((sum, char) => sum + advance(char), 0);
    while (last.length && size + 1 > capacity) size -= advance(last.pop()!);
    lines[lines.length - 1] = last.join('').trimEnd() + '…';
  }
  return lines;
}

export interface NodeLabelLayout { lines: string[]; x: number; y: number; lineHeight: number; typeY: number; sourceY: number; width: number }

/** Presentation only: never changes the node, its size or the document history. */
export function layoutNodeLabel(node: Pick<DiagramNode, 'title' | 'source'>, box: Readonly<NodeLayout>): NodeLabelLayout {
  const compact = !!box.shape && box.shape !== 'rectangle', area = shapeText(box);
  const available = compact ? (box.height * .5 - 28) : box.height - (node.source ? 88 : 66);
  const maxLines = Math.max(1, Math.min(compact ? (box.shape === 'triangle' ? 1 : 2) : 3, 1 + Math.floor(available / 16)));
  // A diamond narrows above its centre; reserve the upper title's full line height.
  const width = compact ? Math.min(area.width, box.shape === 'diamond' ? box.width * Math.max(.15, 1 - 2 * (16 + (maxLines - 1) * 16) / box.height) - 12 : area.width) : box.width - 72;
  const lines = wrapLabel(node.title, width, maxLines), extra = (lines.length - 1) * 16;
  const shift = compact ? 0 : Math.max(0, (node.source ? 78 : 57) + extra - box.height + 10);
  return { lines, x: compact ? box.width / 2 : 56, y: compact ? area.y - 3 - extra : 35 - shift,
    lineHeight: 16, typeY: compact ? area.y + 15 : 57 + extra - shift, sourceY: 78 + extra - shift, width };
}
