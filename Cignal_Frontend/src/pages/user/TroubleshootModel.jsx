import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, RefreshCcw, Tv } from 'lucide-react';
import troubleshootApi from '../../api/troubleshootApi';
import UserLayout from '../../components/UserLayout';

export default function TroubleshootModel() {
  const { modelId } = useParams();
  const navigate = useNavigate();
  const [model, setModel] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadModelAndIssues() {
      setLoading(true);
      setError('');

      try {
        const [modelsResponse, issuesResponse] = await Promise.all([
          troubleshootApi.getModels(),
          troubleshootApi.getIssuesByModel(modelId),
        ]);

        if (!active) return;

        const models = modelsResponse.data?.models || [];
        const selectedModel = models.find(
          (item) => String(item.id) === String(modelId)
        );

        if (!selectedModel) {
          setModel(null);
          setIssues([]);
          setError('The selected box model is not available.');
          return;
        }

        setModel(selectedModel);
        setIssues(issuesResponse.data?.issues || []);
      } catch (loadError) {
        console.error('LOAD TROUBLESHOOT MODEL ERROR:', loadError);
        if (active) {
          setError(
            loadError.response?.data?.error ||
              'Unable to load this troubleshooting model.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadModelAndIssues();
    return () => {
      active = false;
    };
  }, [modelId, reloadKey]);

  if (loading) {
    return (
      <UserLayout>
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-red-100 border-t-[#cc0000]" />
            <p className="mt-4 text-sm font-semibold text-slate-500">
              Loading troubleshooting guides...
            </p>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (error || !model) {
    return (
      <UserLayout>
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <AlertCircle size={38} className="mx-auto text-red-500" />
            <h1 className="mt-4 text-xl font-black text-slate-900">
              Box model unavailable
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {error || 'The selected model may no longer be available.'}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                <RefreshCcw size={16} />
                Try Again
              </button>
              <button
                type="button"
                onClick={() => navigate('/troubleshoot')}
                className="rounded-xl bg-[#cc0000] px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Return to Box Models
              </button>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="min-h-screen bg-slate-50">
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
              <div className="flex h-28 w-36 flex-shrink-0 items-center justify-center rounded-2xl border border-red-100 bg-red-50 p-4 text-[#cc0000]">
                {model.image ? (
                  <img
                    src={model.image}
                    alt={model.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Tv size={54} strokeWidth={1.6} />
                )}
              </div>
              <div>
                {model.type && (
                  <p className="mb-1 text-xs font-black uppercase tracking-wide text-[#cc0000]">
                    {model.type} Receiver
                  </p>
                )}
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {model.name}
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  {model.description ||
                    'Choose the symptom or error shown on your television.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            {issues.map((issue) => (
              <button
                key={issue.id}
                type="button"
                onClick={() =>
                  navigate(`/troubleshoot/${model.id}/${issue.id}`)
                }
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900 transition-colors group-hover:text-[#cc0000]">
                        {issue.title}
                      </h2>
                      {issue.error_code && (
                        <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#cc0000]">
                          {issue.error_code}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {issue.description || 'Open this guide to view the configured troubleshooting steps.'}
                    </p>
                    {issue.category && (
                      <p className="mt-3 text-xs font-bold text-slate-400">
                        {issue.category}
                      </p>
                    )}
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

          {issues.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <AlertCircle size={34} className="mx-auto text-slate-300" />
              <h2 className="mt-4 font-bold text-slate-800">
                No troubleshooting guides available
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                There are currently no guides configured for this box model.
              </p>
            </div>
          )}
        </main>
      </div>
    </UserLayout>
  );
}
