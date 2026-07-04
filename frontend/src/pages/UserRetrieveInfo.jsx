import { useState } from "react";
import Navbar from "../components/Navbar";
import customerApi from "../api/customerApi";
import { IdentificationIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function UserRetrieveInfo() {
  const [lookup, setLookup] = useState("");
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRetrieve = async () => {
    setError("");
    setCustomer(null);

    if (!lookup.trim()) {
      setError("Please enter your account number or CCA number.");
      return;
    }

    setLoading(true);
    try {
      const res = await customerApi.getCustomerLookup(lookup.trim());
      setCustomer(res.data?.user || null);
    } catch (err) {
      console.error("CCA INQUIRY ERROR", err);
      setError(err?.response?.data?.error || "Customer not found. Please check your account number or CCA number.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-16">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cignalRed">
              CCA Inquiry
            </p>
            <h1 className="mt-2 text-4xl font-bold text-slate-950">
              Retrieve your account number using your CCA or account record
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              This page helps customers confirm the correct account details before prepaid account
              inquiry or support follow-up. Enter either your account number or CCA number below.
            </p>

            <div className="mt-8 rounded-[26px] border border-slate-200 bg-slate-50 p-5">
              <label className="text-sm font-semibold text-slate-700">Account Number / CCA Number</label>
              <div className="relative mt-3">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={lookup}
                  onChange={(event) => setLookup(event.target.value)}
                  placeholder="Enter account number or CCA number"
                  className="w-full rounded-2xl border border-slate-300 bg-white py-4 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-cignalRed focus:ring-2 focus:ring-red-100"
                />
              </div>

              <button
                onClick={handleRetrieve}
                className="mt-4 w-full rounded-2xl bg-cignalRed px-5 py-4 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Retrieve Information
              </button>

              {error && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-slate-50 p-8 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-cignalRed">
              <IdentificationIcon className="h-9 w-9" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-slate-950">Why this matters</h2>
            <ul className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
              <li>• Confirms the correct account number before prepaid account inquiry.</li>
              <li>• Lets the admin maintain one customer source of truth from Customer Management.</li>
              <li>• Helps avoid wrong account lookups during support and technician requests.</li>
            </ul>
          </div>
        </section>

        {loading && (
          <div className="mt-10 flex flex-col items-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-cignalRed" />
            <p className="mt-3 text-sm text-slate-500">Searching customer information...</p>
          </div>
        )}

        {customer && !loading && (
          <section className="mt-10 rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cignalRed">
                  Account Information
                </p>
                <h2 className="mt-2 text-3xl font-bold text-slate-950">{customer.accountName}</h2>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Account Name: ${customer.accountName}\nAccount Number: ${customer.accountNumber}\nCCA Number: ${customer.ccaNumber}\nAddress: ${customer.address || ""}\nPhone: ${customer.phone || ""}`
                  );
                  alert("Customer information copied.");
                }}
                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-cignalRed hover:text-cignalRed"
              >
                Copy Information
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoTile label="Account Number" value={customer.accountNumber} />
              <InfoTile label="CCA Number" value={customer.ccaNumber} />
              <InfoTile label="Phone" value={customer.phone || "—"} />
              <InfoTile label="Address" value={customer.address || "—"} />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-3 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}
