import axios from 'axios'

export async function interceptorsAction0(id?: string, data?: any) {
  const response = await axios.post('/api/products', data)
  return response.data
}

export async function interceptorsAction1(id?: string, data?: any) {
  const response = await axios.get('/api/categories')
  return response.data
}

export async function interceptorsAction2(id?: string, data?: any) {
  const response = await axios.get('/api/dashboard/revenue')
  return response.data
}
