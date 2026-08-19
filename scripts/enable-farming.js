/**
 * Religa as mecânicas de plantação (canteiros, ferramentas 1–4, colheita).
 * Uso: npm run farming:on
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'js', 'featureFlags.js');
const src = fs.readFileSync(file, 'utf8');
const next = src.replace(
  /export const FARMING_ENABLED = (true|false);/,
  'export const FARMING_ENABLED = true;'
);
if (next === src) {
  console.log('Plantação já estava ligada (ou o arquivo mudou de formato).');
  process.exit(0);
}
fs.writeFileSync(file, next);
console.log('Plantação religada. Reinicie o jogo (npm start).');
