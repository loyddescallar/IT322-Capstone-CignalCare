import axiosClient from './axiosClient';
const authApi = { login:d=>axiosClient.post('/auth/login',d), register:d=>axiosClient.post('/auth/register',d), me:()=>axiosClient.get('/auth/me'), lookup:id=>axiosClient.get('/auth/lookup/'+id) };
export default authApi;
