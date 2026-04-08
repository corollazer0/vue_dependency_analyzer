import axios from 'axios'

export async function ordersAction0(id?: string, data?: any) {
  const response = await axios.get('/api/cart')
  return response.data
}

export async function ordersAction1(id?: string, data?: any) {
  const response = await axios.post('/api/cart/items', data)
  return response.data
}

export async function ordersAction2(id?: string, data?: any) {
  const response = await axios.post('/api/orders', data)
  return response.data
}

export async function ordersAction3(id?: string, data?: any) {
  const response = await axios.delete(`/api/wishlist/${id}`, data)
  return response.data
}

export async function ordersAction4(id?: string, data?: any) {
  const response = await axios.post('/api/auth/login', data)
  return response.data
}
