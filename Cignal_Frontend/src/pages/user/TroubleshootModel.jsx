import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { findBoxModel } from '../../data/troubleshootData';
import UserLayout from '../../components/UserLayout';

export default function TroubleshootModel() {
  const { modelId } = useParams();
  const navigate = useNavigate();

  const model = findBoxModel(modelId);

  if (!model) {
    return (
      <UserLayout>
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <AlertCircle size={38} className="mx-auto text-red-500" />

            <h1 className="mt-4 text-xl font-black text-slate-900">
              Box model not found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              The selected model may no longer be available.
            </p>

            <button
              type="button"
              onClick={() => navigate('/troubleshoot')}
              className="mt-6 rounded-xl bg-[#cc0000] px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Return to Box Models
            </button>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="min-h-screen bg-slate-50">
        {/* Model header */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => navigate('/troubleshoot')}
              className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-[#cc0000]"
            >
              <ArrowLeft size={15} />
              Back to Box Models
            </button>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-28 w-36 flex-shrink-0 items-center justify-center rounded-2xl border border-red-100 bg-red-50 p-4">
                <img
                  src={model.image}
                  alt={model.name}
                  className="h-full w-full object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';

                    const fallback =
                      event.currentTarget.nextElementSibling;

                    if (fallback) {
                      fallback.style.display = 'block';
                    }
                  }}
                />

                <span
                  style={{ display: 'none' }}
                  className="text-4xl"
                >
                  📺
                </span>
              </div>

              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {model.name}
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                  Choose the symptom or error shown on your television.
                </p>
              </div>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Issue cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {model.issues.map((issue) => (
              <button
                key={issue.id}
                type="button"
                onClick={() =>
                  navigate(
                    `/troubleshoot/${model.id}/${issue.id}`
                  )
                }
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-slate-900 transition-colors group-hover:text-[#cc0000]">
                      {issue.shortTitle}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {issue.description}
                    </p>
                  </div>

                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#cc0000] transition group-hover:bg-[#cc0000] group-hover:text-white">
                    <ArrowRight size={17} />
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4 text-xs font-bold text-[#cc0000]">
                  Start guided troubleshooting
                </div>
              </button>
            ))}
          </div>

          {model.issues.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <AlertCircle
                size={34}
                className="mx-auto text-slate-300"
              />

              <h2 className="mt-4 font-bold text-slate-800">
                No troubleshooting guides available
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                There are currently no guides available for this box model.
              </p>
            </div>
          )}
        </main>
      </div>
    </UserLayout>
  );
}