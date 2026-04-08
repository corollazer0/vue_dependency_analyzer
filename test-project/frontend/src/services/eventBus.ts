import { ref } from 'vue'

class EventBusService {
  private static instance: EventBusService

  static getInstance(): EventBusService {
    if (!EventBusService.instance) {
      EventBusService.instance = new EventBusService()
    }
    return EventBusService.instance
  }

  log(message: string, level: string = 'info') {
    console.log(`[${level.toUpperCase()}] ${message}`)
  }

  track(event: string, data?: Record<string, any>) {
    console.log('Track:', event, data)
  }
}

export const eventBusService = EventBusService.getInstance()
export default EventBusService
