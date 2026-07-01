import { useEffect, useMemo, useState } from "react";
import {
  EyeIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import customerApi from "../api/customerApi";

const EMPTY_FORM = {
  accountName: "",
  accountNumber: "",
  ccaNumber: "",
  address: "",
  phone: "",
};

export default function AdminCustomers({ embedded = false }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await customerApi.getCustomers();
      setCustomers(res.data?.customers || []);
    } catch (err) {
      console.error("LOAD CUSTOMERS ERROR", err);
      setError(err?.response?.data?.error || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;

    return customers.filter((customer) =>
      [
        customer.accountName,
        customer.accountNumber,
        customer.ccaNumber,
        customer.phone,
        customer.address,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [customers, search]);

  const closeModal = () => {
    setMode(null);
    setSelectedCustomer(null);
  };

  const openModal = (nextMode, customer = null) => {
    setMode(nextMode);
    setSelectedCustomer(customer);
  };

  const handleCreate = async (form) => {
    setSubmitting(true);
    try {
      await customerApi.createCustomer(form);
      await loadCustomers();
      closeModal();
    } catch (err) {
      throw new Error(err?.response?.data?.error || "Failed to create customer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (form) => {
    setSubmitting(true);
    try {
      await customerApi.updateCustomer(selectedCustomer.id, form);
      await loadCustomers();
      closeModal();
    } catch (err) {
      throw new Error(err?.response?.data?.error || "Failed to update customer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    setSubmitting(true);
    try {
      await customerApi.deleteCustomer(selectedCustomer.id);
      await loadCustomers();
      closeModal();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to delete customer.");
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cignalRed">
                Customer Management
              </p>
              <h1 className="mt-1 text-3xl font-bold text-slate-950">
                Real customer records for CCA inquiry and prepaid support
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Use this as your source of truth for account number, CCA number, contact details,
                and customer profile data across the admin dashboard.
              </p>
            </div>

            <button
              onClick={() => openModal("add")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cignalRed px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              <PlusIcon className="h-5 w-5" />
              Add Customer
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-cignalRed">
              <UsersIcon className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Total Customers</p>
              <p className="mt-2 text-5xl font-bold leading-none text-slate-950">
                {loading ? "..." : customers.length}
              </p>
              <p className="mt-4 text-sm leading-6 text-slate-500">
                These records power CCA inquiry and account lookup in the user-facing module.
              </p>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, account number, CCA, phone, address..."
              className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-cignalRed focus:ring-2 focus:ring-red-100"
            />
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{filteredCustomers.length}</span> record(s)
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-[24px] border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-4">Account Name</th>
                <th className="px-4 py-4">Account No.</th>
                <th className="px-4 py-4">CCA No.</th>
                <th className="px-4 py-4">Phone</th>
                <th className="px-4 py-4">Address</th>
                <th className="px-4 py-4">Created</th>
                <th className="px-4 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Loading customer records...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No customers found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-semibold">{customer.accountName}</td>
                    <td className="px-4 py-4">{customer.accountNumber}</td>
                    <td className="px-4 py-4">{customer.ccaNumber}</td>
                    <td className="px-4 py-4">{customer.phone || "—"}</td>
                    <td className="px-4 py-4">{customer.address || "—"}</td>
                    <td className="px-4 py-4 text-slate-500">
                      {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <ActionButton icon={EyeIcon} onClick={() => openModal("view", customer)} />
                        <ActionButton icon={PencilSquareIcon} onClick={() => openModal("edit", customer)} />
                        <ActionButton
                          icon={TrashIcon}
                          onClick={() => openModal("delete", customer)}
                          danger
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {mode === "view" && selectedCustomer && (
        <Modal title="Customer Details" onClose={closeModal}>
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard label="Account Name" value={selectedCustomer.accountName} />
            <InfoCard label="Account Number" value={selectedCustomer.accountNumber} />
            <InfoCard label="CCA Number" value={selectedCustomer.ccaNumber} />
            <InfoCard label="Phone" value={selectedCustomer.phone || "—"} />
            <InfoCard label="Address" value={selectedCustomer.address || "—"} />
            <InfoCard
              label="Created"
              value={selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleString() : "—"}
            />
          </div>
        </Modal>
      )}

      {mode === "add" && (
        <Modal title="Add New Customer" onClose={closeModal}>
          <CustomerForm initial={EMPTY_FORM} onSubmit={handleCreate} submitting={submitting} />
        </Modal>
      )}

      {mode === "edit" && selectedCustomer && (
        <Modal title="Edit Customer" onClose={closeModal}>
          <CustomerForm initial={selectedCustomer} onSubmit={handleUpdate} submitting={submitting} />
        </Modal>
      )}

      {mode === "delete" && selectedCustomer && (
        <Modal title="Delete Customer" onClose={closeModal}>
          <p className="text-sm leading-6 text-slate-600">
            Are you sure you want to delete <span className="font-semibold text-slate-950">{selectedCustomer.accountName}</span>?
            This will remove the customer record used for CCA inquiry and account lookup.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="rounded-2xl bg-cignalRed px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Deleting..." : "Delete Record"}
            </button>
            <button
              onClick={closeModal}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );

  return embedded ? content : content;
}

function ActionButton({ icon: Icon, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 transition ${
        danger
          ? "border-red-200 text-cignalRed hover:bg-red-50"
          : "border-slate-200 text-slate-700 hover:bg-slate-100"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function CustomerForm({ initial, onSubmit, submitting }) {
  const [form, setForm] = useState(initial);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setForm(initial);
    setFormError("");
  }, [initial]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!form.accountName.trim() || !form.accountNumber.trim() || !form.ccaNumber.trim()) {
      setFormError("Account name, account number, and CCA number are required.");
      return;
    }

    try {
      await onSubmit({
        accountName: form.accountName.trim(),
        accountNumber: form.accountNumber.trim(),
        ccaNumber: form.ccaNumber.trim(),
        address: form.address?.trim() || "",
        phone: form.phone?.trim() || "",
      });
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Account Name" name="accountName" value={form.accountName || ""} onChange={handleChange} />
        <Field label="Account Number" name="accountNumber" value={form.accountNumber || ""} onChange={handleChange} />
        <Field label="CCA Number" name="ccaNumber" value={form.ccaNumber || ""} onChange={handleChange} />
        <Field label="Phone" name="phone" value={form.phone || ""} onChange={handleChange} />
        <div className="sm:col-span-2">
          <Field label="Address" name="address" value={form.address || ""} onChange={handleChange} />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-cignalRed px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Saving..." : "Save Customer"}
      </button>
    </form>
  );
}

function Field({ label, name, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        name={name}
        value={value}
        onChange={onChange}
        className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cignalRed focus:ring-2 focus:ring-red-100"
      />
    </label>
  );
}
