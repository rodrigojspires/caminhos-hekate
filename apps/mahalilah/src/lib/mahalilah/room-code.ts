import { customAlphabet } from 'nanoid'

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const generator = customAlphabet(alphabet, 6)

export function generateRoomCode() {
  return generator()
}
