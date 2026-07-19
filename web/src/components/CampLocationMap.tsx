import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_COLORS, mapStyle } from "@lib/map";

// Single-location map for a camp detail page: one marker, fixed zoom, no clustering.
// scrollZoom is off so the map never traps the page scroll; pan/zoom via the controls.
export default function CampLocationMap({
  lat,
  lon,
  name,
}: {
  lat: number;
  lon: number;
  name: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle(),
      center: [lon, lat],
      zoom: 9,
      scrollZoom: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    new maplibregl.Marker({ color: MAP_COLORS.markerActive }).setLngLat([lon, lat]).addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lon]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-md"
      style={{ filter: "saturate(0.62)" }}
      role="application"
      aria-label={`Map showing the location of ${name}`}
    />
  );
}
