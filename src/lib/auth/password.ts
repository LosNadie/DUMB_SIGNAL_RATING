import bcrypt from 'bcryptjs'

const COST = 10

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST)
}

/**
 * bcryptjs understands the `$2a$`, `$2b$` and `$2y$` prefixes, so hashes
 * imported from the Spring backend (which used Spring Security's BCrypt)
 * keep working without a reset.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false
  try {
    return await bcrypt.compare(plain, hash)
  } catch {
    return false
  }
}
