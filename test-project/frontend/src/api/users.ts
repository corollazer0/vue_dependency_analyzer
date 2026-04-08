import axios from 'axios'

export async function usersAction0(id?: string, data?: any) {
  const response = await axios.post('/api/users', data)
  return response.data
}

export async function usersAction1(id?: string, data?: any) {
  const response = await axios.post('/api/auth/logout', data)
  return response.data
}

export async function usersAction2(id?: string, data?: any) {
  const response = await axios.get('/api/users')
  return response.data
}
