import axios from 'axios'

export async function productsAction0(id?: string, data?: any) {
  const response = await axios.delete(`/api/cart/items/${id}`, data)
  return response.data
}

export async function productsAction1(id?: string, data?: any) {
  const response = await axios.post('/api/orders', data)
  return response.data
}

export async function productsAction2(id?: string, data?: any) {
  const response = await axios.get('/api/settings')
  return response.data
}

export async function productsAction3(id?: string, data?: any) {
  const response = await axios.get(`/api/users/${id}`)
  return response.data
}
