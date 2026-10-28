/**
 * The town's plan. One pedestrian street runs from the start (z = +40) towards -z; the eight project
 * buildings stand along it, alternating sides, with their fronts on the building line (x = ±9). Past
 * the last one the street opens onto a plaza that ends at a balustrade above a city in the valley.
 *
 * Inside a building, positions are written as u (along the street, + towards the start, 0 at the
 * door) and d (depth from the front wall), so one layout works on either side of the street.
 */

export const LINE = 9;
export const SHOP = { half: 12, depth: 18, floor: 5.6 };
export const SHOPS = 8;
export const PLAZA = { z0: -246, z1: -284, half: 30 };
export const START_Z = 40;

export const shopSide = (i: number) => (i % 2 === 0 ? -1 : 1);
export const shopZ = (i: number) => -12 - i * 30;

/** World x and z of a point inside shop i. */
export function shopPoint(i: number, u: number, d: number): [number, number] {
  return [shopSide(i) * (LINE + d), shopZ(i) + u];
}
