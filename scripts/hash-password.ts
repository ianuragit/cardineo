/**
 * Generate a bcrypt hash for the clinic password.
 * Usage: npm run hash-password -- "yourClinicPassword"
 */
import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run hash-password -- "yourClinicPassword"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log("\nAdd this to your .env as CLINIC_PASSWORD_HASH:\n");
console.log(`CLINIC_PASSWORD_HASH="${hash}"\n`);
