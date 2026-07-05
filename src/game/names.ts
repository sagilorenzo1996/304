import { Rng, shuffle } from './deck';
import { Seat } from './types';

const NAME_POOL = [
  'Priya',
  'Arjun',
  'Meera',
  'Karthik',
  'Divya',
  'Rahul',
  'Ananya',
  'Vikram',
  'Sara',
  'Dev',
  'Nisha',
  'Rohan',
  'Kavya',
  'Suresh',
  'Deepa',
  'Anand',
];

/** Random names for the three AI seats; seat 0 stays "You". */
export function randomPlayerNames(rng: Rng = Math.random): Record<Seat, string> {
  const [west, north, east] = shuffle(NAME_POOL, rng);
  return { 0: 'You', 1: west, 2: north, 3: east };
}
