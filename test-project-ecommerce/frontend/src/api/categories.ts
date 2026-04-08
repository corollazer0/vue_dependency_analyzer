import axios from 'axios'

export async function getCategories(data?: any) {
  return axios.get('/api/categories')
}

export async function getCategories1(data?: any) {
  return axios.get('/api/categories/tree')
}

export async function postCategories2(data?: any) {
  return axios.post('/api/categories', data)
}

export async function putCategories3(id: number, data?: any) {
  return axios.put(`/api/categories/${id}`, data)
}
