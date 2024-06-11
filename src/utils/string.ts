import { shuffle } from 'lodash';

export function makeRandom(length: number, opts: Partial<{ prefix: string; suffix: string }> = {}) {
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  characters = shuffle(characters.split('')).join('');
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  const { prefix = '', suffix = '' } = opts;
  return prefix + result + suffix;
}
