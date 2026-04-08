import axios from 'axios'

export async function getUsers(data?: any) {
  return axios.get('/api/users')
}

export async function getUsers1(id: number, data?: any) {
  return axios.get(`/api/users/${id}`)
}

export async function postUsers2(data?: any) {
  return axios.post('/api/users', data)
}

export async function putUsers3(id: number, data?: any) {
  return axios.put(`/api/users/${id}`, data)
}

export async function deleteUsers4(id: number, data?: any) {
  return axios.delete(`/api/users/${id}`, data)
}
