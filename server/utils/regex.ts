/**
 * Escapes special regex characters in a string to safely use it in RegExp constructors
 * or MongoDB $regex queries without risking ReDoS or regex syntax errors.
 */
export function escapeRegex(input: string): string {
  if (!input || typeof input !== 'string') return ''
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
