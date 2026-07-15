import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BrainCircuit,
  User,
  Hash,
  Phone,
  MapPin,
  Home,
  Flag,
  Ticket,
  Wrench,
  Smartphone,
  FileSearch,
  Stethoscope,
  ExternalLink,
} from 'lucide-react';
import authApi from '../../api/authApi';

const LOGO_SRC = '/images/CignalLogo4.png';

const STORE_MAP_URL = 'https://maps.app.goo.gl/YHL3P8gkgahP5MXLA';
const FACEBOOK_PAGE_URL = 'https://www.facebook.com/CignalTVBalayan';

const SERVICE_AREAS = {
  Balayan: [
    'Baclaran',
    'Barangay 1',
    'Barangay 2',
    'Barangay 3',
    'Barangay 4',
    'Barangay 5',
    'Barangay 6',
    'Barangay 7',
    'Barangay 8',
    'Barangay 9',
    'Barangay 10',
    'Barangay 11',
    'Barangay 12',
    'Calan',
    'Caloocan',
    'Calzada',
    'Canda',
    'Carenahan',
    'Caybunga',
    'Cayponce',
    'Dalig',
    'Dao',
    'Dilao',
    'Duhatan',
    'Durungao',
    'Gimalas',
    'Gumamela',
    'Lagnas',
    'Lanatan',
    'Langgangan',
    'Lucban Pook',
    'Lucban Putol',
    'Magabe',
    'Malalay',
    'Munting Tubig',
    'Navotas',
    'Palikpikan',
    'Patugo',
    'Pooc',
    'Sambat',
    'Sampaga',
    'San Juan',
    'San Piro',
    'Santol',
    'Sukol',
    'Tactac',
    'Taludtud',
    'Tanggoy',
  ],

  'Calaca City': [
    'Bagong Tubig',
    'Baclas',
    'Balimbing',
    'Bambang',
    'Barangay 1',
    'Barangay 2',
    'Barangay 3',
    'Barangay 4',
    'Barangay 5',
    'Barangay 6',
    'Bisaya',
    'Cahil',
    'Calantas',
    'Caluangan',
    'Camastilisan',
    'Coral Ni Bacal',
    'Coral Ni Lopez',
    'Dacanlao',
    'Dila',
    'Loma',
    'Lumbang Calzada',
    'Lumbang Na Bata',
    'Lumbang Na Matanda',
    'Madalunot',
    'Makina',
    'Matipok',
    'Munting Coral',
    'Niyugan',
    'Pantay',
    'Puting Bato East',
    'Puting Bato West',
    'Puting Kahoy',
    'Quisumbing',
    'Salong',
    'Sinisian',
    'Taklang Anak',
    'Talisay',
    'Tamayo',
    'Timbain',
  ],

  Lemery: [
    'Anak-Dagat',
    'Arumahan',
    'Ayao-iyao',
    'Bagong Pook',
    'Bagong Sikat',
    'Balanga',
    'Bukal',
    'Cahilan I',
    'Cahilan II',
    'Dayapan',
    'Dita',
    'District I',
    'District II',
    'District III',
    'District IV',
    'Gulod',
    'Lucky',
    'Maguihan',
    'Mahabang Dahilig',
    'Mahayahay',
    'Maigsing Dahilig',
    'Maligaya',
    'Malinis',
    'Masalisi',
    'Mataas Na Bayan',
    'Matingain I',
    'Matingain II',
    'Mayasang',
    'Niugan',
    'Nonong Casto',
    'Palanas',
    'Payapa Ibaba',
    'Payapa Ilaya',
    'Rizal',
    'Sambal Ibaba',
    'Sambal Ilaya',
    'San Isidro Ibaba',
    'San Isidro Itaas',
    'Sangalang',
    'Sinisian East',
    'Sinisian West',
    'Talaga',
    'Tubigan',
    'Tubuan',
    'Wawa Ibaba',
    'Wawa Ilaya',
  ],

  Calatagan: [
    'Bagong Silang',
    'Baha',
    'Balibago',
    'Balitoc',
    'Biga',
    'Bucal',
    'Carlosa',
    'Carretunan',
    'Encarnacion',
    'Gulod',
    'Hukay',
    'Lucsuhin',
    'Luya',
    'Paraiso',
    'Barangay 1',
    'Barangay 2',
    'Barangay 3',
    'Barangay 4',
    'Quilitisan',
    'Real',
    'Sambungan',
    'Santa Ana',
    'Talibayog',
    'Talisay',
    'Tanagan',
  ],

  Lian: [
    'Bagong Pook',
    'Balibago',
    'Binubusan',
    'Bungahan',
    'Cumba',
    'Humayingan',
    'Kapito',
    'Lumaniag',
    'Luyahan',
    'Malaruhatan',
    'Matabungkay',
    'Barangay 1',
    'Barangay 2',
    'Barangay 3',
    'Barangay 4',
    'Barangay 5',
    'Prenza',
    'Puting-Kahoy',
    'San Diego',
  ],

  Nasugbu: [
    'Aga',
    'Balaytigui',
    'Banilad',
    'Barangay 1',
    'Barangay 2',
    'Barangay 3',
    'Barangay 4',
    'Barangay 5',
    'Barangay 6',
    'Barangay 7',
    'Barangay 8',
    'Barangay 9',
    'Barangay 10',
    'Barangay 11',
    'Barangay 12',
    'Bilaran',
    'Bucana',
    'Bulihan',
    'Bunducan',
    'Butucan',
    'Calayo',
    'Catandaan',
    'Cogunan',
    'Dayap',
    'Kaylaway',
    'Kayrilaw',
    'Latag',
    'Looc',
    'Lumbangan',
    'Malapad Na Bato',
    'Mataas Na Pulo',
    'Maugat',
    'Munting Indan',
    'Natipuan',
    'Pantalan',
    'Papaya',
    'Putat',
    'Reparo',
    'Talangan',
    'Tumalim',
    'Utod',
    'Wawa',
  ],
};

const SERVICE_FEATURES = [
  {
    icon: Flag,
    title: 'Report a Problem',
    desc: 'Submit signal, billing, account, or service concerns.',
  },
  {
    icon: Ticket,
    title: 'My Tickets',
    desc: 'Track submitted concerns and admin replies.',
  },
  {
    icon: Wrench,
    title: 'Technician Request',
    desc: 'Request help for signal, dish, box, or installation issues.',
  },
  {
    icon: Stethoscope,
    title: 'Troubleshoot',
    desc: 'Use guided steps before creating a support request.',
  },
  {
    icon: Smartphone,
    title: 'Load Request',
    desc: 'Submit prepaid load requests and monitor payment status.',
  },
  {
    icon: FileSearch,
    title: 'CCA Inquiry',
    desc: 'Check account information using account or CCA number.',
  },
];

const KEYBOARD_PATTERNS = ['qwerty', 'asdf', 'zxcv', '1234', 'abcd', 'aaaa', 'bbbb'];

function GoogleMapsLogo({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#1a73e8"
        d="M24 4C15.7 4 9 10.7 9 19c0 10.8 15 25 15 25s15-14.2 15-25C39 10.7 32.3 4 24 4z"
      />
      <path
        fill="#34a853"
        d="M24 4C15.7 4 9 10.7 9 19c0 5.6 4 12.4 8.1 17.6L24 24V4z"
      />
      <path
        fill="#fbbc04"
        d="M24 24l6.9 12.6C35 31.4 39 24.6 39 19c0-4.2-1.7-8-4.4-10.7L24 24z"
      />
      <path fill="#ea4335" d="M24 4v20L13.4 8.3C16.1 5.7 19.8 4 24 4z" />
      <circle cx="24" cy="19" r="5.5" fill="#ffffff" />
    </svg>
  );
}

function FacebookLogo({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#1877F2" />
      <path
        fill="#ffffff"
        d="M29.8 25.4l.8-5.2h-5v-3.4c0-1.4.7-2.8 2.9-2.8h2.3V9.6S28.7 9 26.7 9c-4.2 0-7 2.6-7 7.2v4h-4.7v5.2h4.7V38h5.9V25.4h4.2z"
      />
    </svg>
  );
}

function validateName(value) {
  const v = value.trim();

  if (!v) return { ok: false, error: 'Full name is required.' };
  if (/\d/.test(v)) return { ok: false, error: 'Name cannot contain numbers.' };

  const words = v.split(/\s+/);

  if (words.length < 2) {
    return {
      ok: false,
      warning: 'Please enter your full name, including first and last name.',
    };
  }

  if (words.some((word) => word.length < 2)) {
    return {
      ok: false,
      error: 'Each name part must be at least 2 characters.',
    };
  }

  const lower = v.toLowerCase();

  if (KEYBOARD_PATTERNS.some((pattern) => lower.includes(pattern))) {
    return {
      ok: false,
      error: 'Name looks invalid. Please enter your real registered name.',
    };
  }

  const lettersOnly = lower.replace(/[^a-z]/g, '');
  const vowelCount = (lettersOnly.match(/[aeiou]/g) || []).length;
  const vowelRatio = lettersOnly.length ? vowelCount / lettersOnly.length : 0;

  if (vowelRatio < 0.1) {
    return {
      ok: false,
      error: 'Name does not look valid. Please use your actual registered name.',
    };
  }

  return { ok: true };
}

function validateAccountNumber(value) {
  const v = value.trim();

  if (!v) return { ok: false, error: 'Account number is required.' };

  if (!/^\d{8}$/.test(v)) {
    return {
      ok: false,
      error: 'Account number must be exactly 8 digits.',
    };
  }

  if (/(\d)\1{7}/.test(v)) {
    return {
      ok: false,
      error: 'Account number cannot be all the same digit.',
    };
  }

  return { ok: true };
}

function validateCcaNumber(value) {
  const v = value.trim();

  if (!v) return { ok: false, error: 'CCA number is required.' };

  if (v.length < 4) {
    return {
      ok: false,
      warning: 'CCA number seems short. Please check your Cignal details.',
    };
  }

  return { ok: true };
}

function validatePhone(value) {
  const v = value.trim();

  if (!v) return { ok: false, error: 'Phone number is required.' };

  if (!/^(09\d{9}|\+639\d{9})$/.test(v)) {
    return {
      ok: false,
      error: 'Use a valid PH mobile number: 09XXXXXXXXX or +639XXXXXXXXX.',
    };
  }

  return { ok: true };
}

function validateMunicipality(value) {
  if (!value) {
    return {
      ok: false,
      error: 'Please select your municipality or city.',
    };
  }

  if (!SERVICE_AREAS[value]) {
    return {
      ok: false,
      error: 'Selected area is outside the current business coverage.',
    };
  }

  return { ok: true };
}

function validateBarangay(municipality, barangay) {
  if (!municipality) {
    return {
      ok: false,
      error: 'Select municipality or city first.',
    };
  }

  if (!barangay) {
    return {
      ok: false,
      error: 'Please select your barangay.',
    };
  }

  if (!SERVICE_AREAS[municipality]?.includes(barangay)) {
    return {
      ok: false,
      error: 'Barangay does not match the selected municipality/city.',
    };
  }

  return { ok: true };
}

function validateAddressDetail(value) {
  const v = value.trim();

  if (!v) {
    return {
      ok: false,
      error: 'House number, street, sitio, purok, or landmark is required.',
    };
  }

  if (v.length < 5) {
    return {
      ok: false,
      warning: 'Address detail seems short. Add street, sitio, purok, or landmark.',
    };
  }

  return { ok: true };
}

function FieldStatus({ validation, touched }) {
  if (!touched || !validation) return null;

  if (validation.ok) {
    return (
      <div className="mt-1 flex items-center gap-1">
        <CheckCircle2 size={12} className="text-green-500" />
        <span className="text-xs text-green-600">Looks good!</span>
      </div>
    );
  }

  if (validation.warning) {
    return (
      <div className="mt-1 flex items-center gap-1">
        <AlertTriangle size={12} className="text-amber-500" />
        <span className="text-xs text-amber-600">{validation.warning}</span>
      </div>
    );
  }

  if (validation.error) {
    return (
      <div className="mt-1 flex items-center gap-1">
        <XCircle size={12} className="text-red-500" />
        <span className="text-xs text-red-600">{validation.error}</span>
      </div>
    );
  }

  return null;
}

function inputBorder(validation, touched) {
  if (!touched) return 'border-gray-200 focus:border-[#cc0000]';
  if (!validation) return 'border-gray-200 focus:border-[#cc0000]';
  if (validation.ok) return 'border-green-400 focus:border-green-500';
  if (validation.warning) return 'border-amber-400 focus:border-amber-500';
  return 'border-red-400 focus:border-red-500';
}

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    accountName: '',
    accountNumber: '',
    ccaNumber: '',
    municipality: '',
    barangay: '',
    addressDetail: '',
    phone: '',
  });

  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const barangayOptions = form.municipality
    ? SERVICE_AREAS[form.municipality] || []
    : [];

  const fullAddress =
    form.municipality && form.barangay && form.addressDetail.trim()
      ? `${form.addressDetail.trim()}, Brgy. ${form.barangay}, ${form.municipality}, Batangas`
      : '';

  const validations = {
    accountName: validateName(form.accountName),
    accountNumber: validateAccountNumber(form.accountNumber),
    ccaNumber: validateCcaNumber(form.ccaNumber),
    municipality: validateMunicipality(form.municipality),
    barangay: validateBarangay(form.municipality, form.barangay),
    addressDetail: validateAddressDetail(form.addressDetail),
    phone: validatePhone(form.phone),
  };

  const allValid = Object.values(validations).every((validation) => validation.ok);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => {
      if (name === 'municipality') {
        return {
          ...prev,
          municipality: value,
          barangay: '',
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });

    setTouched((prev) => ({
      ...prev,
      [name]: true,
      ...(name === 'municipality' ? { barangay: false } : {}),
    }));

    if (serverError) setServerError('');
  };

  const touch = (name) => {
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setTouched({
      accountName: true,
      accountNumber: true,
      ccaNumber: true,
      municipality: true,
      barangay: true,
      addressDetail: true,
      phone: true,
    });

    if (!allValid) return;

    setLoading(true);
    setServerError('');

    try {
      await authApi.register({
        accountName: form.accountName.trim(),
        accountNumber: form.accountNumber.trim(),
        ccaNumber: form.ccaNumber.trim(),
        address: fullAddress,
        phone: form.phone.trim(),
        location:
          form.municipality === 'Calaca City'
            ? 'Calaca'
            : form.municipality,
      });

      navigate('/login');
    } catch (error) {
      setServerError(
        error.response?.data?.error || 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/video/background.mp4" type="video/mp4" />
      </video>

      {/* Video overlays */}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

      <main className="relative z-10 flex min-h-screen items-center px-5 py-8 sm:px-8 lg:px-12 xl:px-20">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] xl:gap-16">
          {/* LEFT PANEL */}
          <section className="hidden text-white lg:block">
            <div className="max-w-xl">
              <img
                src={LOGO_SRC}
                alt="Descallar Satellite Services Logo"
                className="mb-8 h-24 w-auto object-contain drop-shadow-xl"
              />

              <span className="inline-flex items-center gap-2 rounded-full border border-red-300/30 bg-red-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-red-100 backdrop-blur-md">
                <BrainCircuit size={15} />
                Smart Registration Validation
              </span>

              <h1 className="mt-6 text-5xl font-black leading-[1.08] tracking-tight xl:text-6xl">
                Create your
                <span className="block text-red-400">subscriber account.</span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-7 text-white/75">
                Register to manage support tickets, technician requests,
                troubleshooting, account inquiries, and prepaid load requests in
                one secure CignalCare+ portal.
              </p>

              <div className="mt-7 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <div className="mb-2 flex items-center gap-2">
                  <BrainCircuit size={18} className="text-red-300" />
                  <p className="text-sm font-bold">
                    Smart Registration Validation
                  </p>
                  <span className="ml-auto text-xs font-semibold text-green-300">
                    Active
                  </span>
                </div>

                <ul className="space-y-1 text-xs text-white/70">
                  <li>• Checks registered name format</li>
                  <li>• Validates account and CCA details</li>
                  <li>• Limits registration to supported service areas</li>
                  <li>• Ensures barangay matches selected municipality/city</li>
                </ul>
              </div>

              <div className="mt-6 grid max-w-xl grid-cols-2 gap-3">
                {SERVICE_FEATURES.map((feature) => {
                  const Icon = feature.icon;

                  return (
                    <div
                      key={feature.title}
                      className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md"
                    >
                      <Icon size={18} className="text-red-300" />
                      <p className="mt-2 text-xs font-black text-white">
                        {feature.title}
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-white/60">
                        {feature.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 grid max-w-lg grid-cols-2 gap-4">
                <a
                  href={STORE_MAP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-bold text-gray-900 shadow-xl transition hover:-translate-y-0.5 hover:bg-red-50"
                >
                  <GoogleMapsLogo className="h-5 w-5" />
                  Store Location
                  <ExternalLink size={13} className="text-gray-500" />
                </a>

                <a
                  href={FACEBOOK_PAGE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-white/35 bg-white/10 px-4 py-3 text-xs font-bold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20"
                >
                  <FacebookLogo className="h-5 w-5" />
                  Facebook Page
                  <ExternalLink size={13} className="text-white/70" />
                </a>
              </div>

              <p className="mt-10 text-xs text-white/45">
                © 2026 Descallar Satellite Services. All rights reserved.
              </p>
            </div>
          </section>

          {/* RIGHT PANEL */}
          <section className="flex justify-center lg:justify-end">
            <div className="w-full max-w-lg">
              {/* Mobile logo */}
              <div className="mb-5 flex justify-center lg:hidden">
                <img
                  src={LOGO_SRC}
                  alt="Descallar Satellite Services Logo"
                  className="h-28 w-auto max-w-[360px] object-contain drop-shadow-xl sm:h-36"
                />
              </div>

              <div className="rounded-[28px] border border-white/25 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
                <div className="mb-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-7 w-1.5 rounded-full bg-[#cc0000]" />

                    <div>
                      <h2 className="text-2xl font-black text-gray-900">
                        Create Account
                      </h2>
                      <p className="mt-1 text-xs text-gray-500">
                        Register using your Cignal account details.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        size={16}
                        className="mt-0.5 flex-shrink-0 text-amber-600"
                      />

                      <p className="text-xs leading-5 text-amber-700">
                        Use your registered Cignal account name, valid account
                        number, and CCA number to avoid verification issues.
                      </p>
                    </div>
                  </div>
                </div>

                {serverError && (
                  <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {serverError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                      Full Name *
                    </label>

                    <div className="relative">
                      <User
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        name="accountName"
                        value={form.accountName}
                        onChange={handleChange}
                        onBlur={() => touch('accountName')}
                        placeholder="Juan Dela Cruz"
                        className={`w-full rounded-xl border bg-white py-3.5 pl-11 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:ring-4 focus:ring-red-100 ${inputBorder(
                          validations.accountName,
                          touched.accountName
                        )}`}
                      />
                    </div>

                    <FieldStatus
                      validation={validations.accountName}
                      touched={touched.accountName}
                    />
                  </div>

                  {/* Account Number */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                      Account Number *
                      <span className="ml-1 font-normal normal-case text-gray-400">
                        8 digits
                      </span>
                    </label>

                    <div className="relative">
                      <Hash
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        name="accountNumber"
                        value={form.accountNumber}
                        onChange={handleChange}
                        onBlur={() => touch('accountNumber')}
                        placeholder="12345678"
                        maxLength={8}
                        className={`w-full rounded-xl border bg-white py-3.5 pl-11 pr-4 font-mono text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:ring-4 focus:ring-red-100 ${inputBorder(
                          validations.accountNumber,
                          touched.accountNumber
                        )}`}
                      />
                    </div>

                    <div className="mt-1 flex gap-1">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <div
                          key={index}
                          className={`h-1 flex-1 rounded-full ${
                            index < form.accountNumber.length
                              ? 'bg-[#cc0000]'
                              : 'bg-gray-100'
                          }`}
                        />
                      ))}
                    </div>

                    <FieldStatus
                      validation={validations.accountNumber}
                      touched={touched.accountNumber}
                    />
                  </div>

                  {/* CCA Number */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                      CCA Number *
                    </label>

                    <div className="relative">
                      <Hash
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        name="ccaNumber"
                        value={form.ccaNumber}
                        onChange={handleChange}
                        onBlur={() => touch('ccaNumber')}
                        placeholder="Enter your CCA number"
                        className={`w-full rounded-xl border bg-white py-3.5 pl-11 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:ring-4 focus:ring-red-100 ${inputBorder(
                          validations.ccaNumber,
                          touched.ccaNumber
                        )}`}
                      />
                    </div>

                    <FieldStatus
                      validation={validations.ccaNumber}
                      touched={touched.ccaNumber}
                    />
                  </div>

                  {/* Municipality / City */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                      Municipality / City *
                    </label>

                    <div className="relative">
                      <MapPin
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <select
                        name="municipality"
                        value={form.municipality}
                        onChange={handleChange}
                        onBlur={() => touch('municipality')}
                        className={`w-full rounded-xl border bg-white py-3.5 pl-11 pr-4 text-sm text-gray-800 outline-none transition focus:ring-4 focus:ring-red-100 ${inputBorder(
                          validations.municipality,
                          touched.municipality
                        )}`}
                      >
                        <option value="">Select service area</option>
                        {Object.keys(SERVICE_AREAS).map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                    </div>

                    <FieldStatus
                      validation={validations.municipality}
                      touched={touched.municipality}
                    />
                  </div>

                  {/* Barangay */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                      Barangay *
                    </label>

                    <div className="relative">
                      <Home
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <select
                        name="barangay"
                        value={form.barangay}
                        onChange={handleChange}
                        onBlur={() => touch('barangay')}
                        disabled={!form.municipality}
                        className={`w-full rounded-xl border bg-white py-3.5 pl-11 pr-4 text-sm text-gray-800 outline-none transition disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 focus:ring-4 focus:ring-red-100 ${inputBorder(
                          validations.barangay,
                          touched.barangay
                        )}`}
                      >
                        <option value="">
                          {form.municipality
                            ? 'Select barangay'
                            : 'Select municipality/city first'}
                        </option>

                        {barangayOptions.map((barangay) => (
                          <option key={barangay} value={barangay}>
                            {barangay}
                          </option>
                        ))}
                      </select>
                    </div>

                    <FieldStatus
                      validation={validations.barangay}
                      touched={touched.barangay}
                    />
                  </div>

                  {/* Address Detail */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                      House No. / Street / Purok / Landmark *
                    </label>

                    <textarea
                      name="addressDetail"
                      value={form.addressDetail}
                      onChange={handleChange}
                      onBlur={() => touch('addressDetail')}
                      placeholder="Example: Purok 2, near barangay hall"
                      rows={2}
                      className={`w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:ring-4 focus:ring-red-100 ${inputBorder(
                        validations.addressDetail,
                        touched.addressDetail
                      )}`}
                    />

                    <FieldStatus
                      validation={validations.addressDetail}
                      touched={touched.addressDetail}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">
                      Phone Number *
                      <span className="ml-1 font-normal normal-case text-gray-400">
                        09XXXXXXXXX
                      </span>
                    </label>

                    <div className="relative">
                      <Phone
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        onBlur={() => touch('phone')}
                        placeholder="09123456789"
                        className={`w-full rounded-xl border bg-white py-3.5 pl-11 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:ring-4 focus:ring-red-100 ${inputBorder(
                          validations.phone,
                          touched.phone
                        )}`}
                      />
                    </div>

                    <FieldStatus
                      validation={validations.phone}
                      touched={touched.phone}
                    />
                  </div>

                  {/* Address Preview */}
                  {fullAddress && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                      <p className="text-xs font-bold text-blue-700">
                        Address Preview
                      </p>
                      <p className="mt-1 text-xs leading-5 text-blue-700">
                        {fullAddress}
                      </p>
                    </div>
                  )}

                  {/* Smart Validation Status */}
                  <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3">
                    <BrainCircuit
                      size={14}
                      className={allValid ? 'text-green-500' : 'text-[#cc0000]'}
                    />

                    <p className="text-xs text-gray-600">
                      {allValid
                        ? '✅ All fields validated. Ready to register!'
                        : '🔍 Smart validation is checking your inputs...'}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-[#cc0000] py-3.5 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-[#a90000] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Registering...' : 'Create Account'}
                  </button>
                </form>

                {/* Mobile store/social links */}
                <div className="mt-5 grid gap-2 border-t border-gray-100 pt-5 lg:hidden sm:grid-cols-2">
                  <a
                    href={STORE_MAP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-xs font-bold text-[#cc0000] transition hover:bg-red-100"
                  >
                    <GoogleMapsLogo className="h-5 w-5" />
                    Store Location
                  </a>

                  <a
                    href={FACEBOOK_PAGE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                  >
                    <FacebookLogo className="h-5 w-5" />
                    Facebook Page
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="mt-5 w-full text-center text-xs text-gray-500 transition hover:text-[#cc0000]"
                >
                  Already have an account?{' '}
                  <span className="font-bold">Sign In</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}