import { ref } from 'vue'

class LoggerService {
  private static instance: LoggerService

  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService()
    }
    return LoggerService.instance
  }

  log(message: string, level: string = 'info') {
    console.log(`[${level.toUpperCase()}] ${message}`)
  }

  track(event: string, data?: Record<string, any>) {
    console.log('Track:', event, data)
  }
}

export const loggerService = LoggerService.getInstance()
export default LoggerService
