import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, Flag, Image as ImageIcon, MessageSquareText, ShieldCheck, X } from 'lucide-react';
import UserPageShell from '../../components/UserPageShell';
import ticketApi from '../../api/ticketApi';

const CATEGORIES = [
  'Connection Issue',
  'Technical Problem',
  'Billing Concern',
  'Channel Concern',
  'Technician Request',
  'Other',
];

export default function UserReportProblem() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state || {};

  const [form, setForm] = useState({
    category: CATEGORIES.includes(prefill.prefillCategory)
      ? prefill.prefillCategory
      : 'Connection Issue',
    subject: prefill.prefillSubject || '',
    description: prefill.prefillIssueDescription || prefill.prefillDescription || '',
  });
  const [attachedPhoto, setAttachedPhoto] = useState(prefill.prefillScreenPhotoFile || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.subject.trim()) {
      setError('Subject is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await ticketApi.createTicket({
        category: form.category,
        subject: form.subject.trim(),
        description: form.description.trim(),
      });

      const ticketId = response.data?.id;

      if (ticketId && (form.description.trim() || attachedPhoto)) {
        if (attachedPhoto) {
          await ticketApi.sendTicketAttachment(ticketId, {
            file: attachedPhoto,
            message: form.description.trim() || 'TV screen photo attached from Load Request signal check.',
          });
        } else if (form.description.trim()) {
          await ticketApi.sendTicketMessage(ticketId, form.description.trim());
        }
      }

      navigate('/user/tickets');
    } catch (submitError) {
      setError(
        submitError.response?.data?.error ||
          'Failed to submit. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserPageShell
      title="Report a Problem"
      description="Send the complete details of your concern so the support team can review it faster."
      icon={Flag}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          {prefill.prefillSubject && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                <p>
                  Details were carried over from the Load Request signal check. Review and edit them before submitting.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#cc0000] focus:ring-4 focus:ring-red-100"
                  >
                    {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Subject *</label>
                  <input
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="Brief description of the issue"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#cc0000] focus:ring-4 focus:ring-red-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={10}
                  placeholder="Tell us what happened, when it started, and what troubleshooting steps you already tried."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#cc0000] focus:ring-4 focus:ring-red-100"
                />
              </div>

              {attachedPhoto && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ImageIcon size={17} className="text-blue-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-blue-700">TV screen photo attached</p>
                      <p className="truncate text-xs text-blue-600">{attachedPhoto.name || prefill.prefillScreenPhotoName || 'Uploaded TV screen photo'}</p>
                    </div>
                    <button type="button" onClick={() => setAttachedPhoto(null)} className="rounded-full p-1 text-blue-500 hover:bg-blue-100 hover:text-red-600" aria-label="Remove attached photo">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-400">Submitting creates a support ticket that you can monitor from My Tickets.</p>
                <button type="submit" disabled={loading} className="rounded-xl bg-[#cc0000] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? 'Submitting...' : 'Submit Support Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">What happens next</h2>
            <div className="mt-4 space-y-4">
              {[
                { icon: MessageSquareText, title: 'Ticket created', text: 'Your concern appears immediately in My Tickets.' },
                { icon: Clock3, title: 'Support review', text: 'The team checks your description, account, and attachments.' },
                { icon: ShieldCheck, title: 'Resolution update', text: 'Status changes and replies appear in the ticket conversation.' },
              ].map(({ icon: StepIcon, title, text }) => (
                <div key={title} className="flex gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><StepIcon size={16} /></div>
                  <div><p className="text-sm font-semibold text-slate-800">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{text}</p></div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-bold text-amber-800">For faster assistance</p>
            <p className="mt-2 text-xs leading-5 text-amber-700">Include the exact TV message or error code, when the issue started, and whether Channel 1 has a picture.</p>
          </div>
        </aside>
      </div>
    </UserPageShell>
  );

}
