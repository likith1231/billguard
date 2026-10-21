/**
 * Reads the text layer of a PDF in the browser (nothing is uploaded) and rebuilds visual rows,
 * so a tabular bill comes out one line per row. Scanned PDFs have no text layer and return "".
 */
export async function pdfToText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const out: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    const rows = new Map<number, { x: number; w: number; s: string }[]>();
    for (const it of content.items) {
      if (!("str" in it) || !it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 3); // items within ~3pt share a row
      const row = rows.get(y) ?? [];
      row.push({ x: it.transform[4], w: it.width, s: it.str });
      rows.set(y, row);
    }
    for (const y of [...rows.keys()].sort((a, b) => b - a)) {
      const items = rows.get(y)!.sort((a, b) => a.x - b.x);
      let line = "";
      let end = items[0].x;
      for (const it of items) {
        // Words are often separate items; a gap wider than ~2 characters marks a table column.
        const charW = it.w / Math.max(1, it.s.length);
        const gap = it.x - end;
        line += (line ? (gap > charW * 2.2 ? "  " : gap > charW * 0.25 || /^\s/.test(it.s) ? " " : "") : "") + it.s.trim();
        end = it.x + it.w;
      }
      out.push(line);
    }
  }
  return out.join("\n");
}
