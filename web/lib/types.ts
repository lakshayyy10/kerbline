export interface Meta {
  records: number;
  hotspots: number;
  cells: number;
  stations: number;
  dateStart: string;
  dateEnd: string;
  spanDays: number;
  bbox: [number, number, number, number];
  center: [number, number];
  violationTotals: [string, number][];
  vehicleTotals: [string, number][];
  hourCurve: number[];
  dowCurve: number[];
  topImpact: number;
}

export interface Hotspot {
  id: number;
  lat: number;
  lon: number;
  n: number;
  impact: number;
  severity: number;
  persistence: number;
  junctionShare: number;
  station: string;
  violations: [string, number][];
  vehicles: [string, number][];
  hours: number[];
}

export interface Station {
  name: string;
  n: number;
  impact: number;
  severity: number;
  hotCells: number;
  peakHour: number;
  junctionShare: number;
}

// heat.json is an array of [lon, lat, weight]
export type HeatPoint = [number, number, number];
