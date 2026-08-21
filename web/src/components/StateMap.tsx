import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_COLORS, mapStyle, muteBasemap } from "@lib/map";
import { withBase } from "@lib/paths";

// Small camp map for a state or region landing page. Uses the same circle-dot + count-pill +
// collision-label rendering as the search map (MapView): dots overlap gracefully at a wide
// region zoom where teardrop markers would blob, co-located reservation camps collapse to one
// pill, and camp labels appear once zoomed in. scrollZoom is off so the map never traps the
// page scroll — pan/zoom via the controls; clicking a pin opens a popup linking to the camp(s).

const SRC = "camps";

export interface MapCamp {
  id: string;
  name: string;
  lat: number;
  lon: number;
  reservation: { id: string; name: string | null } | null;
}

interface Member {
  id: string;
  name: string;
}
interface Group {
  lat: number;
  lon: number;
  name: string;
  count: number;
  members: Member[];
}

// Camps sharing a reservation collapse to one pin at their centroid so co-located camps don't
// stack into one indistinguishable dot (mirrors the search map).
function groupCamps(camps: MapCamp[]): Group[] {
  const byKey = new Map<string, MapCamp[]>();
  for (const c of camps) {
    const key = c.reservation?.id ?? c.id;
    const arr = byKey.get(key);
    if (arr) arr.push(c);
    else byKey.set(key, [c]);
  }
  const groups: Group[] = [];
  for (const members of byKey.values()) {
    const lat = members.reduce((s, m) => s + m.lat, 0) / members.length;
    const lon = members.reduce((s, m) => s + m.lon, 0) / members.length;
    const resName = members[0].reservation?.name ?? null;
    const name = members.length > 1 ? (resName ?? `${members.length} camps`) : members[0].name;
    groups.push({
      lat,
      lon,
      name,
      count: members.length,
      members: members.map((m) => ({ id: m.id, name: m.name })),
    });
  }
  return groups;
}

function toGeoJSON(groups: Group[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: groups.map((g) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [g.lon, g.lat] },
      properties: { name: g.name, count: g.count, members: JSON.stringify(g.members) },
    })),
  };
}

const IS_SINGLE: maplibregl.ExpressionSpecification = ["==", ["get", "count"], 1];
const IS_GROUP: maplibregl.ExpressionSpecification = [">", ["get", "count"], 1];

export default function StateMap({ camps, label }: { camps: MapCamp[]; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || camps.length === 0) return;
    const data = toGeoJSON(groupCamps(camps));
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle(),
      center: (data.features[0].geometry as GeoJSON.Point).coordinates as [number, number],
      zoom: 4,
      scrollZoom: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      muteBasemap(map);
      map.addSource(SRC, { type: "geojson", data });

      map.addLayer({
        id: "point",
        type: "circle",
        source: SRC,
        filter: IS_SINGLE,
        paint: {
          "circle-radius": 7,
          "circle-color": MAP_COLORS.markerDefault,
          "circle-stroke-width": 2,
          "circle-stroke-color": MAP_COLORS.markerStroke,
        },
      });
      map.addLayer({
        id: "cluster",
        type: "circle",
        source: SRC,
        filter: IS_GROUP,
        paint: {
          "circle-radius": 12,
          "circle-color": MAP_COLORS.cluster,
          "circle-stroke-width": 2,
          "circle-stroke-color": MAP_COLORS.markerStroke,
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: SRC,
        filter: IS_GROUP,
        layout: {
          "text-field": ["to-string", ["get", "count"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
          "text-allow-overlap": true,
        },
        paint: { "text-color": MAP_COLORS.clusterText },
      });
      map.addLayer({
        id: "point-label",
        type: "symbol",
        source: SRC,
        filter: IS_SINGLE,
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
          "text-halo-color": MAP_COLORS.labelHalo,
          "text-halo-width": 1.5,
        },
      });

      const openPopup = (e: maplibregl.MapLayerMouseEvent) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const props = feat.properties as { name: string; members: string };
        const members = JSON.parse(props.members) as Member[];
        // DOM nodes with textContent, never interpolated HTML (matches MapView).
        const content = document.createElement("div");
        content.className = "font-body text-foreground";
        const title = document.createElement("strong");
        title.className = "display";
        title.textContent = props.name;
        content.append(title, document.createElement("br"));
        const single = members.length === 1;
        members.forEach((m, i) => {
          if (i > 0) content.append(document.createElement("br"));
          const link = document.createElement("a");
          link.className = "text-primary";
          link.href = withBase(`/camps/${m.id}`);
          link.textContent = single ? "View details →" : `${m.name} →`;
          content.append(link);
        });
        new maplibregl.Popup({ offset: 14, closeButton: false })
          .setLngLat((feat.geometry as GeoJSON.Point).coordinates as [number, number])
          .setDOMContent(content)
          .addTo(map);
      };
      for (const id of ["point", "cluster"] as const) {
        map.on("click", id, openPopup);
        map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
      }

      const bounds = new maplibregl.LngLatBounds();
      for (const f of data.features) {
        bounds.extend((f.geometry as GeoJSON.Point).coordinates as [number, number]);
      }
      map.fitBounds(bounds, { padding: 48, maxZoom: 9, duration: 0 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [camps]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-muted"
      role="application"
      aria-label={`Map of Scouts BSA camps in ${label}`}
    />
  );
}
