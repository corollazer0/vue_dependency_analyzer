import { ref } from 'vue'

class I18nService {
  private static instance: I18nService

  static getInstance(): I18nService {
    if (!I18nService.instance) {
      I18nService.instance = new I18nService()
    }
    return I18nService.instance
  }

  log(message: string, level: string = 'info') {
    console.log(`[${level.toUpperCase()}] ${message}`)
  }

  track(event: string, data?: Record<string, any>) {
    console.log('Track:', event, data)
  }
}

export const i18nService = I18nService.getInstance()
export default I18nService
