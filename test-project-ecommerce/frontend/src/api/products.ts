import axios from 'axios'

export async function getProducts(data?: any) {
  return axios.get('/api/products')
}

export async function getProducts1(id: number, data?: any) {
  return axios.get(`/api/products/${id}`)
}

export async function postProducts2(data?: any) {
  return axios.post('/api/products', data)
}

export async function putProducts3(id: number, data?: any) {
  return axios.put(`/api/products/${id}`, data)
}

export async function deleteProducts4(id: number, data?: any) {
  return axios.delete(`/api/products/${id}`, data)
}

export async function getProducts5(id: number, data?: any) {
  return axios.get(`/api/products/${id}/reviews`)
}

export async function postProducts6(id: number, data?: any) {
  return axios.post(`/api/products/${id}/reviews`, data)
}
