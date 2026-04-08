import axios from 'axios'

export async function usersAction0(id?: string, data?: any) {
  const response = await axios.post('/api/upload', data)
  return response.data
}

export async function usersAction1(id?: string, data?: any) {
  const response = await axios.put(`/api/orders/${id}/status`, data)
  return response.data
}

export async function usersAction2(id?: string, data?: any) {
  const response = await axios.get('/api/search')
  return response.data
}
