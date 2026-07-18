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
  const fittedRef = useRef(false);

  // Init once.
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

    map.on("load", () => {
      map.addSource(SRC, { type: "geojson", data: toGeoJSON(ranked), cluster: true, clusterRadius: 45 });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: SRC,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": MAP_COLORS.cluster,
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 25, 28],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FFFFFF",
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: SRC,
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 13 },
        paint: { "text-color": MAP_COLORS.clusterText },
      });
      map.addLayer({
        id: "point",
        type: "circle",
        source: SRC,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 8,
          "circle-color": [
            "case",
            ["==", ["get", "id"], selectedId ?? ""],
            MAP_COLORS.markerActive,
            MAP_COLORS.markerDefault,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FFFFFF",
        },
      });

      map.on("click", "clusters", (e) => {
        const feat = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
        const clusterId = feat.properties?.cluster_id;
        const src = map.getSource(SRC) as maplibregl.GeoJSONSource;
        src.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({ center: (feat.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
        });
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

      for (const layer of ["clusters", "point"]) {
        map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
      }

      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update data on result changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const data = toGeoJSON(ranked);
    src.setData(data);
    if (!fittedRef.current && data.features.length) {
      const bounds = new maplibregl.LngLatBounds();
      for (const f of data.features) bounds.extend((f.geometry as GeoJSON.Point).coordinates as [number, number]);
      map.fitBounds(bounds, { padding: 60, maxZoom: 9, duration: 0 });
      fittedRef.current = true;
    }
  }, [ranked, ready]);

  // Reflect selection: recolor points + fly to the chosen camp.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (map.getLayer("point")) {
      map.setPaintProperty("point", "circle-color", [
        "case",
        ["==", ["get", "id"], selectedId ?? ""],
        MAP_COLORS.markerActive,
        MAP_COLORS.markerDefault,
      ]);
    }
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
      style={{ filter: "saturate(0.62) brightness(1.03)" }}
      role="application"
      aria-label="Map of matching camps. A full list of the same camps is shown alongside."
    />
  );
}
