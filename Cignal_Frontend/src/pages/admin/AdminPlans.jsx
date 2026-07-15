import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Eye,
  Plus,
  Search,
  Trash2,
  Tv,
  X,
} from 'lucide-react';
import loadAdminApi from '../../api/loadAdminApi';
import {
  CHANNEL_CATEGORIES,
  channelsToText,
  fallbackPlanList,
  normalizePlan,
  parseChannelLines,
} from '../../utils/planHelpers';

const EMPTY_FORM = {
  plan_code: '',
  plan_name: '',
  amount: '',
  validity_days: 30,
  hd_channels: 0,
  sd_channels: 0,
  benefits_text: '',
  status: 'active',
  channelText: '',
};

function formatPeso(amount) {
  return `₱${Number(amount || 0).toLocaleString('en-PH')}`;
}

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [channelCat, setChannelCat] = useState('All');
  const [mode, setMode] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function loadPlans() {
    setLoading(true);

    try {
      const response = await loadAdminApi.getPlans(true);
      setPlans((response.data?.plans || []).map(normalizePlan));
    } catch (error) {
      console.error('LOAD PLANS ERROR:', error);
      setPlans(fallbackPlanList());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, []);

  const filteredPlans = useMemo(() => {
    const q = search.toLowerCase();

    return plans
      .filter((plan) => statusFilter === 'All' || plan.status === statusFilter)
      .filter((plan) =>
        [plan.plan_name, plan.plan_code, plan.amount, plan.benefits_text]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
  }, [plans, search, statusFilter]);

  const activeCount = plans.filter((plan) => plan.status === 'active').length;
  const inactiveCount = plans.filter((plan) => plan.status !== 'active').length;
  const totalChannels = plans.reduce((sum, plan) => sum + (plan.channelData?.length || 0), 0);

  function openAddModal() {
    setMode('add');
    setFormErr('');
    setForm({ ...EMPTY_FORM });
  }

  function openEditModal(plan) {
    setMode('edit');
    setFormErr('');
    setForm({
      plan_code: plan.plan_code || '',
      plan_name: plan.plan_name || '',
      amount: plan.amount || '',
      validity_days: plan.validity_days || 30,
      hd_channels: plan.hd_channels || 0,
      sd_channels: plan.sd_channels || 0,
      benefits_text: plan.benefits_text || '',
      status: plan.status || 'active',
      channelText: channelsToText(plan.channelData || []),
    });
    setSelectedPlan(plan);
  }

  function closeFormModal() {
    setMode(null);
    setFormErr('');
    setSaving(false);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function validateForm() {
    if (!form.plan_name.trim()) return 'Plan name is required.';
    if (!form.plan_code.trim()) return 'Plan code is required.';
    if (!Number(form.amount) || Number(form.amount) <= 0) return 'Amount must be greater than zero.';
    if (!Number(form.validity_days) || Number(form.validity_days) <= 0) return 'Validity days must be greater than zero.';
    return '';
  }

  function buildPayload() {
    return {
      plan_code: form.plan_code.trim(),
      plan_name: form.plan_name.trim(),
      amount: Number(form.amount),
      validity_days: Number(form.validity_days),
      hd_channels: Number(form.hd_channels || 0),
      sd_channels: Number(form.sd_channels || 0),
      benefits_text: form.benefits_text.trim(),
      status: form.status,
      channels: parseChannelLines(form.channelText),
    };
  }

  async function handleSavePlan() {
    const error = validateForm();

    if (error) {
      setFormErr(error);
      return;
    }

    setSaving(true);

    try {
      if (mode === 'edit') {
        await loadAdminApi.updatePlan(selectedPlan.id, buildPayload());
      } else {
        await loadAdminApi.createPlan(buildPayload());
      }

      closeFormModal();
      await loadPlans();
    } catch (error) {
      setFormErr(error.response?.data?.error || 'Failed to save plan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePlan() {
    if (!deleteTarget) return;

    setSaving(true);
    setFormErr('');

    try {
      await loadAdminApi.deletePlan(deleteTarget.id);
      setDeleteTarget(null);
      await loadPlans();
    } catch (error) {
      setFormErr(error.response?.data?.error || 'Failed to delete plan.');
    } finally {
      setSaving(false);
    }
  }

  const modalChannels = selectedPlan
    ? channelCat === 'All'
      ? selectedPlan.channelData || []
      : (selectedPlan.channelData || []).filter((channel) => channel.category === channelCat)
    : [];

  const modalCategories = selectedPlan
    ? ['All', ...new Set((selectedPlan.channelData || []).map((channel) => channel.category || 'Others'))]
    : ['All'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Prepaid Plans</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Manage load packages shown on the user dashboard and load request page.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-1.5 rounded-xl bg-[#cc0000] px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
        >
          <Plus size={14} /> Add Plan
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total Plans', value: plans.length, color: 'text-gray-800' },
          { label: 'Active Plans', value: activeCount, color: 'text-green-600' },
          { label: 'Inactive Plans', value: inactiveCount, color: 'text-gray-400' },
          { label: 'Channel Entries', value: totalChannels, color: 'text-[#cc0000]' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs text-gray-500">{item.label}</p>
            <p className={`text-2xl font-bold ${item.color}`}>{loading ? '...' : item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex max-w-xs flex-1 items-center gap-2 rounded-xl bg-gray-100 px-3 py-2">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search plan, code, amount..."
              className="w-full bg-transparent text-xs text-gray-600 outline-none placeholder-gray-400"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {['All', 'active', 'inactive'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-[#cc0000] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'All' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          <span className="ml-auto text-xs text-gray-400">{filteredPlans.length} plans</span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400">Loading plans...</div>
        ) : filteredPlans.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">No plans found.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-xl border p-4 transition hover:shadow-md ${
                  plan.status === 'active' ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-80'
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{plan.plan_name}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-gray-400">{plan.plan_code}</p>
                    <p className="mt-1 text-lg font-black text-[#cc0000]">{formatPeso(plan.amount)}</p>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      plan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {plan.status}
                  </span>
                </div>

                <p className="mb-1 text-xs text-gray-500">{plan.validity_days} days validity</p>
                <p className="text-[10px] text-gray-400">
                  {plan.hd_channels} HD · {plan.sd_channels} SD · {plan.channelData?.length || 0} listed channels
                </p>
                {plan.benefits_text && (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">{plan.benefits_text}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlan(plan);
                      setChannelCat('All');
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-[#cc0000] hover:bg-red-100"
                  >
                    <Eye size={12} /> Channels
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(plan)}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                  >
                    <Edit3 size={12} /> Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormErr('');
                      setDeleteTarget(plan);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPlan && !mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-gradient-to-r from-[#880000] to-[#cc0000] px-5 py-4 text-white">
              <div>
                <h2 className="text-sm font-bold">{selectedPlan.plan_name} — Channel Lineup</h2>
                <p className="mt-0.5 text-xs text-white/80">
                  {formatPeso(selectedPlan.amount)} · {selectedPlan.validity_days} days · {selectedPlan.channelData?.length || 0} channels
                </p>
              </div>
              <button type="button" onClick={() => setSelectedPlan(null)} className="rounded-xl p-1 hover:bg-white/20">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-shrink-0 flex-wrap gap-1.5 border-b border-gray-100 px-5 py-3">
              {modalCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setChannelCat(category)}
                  className={`rounded-xl px-3 py-1 text-xs font-medium transition-colors ${
                    channelCat === category
                      ? 'bg-[#cc0000] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto p-5">
              {modalChannels.length === 0 ? (
                <p className="py-8 text-center text-xs text-gray-400">No channel lineup saved for this plan yet.</p>
              ) : (
                CHANNEL_CATEGORIES.filter((category) => category !== 'All')
                  .filter((category) => channelCat === 'All' || channelCat === category)
                  .map((category) => {
                    const channels = modalChannels.filter((channel) => (channel.category || 'Others') === category);
                    if (!channels.length) return null;

                    return (
                      <div key={category} className="mb-4">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-600">{category}</p>
                        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                          {channels.map((channel) => (
                            <div key={`${category}-${channel.name}`} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-red-100">
                                <Tv size={10} className="text-[#cc0000]" />
                              </div>
                              <p className="text-xs font-medium text-gray-700">{channel.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {(mode === 'add' || mode === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-bold text-gray-800">{mode === 'add' ? 'Add Plan' : 'Edit Plan'}</h2>
              <button type="button" onClick={closeFormModal} className="rounded-xl p-1 text-gray-400 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-5">
              {formErr && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {formErr}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Plan Code *', name: 'plan_code', placeholder: 'REG300' },
                  { label: 'Plan Name *', name: 'plan_name', placeholder: 'Load 300' },
                  { label: 'Amount *', name: 'amount', type: 'number', placeholder: '300' },
                  { label: 'Validity Days *', name: 'validity_days', type: 'number', placeholder: '30' },
                  { label: 'HD Channels', name: 'hd_channels', type: 'number', placeholder: '10' },
                  { label: 'SD Channels', name: 'sd_channels', type: 'number', placeholder: '70' },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="mb-1 block text-xs font-medium text-gray-500" style={{ fontSize: '10px' }}>
                      {field.label}
                    </label>
                    <input
                      name={field.name}
                      type={field.type || 'text'}
                      value={form[field.name]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#cc0000]"
                    />
                  </div>
                ))}

                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-500" style={{ fontSize: '10px' }}>
                    Benefits / Description
                  </label>
                  <textarea
                    name="benefits_text"
                    value={form.benefits_text}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Short description displayed to users"
                    className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#cc0000]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-500" style={{ fontSize: '10px' }}>
                    Channels Included
                  </label>
                  <textarea
                    name="channelText"
                    value={form.channelText}
                    onChange={handleChange}
                    rows={8}
                    placeholder={'One channel per line. Example:\nHBO | Movies\nCartoon Network | Kids\nOne Sports | Sports'}
                    className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 font-mono text-xs outline-none focus:border-[#cc0000]"
                  />
                  <p className="mt-1 text-[10px] text-gray-400">
                    Format: Channel Name | Category. Categories may be Entertainment, Movies, News, Sports, Kids, Educational, Religious, Shopping, Radio, or Others.
                  </p>
                </div>

                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-500" style={{ fontSize: '10px' }}>
                    Status
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#cc0000]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleSavePlan}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[#cc0000] py-2.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : mode === 'add' ? 'Save Plan' : 'Update Plan'}
                </button>
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-bold text-gray-800">Delete Plan</h2>
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl p-1 text-gray-400 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <div className="p-5">
              {formErr && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {formErr}
                </div>
              )}

              <p className="text-xs leading-relaxed text-gray-600">
                Delete <span className="font-semibold">{deleteTarget.plan_name}</span>? This removes it from admin plan management and user load selections. If the plan already has transaction history, the backend will ask you to set it inactive instead.
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleDeletePlan}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-white hover:bg-black disabled:opacity-60"
                >
                  {saving ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
