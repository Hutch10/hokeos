/**
 * Phase 43: Sovereign Hardware SDK (v1.8.0-YARD)
 * Mock implementation for industrial scale integration.
 * In production, this would interface with Serial/USB/MQTT scale indicators.
 */

export type ScaleStatus = "stable" | "motion" | "overload" | "underload";

export interface ScaleReading {
  weight: number;
  unit: "lbs" | "kg";
  status: ScaleStatus;
  timestamp: Date;
}

export class SovereignScaleSDK {
  private static instance: SovereignScaleSDK;
  private currentWeight: number = 0;
  private targetWeight: number = 0;
  private interval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start the simulation loop
    if (typeof window === "undefined") {
      this.interval = setInterval(() => this.simulateJitter(), 250);
    }
  }

  public static getInstance(): SovereignScaleSDK {
    if (!SovereignScaleSDK.instance) {
      SovereignScaleSDK.instance = new SovereignScaleSDK();
    }
    return SovereignScaleSDK.instance;
  }

  /**
   * Mock method to set the 'load' on the scale (for simulation only)
   */
  public simulateLoad(weight: number) {
    this.targetWeight = weight;
  }

  private simulateJitter() {
    // Smooth transition to target weight with small jitter
    const diff = this.targetWeight - this.currentWeight;
    this.currentWeight += diff * 0.2; // Move 20% closer to target each tick

    // Add +/- 0.2 units of jitter if weight is > 0
    if (this.currentWeight > 0.1) {
      const jitter = (Math.random() - 0.5) * 0.4;
      this.currentWeight += jitter;
    } else {
      this.currentWeight = 0;
    }
  }

  public async getReading(): Promise<ScaleReading> {
    // Simulate slight network latency
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      weight: parseFloat(this.currentWeight.toFixed(2)),
      unit: "lbs",
      status: Math.abs(this.targetWeight - this.currentWeight) < 0.5 ? "stable" : "motion",
      timestamp: new Date(),
    };
  }
}

export const scaleSDK = SovereignScaleSDK.getInstance();
