import axios from 'axios'

export async function endpointsAction0(id?: string, data?: any) {
  const response = await axios.get('/api/users')
  return response.data
}

export async function endpointsAction1(id?: string, data?: any) {
  const response = await axios.get('/api/analytics/conversions')
  return response.data
}

export async function endpointsAction2(id?: string, data?: any) {
  const response = await axios.post('/api/wishlist', data)
  return response.data
}

export async function endpointsAction3(id?: string, data?: any) {
  const response = await axios.post('/api/upload', data)
  return response.data
}
