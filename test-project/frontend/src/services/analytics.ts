import { ref } from 'vue'

class AnalyticsService {
  private static instance: AnalyticsService

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService()
    }
    return AnalyticsService.instance
  }

  log(message: string, level: string = 'info') {
    console.log(`[${level.toUpperCase()}] ${message}`)
  }

  track(event: string, data?: Record<string, any>) {
    console.log('Track:', event, data)
  }
}

export const analyticsService = AnalyticsService.getInstance()
export default AnalyticsService
