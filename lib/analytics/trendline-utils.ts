/**
 * Computes the Simple Moving Average (SMA) of a numeric series.
 * @param data Array of numbers to smooth.
 * @param window The number of points to include in the average (e.g., 3 for 3-month SMA).
 */
export function calculateSMA(data: (number | null)[], window: number): (number | null)[] {
  const result: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(null);
      continue;
    }
    
    let sum = 0;
    let count = 0;
    for (let j = i - window + 1; j <= i; j++) {
      if (data[j] !== null) {
        sum += data[j]!;
        count++;
      }
    }
    
    result.push(count > 0 ? sum / count : null);
  }
  
  return result;
}

/**
 * Computes the Exponential Moving Average (EMA) of a numeric series.
 * @param data Array of numbers to smooth.
 * @param window Effective window size (alpha = 2 / (window + 1)).
 */
export function calculateEMA(data: (number | null)[], window: number): (number | null)[] {
  const result: (number | null)[] = [];
  const alpha = 2 / (window + 1);
  let previousEma: number | null = null;
  
  for (let i = 0; i < data.length; i++) {
    const current = data[i];
    
    if (current === null) {
      result.push(previousEma);
      continue;
    }
    
    if (previousEma === null) {
      previousEma = current;
    } else {
      previousEma = (current - previousEma) * alpha + previousEma;
    }
    
    result.push(previousEma);
  }
  
  return result;
}
