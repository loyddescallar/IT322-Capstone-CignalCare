import axiosClient from './axiosClient';

const customerApi = {
  getCustomers: (status = 'active') =>
    axiosClient.get('/customers', { params: { status } }),
  getStats: () => axiosClient.get('/customers/stats'),
  getCustomerById: (id) => axiosClient.get('/customers/id/' + id),
  getCustomerLookup: (id) => axiosClient.get('/customers/' + id),
  createCustomer: (data) => axiosClient.post('/customers', data),
  updateCustomer: (id, data) => axiosClient.put('/customers/id/' + id, data),
  archiveCustomer: (id) => axiosClient.patch('/customers/id/' + id + '/archive'),
  restoreCustomer: (id) => axiosClient.patch('/customers/id/' + id + '/restore'),
  permanentDeleteCustomer: (id, confirmAccountNumber) =>
    axiosClient.delete('/customers/id/' + id + '/permanent', {
      data: { confirmAccountNumber },
    }),

  // Backward compatibility for older pages/components.
  deleteCustomer: (id) => axiosClient.patch('/customers/id/' + id + '/archive'),
};

export default customerApi;
