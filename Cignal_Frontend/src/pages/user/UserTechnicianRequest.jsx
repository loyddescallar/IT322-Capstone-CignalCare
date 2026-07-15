import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarClock, CheckCircle2, Info, MapPin, PhoneCall, ShieldCheck, Upload, Wrench, X } from 'lucide-react';
import UserPageShell from '../../components/UserPageShell';
import axiosClient from '../../api/axiosClient';

const MAX_ATTACHMENT_MB = 8;

async function fileToBase64(file) {
  if (!file) return null;
  if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) throw new Error(`Image must be ${MAX_ATTACHMENT_MB}MB or smaller.`);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });
}

const SERVICES = ['Signal / Dish Repair','Dish Realignment','Cable Replacement','Box Replacement','New Installation','Relocation','Other'];

export default function UserTechnicianRequest() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state || {};
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const fileInputRef = useRef(null);
  const initialFiles = prefill.prefillScreenPhotoFile ? [prefill.prefillScreenPhotoFile] : [];

  const [form, setForm] = useState({
    contactName:     user.accountName || '',
    contactPhone:    user.phone || '',
    altContact:      '',
    address:         user.address || '',
    landmark:        '',
    serviceType:     SERVICES.includes(prefill.prefillServiceType) ? prefill.prefillServiceType : 'Signal / Dish Repair',
    preferredDate:   '',
    preferredTime:   '',
    issueDescription:prefill.prefillIssueDescription || '',
  });
  const [files,   setFiles]   = useState(initialFiles);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const hc = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const addFiles = e => {
    const newFiles = Array.from(e.target.files || []).filter(file => file.size <= MAX_ATTACHMENT_MB * 1024 * 1024);
    setFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const removeFile = i => setFiles(prev => prev.filter((_, idx) => idx !== i));
  const formatSize = bytes => bytes > 1024*1024 ? (bytes/1024/1024).toFixed(1)+'MB' : (bytes/1024).toFixed(0)+'KB';

  const validate = () => {
    const e = {};
    if (!form.contactName.trim())      e.contactName      = 'Full name is required.';
    if (!form.contactPhone.trim())     e.contactPhone     = 'Phone number is required.';
    if (!form.address.trim())          e.address          = 'Service address is required.';
    if (!form.issueDescription.trim()) e.issueDescription = 'Issue description is required.';
    return e;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate(); setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      const firstImage = files.find(file => file.type?.startsWith('image/')) || null;
      const screenPhotoBase64 = firstImage ? await fileToBase64(firstImage) : null;

      await axiosClient.post('/technicians/requests', {
        accountNumber:    user.accountNumber || '',
        contactName:      form.contactName.trim(),
        contactPhone:     form.contactPhone.trim(),
        issueDescription: `[${form.serviceType}] ${form.issueDescription.trim()}${form.altContact?` | Alt: ${form.altContact}`:''}${form.landmark?` | Landmark: ${form.landmark}`:''}`,
        preferred_date:   form.preferredDate || null,
        preferred_time:   form.preferredTime || null,
        source:           prefill.source || null,
        screen_issue:     prefill.prefillScreenIssue || '',
        screen_photo:     screenPhotoBase64,
      });
      setSuccess(true);
    } catch(e) {
      console.error(e);
      setErrors({ submit: e.response?.data?.error || 'Unable to submit the technician request. Please try again.' });
    }
    finally { setLoading(false); }
  };


  return (
    <UserPageShell
      title="Request a Technician"
      description="Provide your service address, preferred schedule, and issue details for an on-site visit."
      icon={Wrench}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
            <Info size={16} className="mt-0.5 flex-shrink-0 text-blue-500" />
            <p className="text-sm leading-6 text-blue-700">Our team will contact you to confirm the final schedule. Service hours are Monday to Saturday, 8:00 AM to 5:00 PM.</p>
          </div>

          {prefill.prefillIssueDescription && (
            <div className="flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50 px-4 py-3">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-green-600" />
              <p className="text-sm leading-6 text-green-700">
                {prefill.source === 'load_request_signal_check'
                  ? 'The selected TV issue and uploaded photo from Load Request were carried over for technician review.'
                  : 'Troubleshooting details were added automatically. Review them before submitting.'}
              </p>
            </div>
          )}

          {Object.keys(errors).length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="mb-1 text-sm font-semibold text-red-700">Please review the following:</p>
              {Object.values(errors).map((message, index) => <p key={index} className="text-xs leading-5 text-red-600">• {message}</p>)}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <form onSubmit={handleSubmit} className="space-y-7">
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <PhoneCall size={16} className="text-[#cc0000]" />
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Account and Contact</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-600">Full Name *</label>
                    <input name="contactName" value={form.contactName} onChange={hc} className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[#cc0000] focus:ring-4 focus:ring-red-100 ${errors.contactName ? 'border-red-400' : 'border-slate-200'}`} />
                    {errors.contactName && <p className="mt-1 text-xs text-red-600">{errors.contactName}</p>}
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-600">Phone Number *</label>
                    <input name="contactPhone" value={form.contactPhone} onChange={hc} placeholder="09XXXXXXXXX" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[#cc0000] focus:ring-4 focus:ring-red-100 ${errors.contactPhone ? 'border-red-400' : 'border-slate-200'}`} />
                    {errors.contactPhone && <p className="mt-1 text-xs text-red-600">{errors.contactPhone}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-semibold text-slate-600">Alternative Contact <span className="font-normal text-slate-400">(optional)</span></label>
                    <input name="altContact" value={form.altContact} onChange={hc} placeholder="09XXXXXXXXX" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#cc0000] focus:ring-4 focus:ring-red-100" />
                  </div>
                </div>
              </section>

              <section className="border-t border-slate-100 pt-6">
                <div className="mb-4 flex items-center gap-2">
                  <MapPin size={16} className="text-[#cc0000]" />
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Service Location</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-semibold text-slate-600">Complete Service Address *</label>
                    <input name="address" value={form.address} onChange={hc} placeholder="House No., Street, Barangay, Municipality" className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[#cc0000] focus:ring-4 focus:ring-red-100 ${errors.address ? 'border-red-400' : 'border-slate-200'}`} />
                    {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-semibold text-slate-600">Landmark or Directions <span className="font-normal text-slate-400">(optional)</span></label>
                    <input name="landmark" value={form.landmark} onChange={hc} placeholder="Near the church, beside the blue gate" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#cc0000] focus:ring-4 focus:ring-red-100" />
                  </div>
                </div>
              </section>

              <section className="border-t border-slate-100 pt-6">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarClock size={16} className="text-[#cc0000]" />
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Service Details</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-600">Type of Service</label>
                    <select name="serviceType" value={form.serviceType} onChange={hc} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#cc0000] focus:ring-4 focus:ring-red-100">
                      {SERVICES.map((service) => <option key={service}>{service}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-600">Preferred Date</label>
                      <input type="date" name="preferredDate" value={form.preferredDate} onChange={hc} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-[#cc0000] focus:ring-4 focus:ring-red-100" />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-600">Preferred Time</label>
                      <input type="time" name="preferredTime" value={form.preferredTime} onChange={hc} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-[#cc0000] focus:ring-4 focus:ring-red-100" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-semibold text-slate-600">Issue Description *</label>
                    <textarea name="issueDescription" value={form.issueDescription} onChange={hc} rows={6} placeholder="Describe the problem, what you already tried, and when it started." className={`w-full resize-none rounded-xl border px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#cc0000] focus:ring-4 focus:ring-red-100 ${errors.issueDescription ? 'border-red-400' : 'border-slate-200'}`} />
                    {errors.issueDescription && <p className="mt-1 text-xs text-red-600">{errors.issueDescription}</p>}
                  </div>
                </div>
              </section>

              <section className="border-t border-slate-100 pt-6">
                <div className="mb-4 flex items-center gap-2">
                  <Upload size={16} className="text-[#cc0000]" />
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Attachments <span className="font-normal normal-case text-slate-400">(optional)</span></h2>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={addFiles} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-5 text-sm font-medium text-slate-500 transition hover:border-[#cc0000] hover:bg-red-50 hover:text-[#cc0000]">
                  <Upload size={17} /> Attach photos or videos of the issue
                </button>
                {prefill.prefillScreenPhotoFile && <p className="mt-2 text-xs font-semibold text-green-700">✓ TV screen photo from Load Request was attached automatically.</p>}
                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${file.type.startsWith('image') ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{file.type.startsWith('image') ? 'Image' : 'Video'}</span>
                        <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{file.name}</span>
                        <span className="text-xs text-slate-400">{formatSize(file.size)}</span>
                        <button type="button" onClick={() => removeFile(index)} className="text-slate-400 hover:text-red-500" aria-label={`Remove ${file.name}`}><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <div className="flex justify-end border-t border-slate-100 pt-6">
                <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#cc0000] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                  {loading ? 'Submitting...' : 'Submit Technician Request'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Request summary</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Account</dt><dd className="text-right font-semibold text-slate-800">{user.accountNumber || 'Not available'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Service</dt><dd className="text-right font-semibold text-slate-800">{form.serviceType}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Preferred date</dt><dd className="text-right font-semibold text-slate-800">{form.preferredDate || 'To be confirmed'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Attachments</dt><dd className="text-right font-semibold text-slate-800">{files.length}</dd></div>
            </dl>
          </div>

          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="flex gap-3">
              <ShieldCheck size={19} className="mt-0.5 flex-shrink-0 text-green-600" />
              <div><p className="text-sm font-bold text-green-800">Schedule confirmation</p><p className="mt-1 text-xs leading-5 text-green-700">The preferred date and time are requests only. A representative will confirm availability through your phone number.</p></div>
            </div>
          </div>
        </aside>
      </div>

      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"><CheckCircle2 size={32} className="text-green-600" /></div>
            <h2 className="mb-2 text-xl font-bold text-slate-800">Request Submitted</h2>
            <p className="mb-6 text-sm leading-6 text-slate-500">Our team will contact <strong>{form.contactPhone}</strong> to confirm the technician schedule.</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => navigate('/user/tickets')} className="w-full rounded-xl bg-[#cc0000] py-3 font-semibold text-white hover:bg-red-700">View My Tickets</button>
              <button onClick={() => { setSuccess(false); setForm({ contactName:user.accountName||'', contactPhone:user.phone||'', altContact:'', address:user.address||'', landmark:'', serviceType:'Signal / Dish Repair', preferredDate:'', preferredTime:'', issueDescription:'' }); setFiles([]); }} className="w-full rounded-xl border border-slate-200 py-3 text-sm text-slate-600 hover:bg-slate-50">Submit Another Request</button>
            </div>
          </div>
        </div>
      )}
    </UserPageShell>
  );

}
