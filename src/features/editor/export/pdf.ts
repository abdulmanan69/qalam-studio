/**
 * PDF export with vector outlines (jsPDF + svg2pdf.js, loaded on demand so
 * they never weigh on the editor's start-up). One page per artboard; page
 * size = artboard size at 96 px per inch.
 */

export interface PdfPage {
  svg: string;
  width: number;
  height: number;
}

/** CSS px → PDF points. */
export const PX_TO_PT = 0.75;

export async function renderPdf(pages: readonly PdfPage[], title: string): Promise<Blob> {
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([import('jspdf'), import('svg2pdf.js')]);
  const first = pages[0];
  if (!first) throw new Error('Nothing to export');
  const format = (p: PdfPage): [number, number] => [p.width * PX_TO_PT, p.height * PX_TO_PT];
  const orientation = (p: PdfPage) => (p.width >= p.height ? 'landscape' : 'portrait');
  const doc = new jsPDF({
    unit: 'pt',
    format: format(first),
    orientation: orientation(first),
    compress: true,
  });
  doc.setProperties({ title, creator: 'Qalam Studio' });

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-100000px;top:0;width:0;height:0;overflow:hidden';
  document.body.appendChild(host);
  try {
    for (const [index, page] of pages.entries()) {
      if (index > 0) doc.addPage(format(page), orientation(page));
      host.innerHTML = page.svg;
      const element = host.querySelector('svg');
      if (!element) continue;
      const [w, h] = format(page);
      await svg2pdf(element, doc, { x: 0, y: 0, width: w, height: h });
    }
  } finally {
    host.remove();
  }
  return doc.output('blob');
}
