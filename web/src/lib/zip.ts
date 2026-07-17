// ZIP -> centroid lookup. Data ships as web/public/data/zip-centroids.json:
// { "format": "[zip,lat,lon]", "zips": [["97005", 45.49, -122.80], ...] }.
// v1 seed covers the launch region; the full ~42k-ZIP dataset replaces it later.

export interface Centroid {
  lat: number;
  lon: number;
}

type ZipTuple = [string, number, number];

let cache: Map<string, Centroid> | null = null;

export function loadCentroids(raw: { zips: ZipTuple[] }): Map<string, Centroid> {
  const map = new Map<string, Centroid>();
  for (const [zip, lat, lon] of raw.zips) map.set(zip, { lat, lon });
  return map;
}

export function setCentroids(map: Map<string, Centroid>): void {
  cache = map;
}

export function zipToCentroid(zip: string): Centroid | null {
  if (!cache) return null;
  const key = zip.trim().slice(0, 5);
  return cache.get(key) ?? null;
}

export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip.trim());
}
