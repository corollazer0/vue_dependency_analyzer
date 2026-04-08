import axios from 'axios'

export async function getDashboard(data?: any) {
  return axios.get('/api/dashboard/stats')
}

export async function getDashboard1(data?: any) {
  return axios.get('/api/dashboard/sales')
}

export async function getDashboard2(data?: any) {
  return axios.get('/api/dashboard/recent-orders')
}

export async function getDashboard3(data?: any) {
  return axios.get('/api/dashboard/top-products')
}
