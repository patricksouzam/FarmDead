/**
 * Desliga as mecânicas de plantação.
 * Uso: npm run farming:off
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'js', 'featureFlags.js');
const src = fs.readFileSync(file, 'utf8');
const next = src.replace(
  /export const FARMING_ENABLED = (true|false);/,
  'export const FARMING_ENABLED = false;'
);
if (next === src) {
  console.log('Plantação já estava desligada (ou o arquivo mudou de formato).');
  process.exit(0);
}
fs.writeFileSync(file, next);
console.log('Plantação desligada. Reinicie o jogo (npm start).');
