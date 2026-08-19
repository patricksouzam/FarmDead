/**
 * Desliga a narrativa da fazenda (capítulos, pedidos, falas da avó).
 * Uso: npm run story:off
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'js', 'featureFlags.js');
const src = fs.readFileSync(file, 'utf8');
const next = src.replace(
  /export const PAST_STORY_ENABLED = (true|false);/,
  'export const PAST_STORY_ENABLED = false;'
);
if (next === src) {
  console.log('História da fazenda já estava desligada (ou o arquivo mudou de formato).');
  process.exit(0);
}
fs.writeFileSync(file, next);
console.log('História da fazenda desligada. Reinicie o jogo (npm start).');
