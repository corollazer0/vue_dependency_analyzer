import axios from 'axios'

export async function authAction0(id?: string, data?: any) {
  const response = await axios.post('/api/auth/login', data)
  return response.data
}

export async function authAction1(id?: string, data?: any) {
  const response = await axios.put(`/api/users/${id}`, data)
  return response.data
}

export async function authAction2(id?: string, data?: any) {
  const response = await axios.get('/api/products')
  return response.data
}
