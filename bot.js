const { chromium } = require('playwright');
const { google } = require('googleapis');

// 🔽 valida variáveis obrigatórias
if (!process.env.SOFTDESK_USER || !process.env.SOFTDESK_PASSWORD) {
  console.error('❌ Variáveis de ambiente não definidas!');
  process.exit(1);
}

if (!process.env.GOOGLE_CREDENTIALS) {
  console.error('❌ GOOGLE_CREDENTIALS não definido!');
  process.exit(1);
}

// 🔽 função upload Google Drive (STREAM - SEM BUFFER)
async function uploadToDrive(stream, fileName) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: 'text/csv',
      parents: ['1C0kgl_1odFhH4oTsKj6ng-3uXoWtW7po'],
    },
    media: {
      mimeType: 'text/csv',
      body: stream, // 🔥 STREAM DIRETO
    },
  });

  console.log('✅ Upload para Google Drive concluído');
}

(async () => {
  let browser;

  try {
    console.log('🚀 Iniciando navegador...');

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-renderer-backgrounding'
      ],
    });

    const context = await browser.newContext({
      acceptDownloads: true,
    });

    const page = await context.newPage();

    console.log('🔐 Acessando login...');

    await page.goto('https://dettalles.soft4.com.br/login', {
      waitUntil: 'domcontentloaded'
    });

    await page.fill('input[name="lg_usuario"]', process.env.SOFTDESK_USER);
    await page.fill('input[name="sh_usuario"]', process.env.SOFTDESK_PASSWORD);

    await Promise.all([
      page.waitForNavigation(),
      page.getByRole('button', { name: 'Atendente' }).click()
    ]);

    console.log('✅ Login realizado');

    console.log('📊 Acessando relatório...');

    await page.goto(
      'https://dettalles.soft4.com.br/informacao/assistente-de-relatorio/15/visualizar',
      { waitUntil: 'domcontentloaded' }
    );

    await page.waitForSelector('button:has-text("Excel")', {
      timeout: 20000
    });

    console.log('⬇️ Baixando arquivo...');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Excel")')
    ]);

    const fileName = `relatorio_${new Date().toISOString().slice(0, 10)}.csv`;

    console.log('☁️ Enviando para Google Drive...');

    const downloadStream = await download.createReadStream();

    await uploadToDrive(downloadStream, fileName);

    console.log('🎉 Processo finalizado com sucesso');

    await context.close();
    await browser.close();

    process.exit(0);

  } catch (error) {
    console.error('❌ ERRO NO PROCESSO:', error);

    if (browser) {
      await browser.close();
    }

    process.exit(1);
  }
})();