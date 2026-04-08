import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'

function anthropicProxy() {
  return {
    name: 'anthropic-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405);
          res.end('Method not allowed');
          return;
        }

        const env = loadEnv('', process.cwd(), '');
        const apiKey = env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set in .env' }));
          return;
        }

        let body = '';
        for await (const chunk of req) body += chunk;

        try {
          const upstream = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body,
          });
          const data = await upstream.text();
          res.writeHead(upstream.status, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(data);
        } catch (e) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Proxy error: ' + e.message }));
        }
      });

      // Handle file parsing for document ingestion
      server.middlewares.use('/api/parse', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405);
          res.end('Method not allowed');
          return;
        }

        let body = '';
        for await (const chunk of req) body += chunk;

        try {
          const { filename, content } = JSON.parse(body);
          // For text-based files, just return content as-is
          // Binary parsing (PDF, XLSX, DOCX) would need additional packages
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ filename, text: content }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Parse error: ' + e.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), anthropicProxy()],
})
