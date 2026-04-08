import axios from 'axios'

export async function clientAction0(id?: string, data?: any) {
  const response = await axios.post('/api/auth/login', data)
  return response.data
}

export async function clientAction1(id?: string, data?: any) {
  const response = await axios.post('/api/orders', data)
  return response.data
}

export async function clientAction2(id?: string, data?: any) {
  const response = await axios.put(`/api/users/${id}`, data)
  return response.data
}

export async function clientAction3(id?: string, data?: any) {
  const response = await axios.get('/api/categories')
  return response.data
}

export async function clientAction4(id?: string, data?: any) {
  const response = await axios.get('/api/analytics/conversions')
  return response.data
}
