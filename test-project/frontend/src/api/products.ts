import axios from 'axios'

export async function productsAction0(id?: string, data?: any) {
  const response = await axios.get('/api/coupons')
  return response.data
}

export async function productsAction1(id?: string, data?: any) {
  const response = await axios.post('/api/wishlist', data)
  return response.data
}

export async function productsAction2(id?: string, data?: any) {
  const response = await axios.get('/api/inventory')
  return response.data
}

export async function productsAction3(id?: string, data?: any) {
  const response = await axios.put(`/api/orders/${id}/status`, data)
  return response.data
}
