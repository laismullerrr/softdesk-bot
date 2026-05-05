const { chromium } = require('playwright');
const { google } = require('googleapis');
const stream = require('stream');

// 🔽 valida variáveis obrigatórias
if (!process.env.SOFTDESK_USER || !process.env.SOFTDESK_PASSWORD) {
  console.error('❌ Variáveis de ambiente não definidas!');
  console.log('USER:', process.env.SOFTDESK_USER);
  console.log('PASS:', process.env.SOFTDESK_PASSWORD);
  process.exit(1);
}

if (!process.env.GOOGLE_CREDENTIALS) {
  console.error('❌ GOOGLE_CREDENTIALS não definido!');
  process.exit(1);
}

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
      parents: ['1C0kgl_1odFhH4oTsKj6ng-3uXoWtW7po'], // ID da pasta
    },
    media: {
      mimeType: 'text/csv',
      body: bufferStream,
    },
  });

  console.log('✅ Upload para Google Drive concluído');
}

(async () => {
  try {
    console.log('🚀 Iniciando navegador...');

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ],
    });

    const context = await browser.newContext({
      acceptDownloads: true,
    });

    const page = await context.newPage();

    console.log('🔐 Acessando login...');

    // LOGIN
    await page.goto('https://dettalles.soft4.com.br/login', { waitUntil: 'domcontentloaded' });

    await page.fill('input[name="lg_usuario"]', process.env.SOFTDESK_USER);
    await page.fill('input[name="sh_usuario"]', process.env.SOFTDESK_PASSWORD);

    await Promise.all([
      page.waitForNavigation(),
      page.getByRole('button', { name: 'Atendente' }).click()
    ]);

    console.log('✅ Login realizado');

    // RELATÓRIO
    console.log('📊 Acessando relatório...');

    await page.goto('https://dettalles.soft4.com.br/informacao/assistente-de-relatorio/15/visualizar', {
      waitUntil: 'domcontentloaded'
    });

    await page.waitForSelector('button:has-text("Excel")', { timeout: 15000 });

    console.log('⬇️ Baixando arquivo...');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Excel")')
    ]);

    const fileName = `relatorio_${new Date().toISOString().slice(0, 10)}.csv`;

    const downloadStream = await download.createReadStream();
    const chunks = [];

    for await (const chunk of downloadStream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    console.log('☁️ Enviando para Google Drive...');

    await uploadToDrive(buffer, fileName);

    await browser.close();

    console.log('🎉 Processo finalizado com sucesso');

    process.exit(0);

  } catch (error) {
    console.error('❌ ERRO NO PROCESSO:', error);
    process.exit(1);
  }
})();