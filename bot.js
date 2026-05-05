const { chromium } = require('playwright');
const { google } = require('googleapis');
const stream = require('stream');

// 🔽 função upload Google Drive
async function uploadToDrive(buffer, fileName) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  const bufferStream = new stream.PassThrough();
  bufferStream.end(buffer);

  await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: 'text/csv',
      parents: ['1C0kgl_1odFhH4oTsKj6ng-3uXoWtW7po'], // 🔥 COLOCA O ID DA PASTA
    },
    media: {
      mimeType: 'text/csv',
      body: bufferStream,
    },
  });

  console.log('Upload para Google Drive concluído');
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    acceptDownloads: true,
  });

  const page = await context.newPage();

  // 🔐 LOGIN
  await page.goto('https://dettalles.soft4.com.br/login');

 await page.fill('input[name="lg_usuario"]', process.env.SOFTDESK_USER);
  await page.fill('input[name="sh_usuario"]', process.env.SOFTDESK_PASSWORD);
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

  // 🔽 pega arquivo em memória (SEM salvar local)
  const downloadStream = await download.createReadStream();
  const chunks = [];

  for await (const chunk of downloadStream) {
    chunks.push(chunk);
  }

  const buffer = Buffer.concat(chunks);

  console.log('Download concluído, enviando para Drive...');

  // ☁️ envia pro Google Drive
  await uploadToDrive(buffer, fileName);

  await browser.close();
})();