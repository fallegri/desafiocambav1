import bcrypt from 'bcryptjs'

const ROUNDS = 10

// A fixed hash used to keep login timing constant when the email does not
// exist, so an attacker cannot enumerate accounts by response time.
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8NdY3sYQm8zQnQ7pO5rJbBB0lq5M9O'

export async function hashPassword(plain) {
  return bcrypt.hash(plain, ROUNDS)
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}

export async function burnPasswordTime(plain) {
  try {
    await bcrypt.compare(plain, DUMMY_HASH)
  } catch {
    // Ignore: this call exists only to spend a comparable amount of time.
  }
}
