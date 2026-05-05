const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const downloadDir = 'C:\\Users\\Lenovo\\Documents\\softdesk-bot\\downloads';
  if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

  const browser = await chromium.launch({ headless: false }); // deixa false pra ver rodando
  const context = await browser.newContext({
    acceptDownloads: true,
  });

  const page = await context.newPage();

  // 🔐 LOGIN
  await page.goto('https://dettalles.soft4.com.br/login');

  await page.fill('input[name="lg_usuario"]', 'lais');
  await page.fill('input[name="sh_usuario"]', 'rMRYZ569!');
  await page.getByRole('button', { name: 'Atendente' }).click();

  await page.waitForLoadState('networkidle');

  // 📊 IR PARA RELATÓRIO
  await page.goto('https://dettalles.soft4.com.br/informacao/assistente-de-relatorio/15/visualizar');

  await page.waitForSelector('button:has-text("Excel")');

  // ⬇️ DOWNLOAD
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Excel")')
  ]);

  const fileName = `relatorio_${new Date().toISOString().slice(0,10)}.csv`;
  const filePath = path.join(downloadDir, fileName);

  await download.saveAs(filePath);

  console.log('Download concluído:', filePath);

  await browser.close();
})();