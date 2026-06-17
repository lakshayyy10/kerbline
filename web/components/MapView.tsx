"use client";

import { useEffect, useMemo, useState } from "react";
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { FlyToInterpolator, MapViewState } from "@deck.gl/core";
import { Map } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Hotspot, HeatPoint } from "@/lib/types";
import type { Team } from "@/lib/plan";

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// impact (0-100) -> teal → amber → hot-red
function impactColor(v: number, max: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, v / (max || 1)));
  if (t < 0.5) {
    const k = t / 0.5; // teal -> amber
    return [
      Math.round(45 + k * (255 - 45)),
      Math.round(212 + k * (176 - 212)),
      Math.round(191 + k * (31 - 191)),
    ];
  }
  const k = (t - 0.5) / 0.5; // amber -> hot
  return [
    Math.round(255 + k * (255 - 255)),
    Math.round(176 + k * (61 - 176)),
    Math.round(31 + k * (87 - 31)),
  ];
}

interface Props {
  hotspots: Hotspot[];
  heat: HeatPoint[];
  teams: Team[];
  mode: "heat" | "points" | "deploy";
  maxImpact: number;
  hour: number | null;
  selectedId: number | null;
  activeTeam: number | null;
  focus: { lon: number; lat: number; nonce: number } | null;
  onSelect: (h: Hotspot) => void;
  onTeam: (t: Team) => void;
}

const INITIAL: MapViewState = {
  longitude: 77.5846,
  latitude: 12.9716,
  zoom: 9.9,
  pitch: 12,
  bearing: 0,
};

export default function MapView({
  hotspots,
  heat,
  teams,
  mode,
  maxImpact,
  hour,
  selectedId,
  activeTeam,
  focus,
  onSelect,
  onTeam,
}: Props) {
  const [viewState, setViewState] = useState<MapViewState>(INITIAL);
  const [hover, setHover] = useState<{ x: number; y: number; h: Hotspot } | null>(
    null
  );

  // gentle establishing shot on first mount
  useEffect(() => {
    const t = setTimeout(() => {
      setViewState((vs) => ({
        ...vs,
        zoom: 10.7,
        pitch: 38,
        transitionDuration: 1400,
        transitionInterpolator: new FlyToInterpolator({ speed: 1.2 }),
      }));
    }, 250);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!focus) return;
    setViewState((vs) => ({
      ...vs,
      longitude: focus.lon,
      latitude: focus.lat,
      zoom: Math.max(vs.zoom, 14.2),
      transitionDuration: 1100,
      transitionInterpolator: new FlyToInterpolator({ speed: 1.4 }),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce]);

  const layers = useMemo(() => {
    if (mode === "deploy") {
      return [
        // faint context: every hotspot, dimmed
        new ScatterplotLayer<Hotspot>({
          id: "deploy-context",
          data: hotspots,
          getPosition: (d) => [d.lon, d.lat],
          getRadius: (d) => 40 + Math.sqrt(d.n) * 6,
          radiusMinPixels: 2,
          radiusMaxPixels: 30,
          getFillColor: [120, 140, 160, 38],
          pickable: false,
        }),
        // team coverage halo
        new ScatterplotLayer<Team>({
          id: "team-halo",
          data: teams,
          getPosition: (d) => [d.lon, d.lat],
          getRadius: 520,
          radiusMinPixels: 16,
          radiusMaxPixels: 90,
          transitions: { getRadius: 450, getFillColor: 250 },
          getFillColor: (d) =>
            d.team === activeTeam ? [255, 61, 87, 55] : [255, 176, 31, 38],
          stroked: true,
          getLineColor: (d) =>
            d.team === activeTeam ? [255, 61, 87, 220] : [255, 176, 31, 150],
          getLineWidth: 2,
          lineWidthMinPixels: 1.5,
          pickable: true,
          onClick: (info) => info.object && onTeam(info.object as Team),
          updateTriggers: { getFillColor: [activeTeam], getLineColor: [activeTeam] },
        }),
        // numbered pin
        new TextLayer<Team>({
          id: "team-label",
          data: teams,
          getPosition: (d) => [d.lon, d.lat],
          getText: (d) => String(d.team),
          getSize: 15,
          getColor: [10, 13, 18, 255],
          background: true,
          getBackgroundColor: (d) =>
            d.team === activeTeam ? [255, 61, 87, 255] : [255, 176, 31, 255],
          backgroundPadding: [7, 4],
          getBorderColor: [10, 13, 18, 255],
          getBorderWidth: 1.5,
          fontWeight: 800,
          characterSet: "0123456789",
          pickable: false,
          updateTriggers: { getBackgroundColor: [activeTeam] },
        }),
      ];
    }
    if (mode === "heat") {
      return [
        new HeatmapLayer<HeatPoint>({
          id: "heat",
          data: heat,
          getPosition: (d) => [d[0], d[1]],
          getWeight: (d) => d[2],
          radiusPixels: 46,
          intensity: 1.1,
          threshold: 0.04,
          colorRange: [
            [45, 212, 191, 90],
            [74, 168, 255, 150],
            [255, 176, 31, 200],
            [255, 138, 61, 230],
            [255, 61, 87, 255],
          ],
        }),
      ];
    }
    return [
      new ScatterplotLayer<Hotspot>({
        id: "hotspots",
        data: hotspots,
        getPosition: (d) => [d.lon, d.lat],
        getRadius: (d) =>
          hour === null
            ? 60 + Math.sqrt(d.n) * 9
            : 30 + Math.sqrt(d.hours[hour] || 0) * 26,
        radiusMinPixels: hour === null ? 3 : 0,
        radiusMaxPixels: 60,
        transitions: { getRadius: 380, getFillColor: 380 },
        getFillColor: (d) => {
          const [r, g, b] = impactColor(d.impact, maxImpact);
          if (hour !== null) {
            // fade cells with little/no activity at this hour
            const share = (d.hours[hour] || 0) / Math.max(1, d.n);
            const a = Math.round(40 + Math.min(1, share * 9) * 205);
            return [r, g, b, d.id === selectedId ? 255 : a];
          }
          return [r, g, b, d.id === selectedId ? 255 : 170];
        },
        getLineColor: (d) =>
          d.id === selectedId ? [255, 255, 255, 255] : [10, 13, 18, 120],
        getLineWidth: (d) => (d.id === selectedId ? 3 : 1),
        lineWidthMinPixels: 1,
        stroked: true,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 60],
        onClick: (info) => info.object && onSelect(info.object),
        onHover: (info) =>
          setHover(
            info.object
              ? { x: info.x, y: info.y, h: info.object as Hotspot }
              : null
          ),
        updateTriggers: {
          getRadius: [hour],
          getFillColor: [selectedId, maxImpact, hour],
          getLineColor: [selectedId],
          getLineWidth: [selectedId],
        },
      }),
    ];
  }, [mode, heat, hotspots, teams, maxImpact, hour, selectedId, activeTeam, onSelect, onTeam]);

  return (
    <DeckGL
      viewState={viewState}
      controller={{ doubleClickZoom: false }}
      layers={layers}
      onViewStateChange={(e) => setViewState(e.viewState as MapViewState)}
      getCursor={({ isHovering }) => (isHovering ? "pointer" : "grab")}
    >
      <Map mapStyle={MAP_STYLE} attributionControl={false} />
      {hover && mode === "points" && (
        <div
          className="map-tip"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <div className="map-tip-name">{hover.h.station}</div>
          <div className="map-tip-row">
            <span>Impact</span>
            <b>{hover.h.impact.toFixed(1)}</b>
          </div>
          <div className="map-tip-row">
            <span>Violations</span>
            <b>{hover.h.n.toLocaleString()}</b>
          </div>
        </div>
      )}
    </DeckGL>
  );
}
