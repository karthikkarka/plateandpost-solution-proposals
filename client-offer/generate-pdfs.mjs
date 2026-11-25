import puppeteer from '../proposal/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import { PDFDocument } from '../proposal/node_modules/pdf-lib/cjs/index.js';
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

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none']
  });

  const page = await browser.newPage();

  // 1. Render Presentation Deck (1920x1080)
  console.log('\n--- Generating Proposal Deck (1920x1080) ---');
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  const deckHtmlPath = path.join(__dirname, 'deck.html');
  const deckUrl = `file://${deckHtmlPath.replace(/\\/g, '/')}`;
  await page.goto(deckUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const deckPdfBuffer = await page.pdf({
    width: '1920px',
    height: '1080px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: true
  });

  // Scale with pdf-lib so page sizes are precisely 1920 x 1080 points
  const deckDoc = await PDFDocument.load(deckPdfBuffer);
  const deckPages = deckDoc.getPages();
  for (const p of deckPages) {
    p.scale(4/3, 4/3);
  }
  const finalDeckBytes = await deckDoc.save();
  const deckPdfPath = path.join(__dirname, 'PlateAndPost-Proposal-Deck.pdf');
  fs.writeFileSync(deckPdfPath, finalDeckBytes);
  console.log(`Saved Deck PDF: ${deckPdfPath}`);

  // Screenshot each slide for visual check
  const slides = await page.$$('.slide');
  console.log(`Found ${slides.length} slides. Capturing checks...`);
  for (let i = 0; i < slides.length; i++) {
    const num = String(i + 1).padStart(2, '0');
    const screenshotPath = path.join(checksDir, `deck-slide-${num}.png`);
    await slides[i].screenshot({ path: screenshotPath });
    console.log(`Saved check: deck-slide-${num}.png`);
  }

  // 2. Render One-Page A4 Executive Offer
  console.log('\n--- Generating A4 Executive One-Page Offer ---');
  await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 1 });
  const onepagerHtmlPath = path.join(__dirname, 'onepager.html');
  const onepagerUrl = `file://${onepagerHtmlPath.replace(/\\/g, '/')}`;
  await page.goto(onepagerUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const onepagerPdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '12mm', right: '14mm', bottom: '12mm', left: '14mm' }
  });

  const onepagerPdfPath = path.join(__dirname, 'PlateAndPost-One-Page-Offer.pdf');
  fs.writeFileSync(onepagerPdfPath, onepagerPdfBuffer);
  console.log(`Saved One-Pager PDF: ${onepagerPdfPath}`);

  const onepagerDoc = await PDFDocument.load(onepagerPdfBuffer);
  console.log(`One-Pager PDF has ${onepagerDoc.getPageCount()} page(s).`);

  const onepagerElement = await page.$('.page');
  if (onepagerElement) {
    const screenshotPath = path.join(checksDir, 'onepager-preview.png');
    await onepagerElement.screenshot({ path: screenshotPath });
    console.log(`Saved check: onepager-preview.png`);
  }

  await browser.close();
  console.log('\nAll PDFs generated and visual checks completed successfully.');
}

run().catch((err) => {
  console.error('Error generating PDFs:', err);
  process.exit(1);
});
