export interface PricePoint {
  timestamp: number
  price: number
}

export interface TokenMetrics {
  averagePrice: number
  volatility: number      // standard deviation (population by default)
  maxPrice: number
  minPrice: number
}

export interface ExtendedTokenMetrics extends TokenMetrics {
  medianPrice: number
  priceRange: number
  lastPrice?: number
}

function isFinitePrice(p: PricePoint): boolean {
  return Number.isFinite(p.price) && Number.isFinite(p.timestamp)
}

/** Sort points by timestamp asc and drop invalid entries */
function normalize(points: PricePoint[]): PricePoint[] {
  return [...points].filter(isFinitePrice).sort((a, b) => a.timestamp - b.timestamp)
}

export class TokenAnalysisCalculator {
  private data: PricePoint[]

  constructor(data: PricePoint[]) {
    this.data = normalize(data)
  }

  setData(next: PricePoint[]): void {
    this.data = normalize(next)
  }

  getAveragePrice(): number {
    const n = this.data.length
    if (n === 0) return 0
    const sum = this.data.reduce((acc, p) => acc + p.price, 0)
    return sum / n
  }

  /** Population standard deviation by default; set sample=true for sample stdev */
  getVolatility(sample: boolean = false): number {
    const n = this.data.length
    if (n === 0) return 0
    const avg = this.getAveragePrice()
    const denom = sample ? Math.max(1, n - 1) : Math.max(1, n)
    const variance = this.data.reduce((acc, p) => acc + (p.price - avg) ** 2, 0) / denom
    return Math.sqrt(variance)
  }

  getMaxPrice(): number {
    if (this.data.length === 0) return 0
    return this.data.reduce((max, p) => (p.price > max ? p.price : max), -Infinity)
  }

  getMinPrice(): number {
    if (this.data.length === 0) return 0
    return this.data.reduce((min, p) => (p.price < min ? p.price : min), Infinity)
  }

  getMedianPrice(): number {
    const n = this.data.length
    if (n === 0) return 0
    const arr = this.data.map(p => p.price).sort((a, b) => a - b)
    const mid = Math.floor(n / 2)
    return n % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid]
  }

  getPriceRange(): number {
    const min = this.getMinPrice()
    const max = this.getMaxPrice()
    return max - min
  }

  /** Simple moving average over the last `period` points */
  getSMA(period: number): number {
    if (period <= 0 || this.data.length < period) return 0
    const slice = this.data.slice(-period)
    const sum = slice.reduce((acc, p) => acc + p.price, 0)
    return sum / period
  }

  /** Exponential moving average over the last `period` points */
  getEMA(period: number): number {
    if (period <= 0 || this.data.length === 0) return 0
    const k = 2 / (period + 1)
    let ema = this.data[0].price
    for (let i = 1; i < this.data.length; i++) {
      ema = this.data[i].price * k + ema * (1 - k)
    }
    return ema
  }

  computeMetrics(): TokenMetrics {
    return {
      averagePrice: this.getAveragePrice(),
      volatility: this.getVolatility(),
      maxPrice: this.getMaxPrice(),
      minPrice: this.getMinPrice()
    }
  }

  computeExtendedMetrics(): ExtendedTokenMetrics {
    const base = this.computeMetrics()
    const last = this.data.length ? this.data[this.data.length - 1].price : undefined
    return {
      ...base,
      medianPrice: this.getMedianPrice(),
      priceRange: this.getPriceRange(),
      lastPrice: last
    }
  }
}
