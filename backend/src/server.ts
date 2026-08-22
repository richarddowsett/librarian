import http from 'http';
import { handler as booksHandler } from './handlers/booksHandler';
import { handler as seriesHandler } from './handlers/seriesHandler';
import { handler as userSeriesStatusHandler } from './handlers/userSeriesStatusHandler';
import { handler as openLibraryHandler } from './handlers/openLibraryHandler';
import { handler as googleBooksHandler } from './handlers/googleBooksHandler';
import { handler as bookshelfAiHandler } from './handlers/bookshelfAiHandler';

const PORT = Number(process.env.PORT) || 8080;

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
        response = await bookshelfAiHandler(event);
      } else if (path.startsWith('/google-books')) {
        response = await googleBooksHandler(event);
      } else if (path.startsWith('/open-library')) {
        response = await openLibraryHandler(event);
      } else if (path.startsWith('/user-series-status')) {
        response = await userSeriesStatusHandler(event);
      } else if (path.startsWith('/series')) {
        response = await seriesHandler(event);
      } else if (path.startsWith('/books')) {
        response = await booksHandler(event);
      } else if (path === '/health' || path === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'shelfd-backend' }));
        return;
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Endpoint not found' }));
        return;
      }

      const headers = response.headers || {};
      res.writeHead(response.statusCode || 200, headers);
      res.end(response.body || '');
    } catch (err: any) {
      console.error('Server Handler Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }));
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Shelfd Cloud Run backend server running on port ${PORT}`);
});
