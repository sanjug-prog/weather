import {
  WeatherRecord,
  EnrichedWeatherRecord,
  AnomalyResult,
  AnomalyCategory,
  SeverityLevel,
  SensorHealthResponse,
} from "./types.js";

export const FEATURE_NAMES = [
  "temperature",
  "pressure",
  "humidity",
  "wind_speed",
  "cloudiness",
  "rainfall",
  "visibility",
] as const;

type FeatureName = (typeof FEATURE_NAMES)[number];

interface TreeNode {
  isLeaf: boolean;
  size: number;
  splitFeature?: FeatureName;
  splitValue?: number;
  left?: TreeNode;
  right?: TreeNode;
}

class IsolationTree {
  root: TreeNode;

  constructor(data: WeatherRecord[], maxDepth: number) {
    this.root = this.buildTree(data, 0, maxDepth);
  }

  private buildTree(data: WeatherRecord[], currentDepth: number, maxDepth: number): TreeNode {
    const n = data.length;
    if (currentDepth >= maxDepth || n <= 1) {
      return { isLeaf: true, size: n };
    }

    // Select random feature
    const feature = FEATURE_NAMES[Math.floor(Math.random() * FEATURE_NAMES.length)];
    const values = data.map((d) => d[feature]);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    if (minVal === maxVal) {
      return { isLeaf: true, size: n };
    }

    // Random uniform split point between min and max
    const splitValue = minVal + Math.random() * (maxVal - minVal);

    const leftData: WeatherRecord[] = [];
    const rightData: WeatherRecord[] = [];

    for (const item of data) {
      if (item[feature] < splitValue) {
        leftData.push(item);
      } else {
        rightData.push(item);
      }
    }

    if (leftData.length === 0 || rightData.length === 0) {
      return { isLeaf: true, size: n };
    }

    return {
      isLeaf: false,
      size: n,
      splitFeature: feature,
      splitValue,
      left: this.buildTree(leftData, currentDepth + 1, maxDepth),
      right: this.buildTree(rightData, currentDepth + 1, maxDepth),
    };
  }

  pathLength(record: WeatherRecord, node: TreeNode = this.root, currentLength: number = 0): number {
    if (node.isLeaf) {
      return currentLength + averagePathLength(node.size);
    }

    const feature = node.splitFeature!;
    const val = record[feature];

    if (val < node.splitValue!) {
      return node.left
        ? this.pathLength(record, node.left, currentLength + 1)
        : currentLength + 1;
    } else {
      return node.right
        ? this.pathLength(record, node.right, currentLength + 1)
        : currentLength + 1;
    }
  }
}

/**
 * Theoretical average path length of unsuccessful searches in a Binary Search Tree:
 * c(n) = 2*(ln(n - 1) + 0.5772156649) - 2*(n - 1)/n
 */
function averagePathLength(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  const eulerMascheroni = 0.5772156649;
  return 2.0 * (Math.log(n - 1) + eulerMascheroni) - (2.0 * (n - 1)) / n;
}

export class IsolationForestDetector {
  private trees: IsolationTree[] = [];
  private numTrees: number = 100;
  private subSampleSize: number = 64;
  private contamination: number = 0.08;
  private minTrainingSamples: number = 5;
  public featureMeans: Record<string, number> = {};
  public featureStds: Record<string, number> = {};
  public isTrained: boolean = false;

  constructor(contamination: number = 0.08) {
    this.contamination = contamination;
  }

  train(dataset: WeatherRecord[]): { trained: boolean; samples: number; message: string } {
    if (dataset.length < this.minTrainingSamples) {
      this.isTrained = false;
      return {
        trained: false,
        samples: dataset.length,
        message: "Collecting baseline data... Insufficient samples to train Isolation Forest.",
      };
    }

    // Compute empirical mean and standard deviations for attribution
    FEATURE_NAMES.forEach((feat) => {
      const vals = dataset.map((d) => d[feat]);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance =
        vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / Math.max(1, vals.length - 1);
      this.featureMeans[feat] = mean;
      this.featureStds[feat] = Math.sqrt(variance) || 1.0;
    });

    const sampleSize = Math.min(this.subSampleSize, dataset.length);
    const maxDepth = Math.ceil(Math.log2(sampleSize));

    this.trees = [];
    for (let t = 0; t < this.numTrees; t++) {
      // Subsample without replacement
      const shuffled = [...dataset].sort(() => 0.5 - Math.random());
      const sample = shuffled.slice(0, sampleSize);
      this.trees.push(new IsolationTree(sample, maxDepth));
    }

    this.isTrained = true;
    return {
      trained: true,
      samples: dataset.length,
      message: `Isolation Forest ensemble trained with ${this.numTrees} trees across ${dataset.length} AWS records.`,
    };
  }

  computeAnomalyScore(record: WeatherRecord, datasetSize: number): number {
    if (!this.isTrained || this.trees.length === 0) return 0.0;

    let totalPath = 0;
    for (const tree of this.trees) {
      totalPath += tree.pathLength(record);
    }
    const avgPath = totalPath / this.trees.length;
    const cN = averagePathLength(Math.min(this.subSampleSize, datasetSize));
    if (cN <= 0) return 0.0;

    // s(x, n) = 2^(-E(h(x)) / c(n))
    const score = Math.pow(2, -avgPath / cN);
    return Math.max(0, Math.min(1, score));
  }

  detectAll(dataset: WeatherRecord[]): EnrichedWeatherRecord[] {
    if (dataset.length < this.minTrainingSamples || !this.isTrained) {
      return dataset.map((r) => ({
        ...r,
        anomaly: false,
        anomaly_score: 0.0,
        severity: "NORMAL" as SeverityLevel,
        anomaly_type: "none" as AnomalyCategory,
        parameter: "None",
        current_value: `${r.temperature.toFixed(1)} °C`,
        expected_pattern: "Collecting baseline data...",
        anomaly_reason: "Collecting baseline data... Nominal AWS telemetry calibration in progress.",
      }));
    }

    // Determine empirical score threshold based on contamination
    const scores = dataset.map((r) => this.computeAnomalyScore(r, dataset.length));
    const sortedScores = [...scores].sort((a, b) => a - b);
    const cutoffIndex = Math.floor(sortedScores.length * (1 - this.contamination));
    // Fallback threshold around 0.58 if contamination index is too conservative
    const threshold = Math.max(0.55, sortedScores[Math.min(cutoffIndex, sortedScores.length - 1)]);

    return dataset.map((record, idx) => {
      const score = scores[idx];
      const historyUntilNow = dataset.slice(0, idx + 1);
      const isAnomaly = score >= threshold || this.detectDeterministicSpike(record, historyUntilNow);

      if (!isAnomaly) {
        return {
          ...record,
          anomaly: false,
          anomaly_score: parseFloat(score.toFixed(3)),
          severity: "NORMAL" as SeverityLevel,
          anomaly_type: "none" as AnomalyCategory,
          parameter: "All Sensors Normal",
          current_value: `${record.temperature.toFixed(1)} °C`,
          expected_pattern: "Normal expected weather range",
          anomaly_reason: "All weather readings are completely normal and within healthy limits.",
        };
      }

      const diagnosis = this.analyzeAnomalyCause(record, historyUntilNow, score);
      return {
        ...record,
        ...diagnosis,
      };
    });
  }

  /**
   * Deterministic safety check for abrupt physical spikes or stuck sensors
   */
  private detectDeterministicSpike(record: WeatherRecord, history: WeatherRecord[]): boolean {
    if (history.length < 2) return false;
    const prev = history[history.length - 2];
    const dTemp = Math.abs(record.temperature - prev.temperature);
    const dPres = Math.abs(record.pressure - prev.pressure);
    const dHum = Math.abs(record.humidity - prev.humidity);
    const dWind = Math.abs(record.wind_speed - prev.wind_speed);

    // Sudden jumps outside meteorological bounds
    if (dTemp >= 5.0 || dPres >= 9.0 || dHum >= 28.0 || dWind >= 15.0) return true;
    // Extreme unphysical bounds
    if (record.temperature > 55 || record.temperature < -25) return true;
    if (record.rainfall >= 50.0) return true;
    return false;
  }

  private analyzeAnomalyCause(
    record: WeatherRecord,
    history: WeatherRecord[],
    score: number
  ): AnomalyResult {
    const zScores: Record<string, number> = {};
    for (const feat of FEATURE_NAMES) {
      const val = record[feat];
      const mean = this.featureMeans[feat] ?? val;
      const std = this.featureStds[feat] || 1.0;
      zScores[feat] = Math.abs((val - mean) / std);
    }

    // Check temporal difference from previous observation
    let suddenJump = false;
    let suddenParam: FeatureName | null = null;
    let deltaVal = 0;

    if (history.length >= 2) {
      const prev = history[history.length - 2];
      const tempDiff = Math.abs(record.temperature - prev.temperature);
      const pressDiff = Math.abs(record.pressure - prev.pressure);
      const humDiff = Math.abs(record.humidity - prev.humidity);
      const windDiff = Math.abs(record.wind_speed - prev.wind_speed);

      if (tempDiff >= 4.5) {
        suddenJump = true;
        suddenParam = "temperature";
        deltaVal = tempDiff;
      } else if (pressDiff >= 8.0) {
        suddenJump = true;
        suddenParam = "pressure";
        deltaVal = pressDiff;
      } else if (humDiff >= 25.0) {
        suddenJump = true;
        suddenParam = "humidity";
        deltaVal = humDiff;
      } else if (windDiff >= 12.0) {
        suddenJump = true;
        suddenParam = "wind_speed";
        deltaVal = windDiff;
      }
    }

    const sortedParams = Object.entries(zScores).sort((a, b) => b[1] - a[1]);
    const [topParam, topZ] = sortedParams[0];
    const topFeature = topParam as FeatureName;
    const currVal = record[topFeature];
    const meanVal = this.featureMeans[topFeature] ?? currVal;
    const stdVal = this.featureStds[topFeature] || 1.0;

    const highDeviations = Object.entries(zScores).filter(([_, z]) => z >= 2.2);

    let anomaly_type: AnomalyCategory = "sensor anomaly";
    let parameter = topParam.replace("_", " ").toUpperCase();
    let current_value = `${currVal}`;
    let expected_pattern = `Recent mean ~ ${meanVal.toFixed(1)} ± ${stdVal.toFixed(1)}`;
    let anomaly_reason = "";

    if (suddenJump && suddenParam) {
      anomaly_type = "sudden change";
      parameter = suddenParam.replace("_", " ").toUpperCase();
      current_value = `${record[suddenParam]}`;
      anomaly_reason = `${parameter} jumped suddenly by ${deltaVal.toFixed(1)} compared to earlier readings today.`;
    } else if (highDeviations.length >= 2) {
      anomaly_type = "multiple sensor anomaly";
      parameter = "Multiple Sensors";
      const names = highDeviations.map(([p]) => p.replace("_", " "));
      anomaly_reason = `Several weather readings changed unexpectedly at once: ${names.join(", ")}.`;
      current_value = highDeviations.map(([p]) => `${p}: ${record[p as FeatureName]}`).join(" | ");
    } else if (topFeature === "temperature") {
      anomaly_type = "temperature anomaly";
      parameter = "Temperature";
      current_value = `${currVal.toFixed(1)} °C`;
      expected_pattern = `Usually around ${meanVal.toFixed(1)} °C`;
      anomaly_reason = `Temperature changed a lot (${currVal.toFixed(1)} °C vs usual ${meanVal.toFixed(1)} °C) compared to recent hours.`;
    } else if (topFeature === "humidity") {
      anomaly_type = "humidity anomaly";
      parameter = "Humidity";
      current_value = `${currVal.toFixed(0)} %`;
      expected_pattern = `Usually around ${meanVal.toFixed(0)} %`;
      anomaly_reason = `Humidity is unusually high or low (${currVal.toFixed(0)}%) compared to normal levels today.`;
    } else if (topFeature === "pressure") {
      anomaly_type = "pressure anomaly";
      parameter = "Air Pressure";
      current_value = `${currVal.toFixed(1)} hPa`;
      expected_pattern = `Usually around ${meanVal.toFixed(1)} hPa`;
      anomaly_reason = `Air pressure changed unexpectedly to ${currVal.toFixed(1)} hPa (usually around ${meanVal.toFixed(1)} hPa).`;
    } else if (topFeature === "wind_speed") {
      anomaly_type = "wind anomaly";
      parameter = "Wind Speed";
      current_value = `${currVal.toFixed(1)} m/s`;
      expected_pattern = `Usually around ${meanVal.toFixed(1)} m/s`;
      anomaly_reason = `Strong sudden wind speed spike detected at ${currVal.toFixed(1)} m/s.`;
    } else if (topFeature === "rainfall") {
      anomaly_type = "rainfall anomaly";
      parameter = "Rainfall";
      current_value = `${currVal.toFixed(1)} mm`;
      expected_pattern = `Usually around ${meanVal.toFixed(1)} mm`;
      anomaly_reason = `Sudden heavy rain burst recorded (${currVal.toFixed(1)} mm) in a very short time.`;
    } else {
      anomaly_type = "sensor anomaly";
      parameter = topParam.replace("_", " ").toUpperCase();
      anomaly_reason = `The ${parameter} sensor reading is unusually far outside its normal daily pattern.`;
    }

    // Severity determination
    let severity: SeverityLevel = "LOW";
    if (topZ > 4.2 || score > 0.78 || (suddenJump && topZ > 3.0)) {
      severity = "CRITICAL";
    } else if (topZ > 3.0 || score > 0.68 || highDeviations.length >= 2) {
      severity = "HIGH";
    } else if (topZ > 2.0 || score > 0.58) {
      severity = "MEDIUM";
    }

    return {
      anomaly: true,
      anomaly_score: parseFloat(score.toFixed(3)),
      severity,
      anomaly_type,
      parameter,
      current_value,
      expected_pattern,
      anomaly_reason,
    };
  }

  /**
   * Calculates analytical health scores from 0 to 100 for:
   * - temperature, humidity, pressure, wind, rainfall
   * Indicators:
   * 90-100: Healthy
   * 70-89: Warning
   * 0-69: Needs attention
   */
  calculateSensorHealth(dataset: WeatherRecord[]): SensorHealthResponse {
    const defaultResponse: SensorHealthResponse = {
      disclaimer: "Estimated score based on data patterns, not a physical hardware inspection.",
      metrics: {
        temperature: { col: "temperature", unit: "°C", score: 96, status: "Healthy", note: "Normal temperature readings" },
        humidity: { col: "humidity", unit: "%", score: 94, status: "Healthy", note: "Normal humidity readings" },
        pressure: { col: "pressure", unit: "hPa", score: 98, status: "Healthy", note: "Air pressure is steady" },
        wind: { col: "wind_speed", unit: "m/s", score: 92, status: "Healthy", note: "Wind sensor working well" },
        rainfall: { col: "rainfall", unit: "mm", score: 99, status: "Healthy", note: "Rain sensor clear" },
      },
    };

    if (dataset.length < 3) {
      return defaultResponse;
    }

    const recent = dataset.slice(-20);
    const keys: Array<{ key: "temperature" | "humidity" | "pressure" | "wind" | "rainfall"; col: FeatureName; unit: string }> = [
      { key: "temperature", col: "temperature", unit: "°C" },
      { key: "humidity", col: "humidity", unit: "%" },
      { key: "pressure", col: "pressure", unit: "hPa" },
      { key: "wind", col: "wind_speed", unit: "m/s" },
      { key: "rainfall", col: "rainfall", unit: "mm" },
    ];

    const metrics: any = {};

    for (const item of keys) {
      const vals = recent.map((r) => r[item.col]);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / Math.max(1, vals.length - 1);
      const std = Math.sqrt(variance);
      const lastVal = vals[vals.length - 1];

      let score = 100;
      let note = "Working normally";

      // 1. Stuck sensor check (zero variance over >= 6 observations, except rainfall)
      if (recent.length >= 6 && std === 0 && item.key !== "rainfall") {
        score -= 32;
        note = "Sensor may be stuck on same number";
      }

      // 2. High variance or sudden delta check
      if (recent.length >= 2) {
        const delta = Math.abs(vals[vals.length - 1] - vals[vals.length - 2]);
        if (item.key === "temperature" && delta > 4.5) {
          score -= 30;
          note = "Temperature changed very quickly";
        } else if (item.key === "pressure" && delta > 8.0) {
          score -= 32;
          note = "Unusual air pressure shift";
        } else if (item.key === "humidity" && delta > 25.0) {
          score -= 28;
          note = "Sudden humidity change";
        } else if (item.key === "wind" && delta > 14.0) {
          score -= 25;
          note = "Strong sudden wind gust";
        }
      }

      // 3. Absolute physical boundaries
      if (item.key === "temperature" && (lastVal < -30 || lastVal > 55)) {
        score -= 40;
        note = "Near extreme temperature limits";
      }
      if (item.key === "humidity" && (lastVal <= 0 || lastVal > 100)) {
        score -= 35;
        note = "Reading outside valid range (0-100%)";
      }
      if (item.key === "pressure" && (lastVal < 860 || lastVal > 1080)) {
        score -= 40;
        note = "Air pressure reading is abnormally high/low";
      }

      // Clamped score
      const finalScore = Math.max(25, Math.min(100, Math.round(score)));
      let status: "Healthy" | "Warning" | "Needs attention" = "Healthy";
      if (finalScore < 70) {
        status = "Needs attention";
      } else if (finalScore < 90) {
        status = "Warning";
      }

      metrics[item.key] = {
        col: item.col,
        unit: item.unit,
        score: finalScore,
        status,
        note,
      };
    }

    return {
      disclaimer: "Estimated score based on data patterns, not a physical hardware inspection.",
      metrics,
    };
  }
}
