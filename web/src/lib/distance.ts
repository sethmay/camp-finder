// Great-circle distance in statute miles. Pure; unit-tested.

const EARTH_RADIUS_MI = 3958.7613;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MI * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}
