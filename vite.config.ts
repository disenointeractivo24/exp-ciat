import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/** Dev-only: receives files from the in-browser OBJ exporter (window.__exportOBJ) and writes them to ./export */
function exportSink(): Plugin {
  return {
    name: 'export-sink',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__export', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        const url = new URL(req.url ?? '', 'http://x');
        const name = (url.searchParams.get('file') ?? '').replace(/[^\w.\-]/g, '_');
        if (!name) { res.statusCode = 400; res.end('missing file'); return; }
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          const rel = name.startsWith('textures__') ? path.join('textures', name.slice('textures__'.length)) : name;
          const file = path.join(path.resolve(__dirname, 'export'), rel);
          fs.mkdirSync(path.dirname(file), { recursive: true });
          let buf = Buffer.concat(chunks);
          if (url.searchParams.get('b64') === '1') buf = Buffer.from(buf.toString('utf8'), 'base64');
          fs.writeFileSync(file, buf);
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), exportSink()],
  base: './', // relative paths: the build works from any GitHub Pages URL
  server: { port: 5173, open: false },
});
