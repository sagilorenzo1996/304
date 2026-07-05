import { Rng, shuffle } from './deck';
import { Seat } from './types';

/** A mix of Sri Lankan, Indian, and English first names. */
const NAME_POOL = [
  // Sri Lankan
  'Kasun',
  'Nimali',
  'Chamara',
  'Tharindu',
  'Sanduni',
  'Nuwan',
  // Indian
  'Priya',
  'Arjun',
  'Meera',
  'Karthik',
  'Divya',
  'Vikram',
  // English
  'James',
  'Emma',
  'Oliver',
  'Charlotte',
  'Henry',
  'Grace',
];

/** Random names for the three AI seats; seat 0 stays "You". */
export function randomPlayerNames(rng: Rng = Math.random): Record<Seat, string> {
  const [west, north, east] = shuffle(NAME_POOL, rng);
  return { 0: 'You', 1: west, 2: north, 3: east };
}
