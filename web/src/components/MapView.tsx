import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { RankedCamp } from "@lib/types";
import { formatFeeFrom } from "@lib/format";
import { MAP_COLORS, US_CENTER, US_ZOOM, mapStyle } from "@lib/map";
import { withBase } from "@lib/paths";

const SRC = "camps";

function toGeoJSON(ranked: RankedCamp[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: ranked
      .filter((r) => r.camp.lat !== null && r.camp.lon !== null)
      .map((r) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [r.camp.lon as number, r.camp.lat as number] },
        properties: {
          id: r.camp.id,
          name: r.camp.name,
          fee: formatFeeFrom(r.camp.fee_from),
        },
      })),
  };
}

function pointColor(selectedId: string | null): maplibregl.ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "id"], selectedId ?? ""],
    MAP_COLORS.markerActive,
    MAP_COLORS.markerDefault,
  ];
}

export default function MapView({
  ranked,
  selectedId,
  onSelect,
}: {
  ranked: RankedCamp[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const builtRef = useRef(false);

  // Create the map once; the source/layers are added on first data (below).
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle(),
      center: US_CENTER,
      zoom: US_ZOOM,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => setReady(true));

    return () => {
      map.remove();
      mapRef.current = null;
      builtRef.current = false;
      setReady(false);
    };
  }, []);

  // Build the source + point layer on first data, then keep the source in sync.
  // Every camp is its own marker (no clustering: with a few hundred points a
  // clustered GeoJSON source failed to tile at low zoom, so nothing showed until
  // the user zoomed in — the whole point of the map is to see camps immediately).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const data = toGeoJSON(ranked);

    if (builtRef.current) {
      const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
      src?.setData(data);
      return;
    }
    if (!data.features.length) return; // wait until we have camps to show

    map.addSource(SRC, { type: "geojson", data });
    map.addLayer({
      id: "point",
      type: "circle",
      source: SRC,
      paint: {
        "circle-radius": 7,
        "circle-color": pointColor(selectedId),
        "circle-stroke-width": 2,
        "circle-stroke-color": "#FFFFFF",
      },
    });
    // Camp-name labels appear once zoomed past the regional view; MapLibre's collision
    // detection hides overlapping labels, so dense areas stay legible.
    map.addLayer({
      id: "point-label",
      type: "symbol",
      source: SRC,
      minzoom: 6,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 12,
        "text-anchor": "left",
        "text-offset": [0.8, 0],
        "text-max-width": 12,
        "text-optional": true,
      },
      paint: {
        "text-color": MAP_COLORS.markerDefault,
        "text-halo-color": "#FFFFFF",
        "text-halo-width": 1.5,
      },
    });

    map.on("click", "point", (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const props = feat.properties as { id: string; name: string; fee: string };
      onSelect(props.id);
      new maplibregl.Popup({ offset: 12, closeButton: false })
        .setLngLat((feat.geometry as GeoJSON.Point).coordinates as [number, number])
        .setHTML(
          `<div style="font-family:var(--cf-font-sans)">
             <strong>${props.name}</strong><br/>
             <span style="color:var(--cf-muted)">${props.fee}</span><br/>
             <a href="${withBase(`/camps/${props.id}`)}" style="color:var(--cf-primary)">View details →</a>
           </div>`,
        )
        .addTo(map);
    });
    map.on("mouseenter", "point", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "point", () => (map.getCanvas().style.cursor = ""));

    const bounds = new maplibregl.LngLatBounds();
    for (const f of data.features) bounds.extend((f.geometry as GeoJSON.Point).coordinates as [number, number]);
    map.fitBounds(bounds, { padding: 60, maxZoom: 9, duration: 0 });

    builtRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranked, ready]);

  // Reflect selection: recolor points + fly to the chosen camp.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.getLayer("point")) return;
    map.setPaintProperty("point", "circle-color", pointColor(selectedId));
    if (selectedId) {
      const hit = ranked.find((r) => r.camp.id === selectedId);
      if (hit && hit.camp.lat !== null && hit.camp.lon !== null) {
        map.flyTo({ center: [hit.camp.lon, hit.camp.lat], zoom: Math.max(map.getZoom(), 8) });
      }
    }
  }, [selectedId, ranked, ready]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-md"
      style={{ filter: "saturate(0.62)" }}
      role="application"
      aria-label="Map of matching camps. A full list of the same camps is shown alongside."
    />
  );
}
