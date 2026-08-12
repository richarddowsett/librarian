const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
  const distDir = path.join(__dirname, 'dist', 'handlers');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const handlers = [
    { entry: 'src/handlers/booksHandler.ts', outfile: 'dist/handlers/books.js' },
    { entry: 'src/handlers/seriesHandler.ts', outfile: 'dist/handlers/series.js' },
    { entry: 'src/handlers/userSeriesStatusHandler.ts', outfile: 'dist/handlers/userSeriesStatus.js' },
    { entry: 'src/handlers/openLibraryHandler.ts', outfile: 'dist/handlers/openLibrary.js' },
    { entry: 'src/handlers/googleBooksHandler.ts', outfile: 'dist/handlers/googleBooks.js' },
    { entry: 'src/handlers/bookshelfAiHandler.ts', outfile: 'dist/handlers/bookshelfAi.js' },
  ];

  for (const h of handlers) {
    await esbuild.build({
      entryPoints: [path.join(__dirname, h.entry)],
      bundle: true,
      minify: false,
      sourcemap: true,
      platform: 'node',
      target: 'node20',
      outfile: path.join(__dirname, h.outfile),
      external: ['@aws-sdk/*'], // Included in AWS Node20 runtime
    });
    console.log(`Bundled ${h.entry} -> ${h.outfile}`);
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
