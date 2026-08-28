import http from 'http';
import { container } from './config/container';
import { BooksController } from './adapters/inbound/http/booksController';
import { SeriesController } from './adapters/inbound/http/seriesController';
import { UserSeriesStatusController } from './adapters/inbound/http/userSeriesStatusController';
import { GoogleBooksController } from './adapters/inbound/http/googleBooksController';
import { OpenLibraryController } from './adapters/inbound/http/openLibraryController';
import { BookshelfAiController } from './adapters/inbound/http/bookshelfAiController';

const PORT = Number(process.env.PORT) || 8080;

const booksController = new BooksController(container.bookUseCases);
const seriesController = new SeriesController(container.seriesUseCases);
const userSeriesStatusController = new UserSeriesStatusController(container.userStatusUseCases);
const googleBooksController = new GoogleBooksController(container.externalCatalogUseCases);
const openLibraryController = new OpenLibraryController(container.externalCatalogUseCases);
const bookshelfAiController = new BookshelfAiController(container.bookshelfAiUseCases);

async function adaptLambdaEvent(req: http.IncomingMessage, body: string) {
  const urlParts = (req.url || '/').split('?');
  const path = urlParts[0];
  const queryStringParameters: Record<string, string> = {};

  if (urlParts[1]) {
    const params = new URLSearchParams(urlParts[1]);
    params.forEach((value, key) => {
      queryStringParameters[key] = value;
    });
  }

  return {
    rawPath: path,
    headers: req.headers as Record<string, string>,
    queryStringParameters,
    requestContext: {
      http: {
        method: req.method || 'GET',
        path,
      },
    },
    body: body || null,
  } as any;
}

const server = http.createServer(async (req, res) => {
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', async () => {
    const path = (req.url || '/').split('?')[0];
    const event = await adaptLambdaEvent(req, body);

    try {
      let response: any = null;

      if (path.startsWith('/bookshelf')) {
        response = await bookshelfAiController.handleRequest(event);
      } else if (path.startsWith('/google-books')) {
        response = await googleBooksController.handleRequest(event);
      } else if (path.startsWith('/open-library')) {
        response = await openLibraryController.handleRequest(event);
      } else if (path.startsWith('/user-series-status')) {
        response = await userSeriesStatusController.handleRequest(event);
      } else if (path.startsWith('/series')) {
        response = await seriesController.handleRequest(event);
      } else if (path.startsWith('/books')) {
        response = await booksController.handleRequest(event);
      } else if (path === '/health' || path === '/') {
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'shelfd-backend' }));
        return;
      } else {
        res.writeHead(404, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Endpoint not found' }));
        return;
      }

      const headers = { ...corsHeaders, ...(response.headers || {}) };
      res.writeHead(response.statusCode || 200, headers);
      res.end(response.body || '');
    } catch (err: any) {
      console.error('Server Handler Error:', err);
      res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }));
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Shelfd Cloud Run backend server running on port ${PORT}`);
});
