import axiosClient from './axiosClient';

function importForm(file, location) {
  const form = new FormData();
  form.append('file', file);
  form.append('location', location);
  return form;
}

const customerApi = {
  getCustomers: (status = 'active') => axiosClient.get('/customers', { params: { status } }),
  getStats: () => axiosClient.get('/customers/stats'),
  getCustomerById: (id) => axiosClient.get('/customers/id/' + id),
  getCustomerLookup: (id) => axiosClient.get('/customers/' + id),
  createCustomer: (data) => axiosClient.post('/customers', data),
  updateCustomer: (id, data) => axiosClient.put('/customers/id/' + id, data),
  resetCredentials: (id) => axiosClient.post('/customers/id/' + id + '/reset-credentials'),
  previewImport: (file, location) => axiosClient.post('/customers/import/preview', importForm(file, location)),
  importSubscribers: (file, location) => axiosClient.post('/customers/import', importForm(file, location)),
  archiveCustomer: (id) => axiosClient.patch('/customers/id/' + id + '/archive'),
  restoreCustomer: (id) => axiosClient.patch('/customers/id/' + id + '/restore'),
};

export default customerApi;
