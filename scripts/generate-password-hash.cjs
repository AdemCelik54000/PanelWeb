/* Generates password_salt + password_hash compatible with netlify/lib/_tenants.js

   Usage:
     node scripts/generate-password-hash.cjs Winbarber
*/

const { createPasswordHash } = require("../netlify/lib/_tenants");

const password = process.argv.slice(2).join(" ") || "Winbarber";
const { salt, hash } = createPasswordHash(password);

// Print in a copy/paste friendly format (1 line each).
console.log(`password=${password}`);
console.log(`password_salt=${salt}`);
console.log(`password_hash=${hash}`);

// Optional: machine-readable JSON (uncomment if needed)
// const payload = {
//   password,
//   password_salt: salt,
//   password_hash: hash,
//   algo: {
//     kdf: "pbkdf2",
//     digest: "sha256",
//     iterations: 100000,
//     keylen: 32,
//     encoding: "hex",
//   },
// };
// process.stdout.write(`${JSON.stringify(payload)}\n`);
