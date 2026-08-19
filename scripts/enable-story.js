/**
 * Religa a narrativa da fazenda (capítulos, pedidos, falas da avó).
 * Uso: npm run story:on
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'js', 'featureFlags.js');
const src = fs.readFileSync(file, 'utf8');
const next = src.replace(
  /export const PAST_STORY_ENABLED = (true|false);/,
  'export const PAST_STORY_ENABLED = true;'
);
if (next === src) {
  console.log('História da fazenda já estava ligada (ou o arquivo mudou de formato).');
  process.exit(0);
}
fs.writeFileSync(file, next);
console.log('História da fazenda religada. Reinicie o jogo (npm start).');
