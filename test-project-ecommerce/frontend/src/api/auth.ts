import axios from 'axios'

export async function postAuth(data?: any) {
  return axios.post('/api/auth/login', data)
}

export async function postAuth1(data?: any) {
  return axios.post('/api/auth/register', data)
}

export async function postAuth2(data?: any) {
  return axios.post('/api/auth/logout', data)
}

export async function postAuth3(data?: any) {
  return axios.post('/api/auth/refresh', data)
}

export async function getAuth4(data?: any) {
  return axios.get('/api/auth/me')
}
