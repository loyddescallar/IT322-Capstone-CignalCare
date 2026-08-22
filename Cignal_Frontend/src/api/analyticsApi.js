import axiosClient from './axiosClient';
export default { getAdminAnalytics:(params={})=>axiosClient.get('/analytics/admin',{params}) };
