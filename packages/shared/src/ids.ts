import { customAlphabet } from 'nanoid'

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'
const nanoid = customAlphabet(alphabet, 12)

export function createId(prefix?: string): string {
  const id = nanoid()
  return prefix ? `${prefix}_${id}` : id
}
