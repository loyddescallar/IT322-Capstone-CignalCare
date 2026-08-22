import axiosClient from './axiosClient';
export default {
  getAdminIncidents:(params={})=>axiosClient.get('/incidents/admin',{params}),
  getMyIncidents:()=>axiosClient.get('/incidents/my'),
  confirm:(id,notes='')=>axiosClient.patch(`/incidents/admin/${id}/confirm`,{notes}),
  dismiss:(id,notes='')=>axiosClient.patch(`/incidents/admin/${id}/dismiss`,{notes}),
  resolve:(id,notes='')=>axiosClient.patch(`/incidents/admin/${id}/resolve`,{notes}),
};
