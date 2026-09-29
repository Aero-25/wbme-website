// Makes an ADMIN_USERS entry for the WBME admin login.
//   node scripts/hash-password.mjs <username> '<password>'   (e.g. admin)
// Paste the printed "username": "pbkdf2$..." pair into the ADMIN_USERS secret
// (a JSON object) in Cloudflare Pages -> wbme -> Settings -> Variables and Secrets.
import { webcrypto as crypto } from 'node:crypto';

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("usage: node scripts/hash-password.mjs <username> '<password>'");
  process.exit(1);
}
const iterations = 100000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
const hash = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
const b64u = (b) => Buffer.from(b).toString('base64url');
console.log(JSON.stringify({ [email.trim().toLowerCase()]: `pbkdf2$${iterations}$${b64u(salt)}$${b64u(hash)}` }));
