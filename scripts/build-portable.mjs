import { build } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
await build({ configLoader: 'runner' });
let html = await readFile('dist/index.html', 'utf8');
for (const match of [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g)]) {
  const js = await readFile(`dist/${match[1].replace(/^\.\//, '')}`, 'utf8');
  html = html.replace(match[0], '');
  html = html.replace('</body>', () => `<script>${js.replace(/<\/script/gi, '<\\/script')}</script></body>`);
}
for (const match of [...html.matchAll(/<link[^>]*href="([^"]+\.css)"[^>]*>/g)]) {
  const css = await readFile(`dist/${match[1].replace(/^\.\//, '')}`, 'utf8');
  html = html.replace(match[0], () => `<style>${css}</style>`);
}
await writeFile('质粒图谱.html', html);
await writeFile('Plasmid-Demo.html', html);
console.log('Created 质粒图谱.html — double-click to open, no Node.js required.');
