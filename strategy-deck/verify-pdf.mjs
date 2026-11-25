import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function check() {
  const pdfBytes = fs.readFileSync('proposal.pdf');
  const doc = await PDFDocument.load(pdfBytes);
  const pages = doc.getPages();
  console.log('Total pages:', pages.length);
  let allMatch = true;
  pages.forEach((page, idx) => {
    const { width, height } = page.getSize();
    console.log(`Page ${idx + 1}: ${width} x ${height}`);
    if (width !== 1920 || height !== 1080) {
      allMatch = false;
    }
  });
  console.log('All pages 1920x1080:', allMatch);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
