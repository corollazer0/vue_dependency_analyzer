import axios from 'axios'

export async function getOrders(data?: any) {
  return axios.get('/api/orders')
}

export async function getOrders1(id: number, data?: any) {
  return axios.get(`/api/orders/${id}`)
}

export async function postOrders2(data?: any) {
  return axios.post('/api/orders', data)
}

export async function putOrders3(id: number, data?: any) {
  return axios.put(`/api/orders/${id}/status`, data)
}

export async function postOrders4(id: number, data?: any) {
  return axios.post(`/api/orders/${id}/cancel`, data)
}

export async function getOrders5(id: number, data?: any) {
  return axios.get(`/api/orders/${id}/timeline`)
}
