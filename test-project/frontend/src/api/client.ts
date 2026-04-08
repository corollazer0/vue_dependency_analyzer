import axios from 'axios'

export async function clientAction0(id?: string, data?: any) {
  const response = await axios.get('/api/search')
  return response.data
}

export async function clientAction1(id?: string, data?: any) {
  const response = await axios.post('/api/products', data)
  return response.data
}

export async function clientAction2(id?: string, data?: any) {
  const response = await axios.get(`/api/products/${id}`)
  return response.data
}

export async function clientAction3(id?: string, data?: any) {
  const response = await axios.post('/api/users', data)
  return response.data
}

export async function clientAction4(id?: string, data?: any) {
  const response = await axios.get(`/api/products/${id}/reviews`)
  return response.data
}
