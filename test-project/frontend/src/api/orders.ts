import axios from 'axios'

export async function ordersAction0(id?: string, data?: any) {
  const response = await axios.get('/api/search')
  return response.data
}

export async function ordersAction1(id?: string, data?: any) {
  const response = await axios.put(`/api/orders/${id}/status`, data)
  return response.data
}

export async function ordersAction2(id?: string, data?: any) {
  const response = await axios.get('/api/users')
  return response.data
}

export async function ordersAction3(id?: string, data?: any) {
  const response = await axios.post('/api/products', data)
  return response.data
}

export async function ordersAction4(id?: string, data?: any) {
  const response = await axios.post(`/api/orders/${id}/cancel`, data)
  return response.data
}
