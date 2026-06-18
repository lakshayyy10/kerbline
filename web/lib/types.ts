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

export interface Validation {
  weightRobustness: {
    draws: number;
    perturbation: string;
    spearmanMedian: number;
    spearmanP05: number;
    top20OverlapMedian: number;
    top20OverlapMin: number;
    spearmanEqualWeights: number;
    spearmanVolumeOnly: number;
    topK: number;
  };
  temporalStability: {
    splitDate: string;
    cellsHalf1: number;
    cellsHalf2: number;
    commonCells: number;
    spearman: number;
    topKOverlap: number;
    topK: number;
  };
  convergentValidity: {
    heldOutSignal: string;
    spearman: number;
    note: string;
  };
  concentration: {
    gini: number;
    top5PctShare: number;
    top1PctShare: number;
    cellsForHalf: number;
    totalCells: number;
    cellsForHalfPct: number;
  };
}
