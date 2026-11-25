import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const checksDir = path.join(__dirname, 'checks');
  if (!fs.existsSync(checksDir)) {
    fs.mkdirSync(checksDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  const htmlPath = path.join(__dirname, 'proposal.html');
  const fileUrl = `file://${htmlPath.replace(/\\/g, '/')}`;
  console.log(`Loading: ${fileUrl}`);

  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  // Save PDF with Puppeteer at 1920px x 1080px
  const tempPdfBuffer = await page.pdf({
    width: '1920px',
    height: '1080px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: true
  });

  // Verify and scale with pdf-lib so page sizes are precisely 1920 x 1080 in points
  const pdfDoc = await PDFDocument.load(tempPdfBuffer);
  const pages = pdfDoc.getPages();
  for (const p of pages) {
    p.scale(4/3, 4/3);
  }
  const finalPdfBytes = await pdfDoc.save();
  const pdfPath = path.join(__dirname, 'proposal.pdf');
  fs.writeFileSync(pdfPath, finalPdfBytes);
  console.log(`Saved PDF to: ${pdfPath}`);

  // Screenshot every slide into checks/
  const slides = await page.$$('.slide');
  console.log(`Found ${slides.length} slides. Capturing checks...`);

  for (let i = 0; i < slides.length; i++) {
    const slideNumber = String(i + 1).padStart(2, '0');
    const screenshotPath = path.join(checksDir, `slide-${slideNumber}.png`);
    await slides[i].screenshot({ path: screenshotPath });
    console.log(`Saved screenshot: slide-${slideNumber}.png`);
  }

  await browser.close();
  console.log('PDF generation and slide checks completed successfully.');
}

run().catch((err) => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
