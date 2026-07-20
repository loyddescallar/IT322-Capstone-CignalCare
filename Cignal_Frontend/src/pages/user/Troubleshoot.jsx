import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCcw, TicketPlus, Tv, Wrench } from 'lucide-react';
import troubleshootApi from '../../api/troubleshootApi';
import UserLayout from '../../components/UserLayout';

export default function Troubleshoot() {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [entranceFinished, setEntranceFinished] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadModels() {
      setLoading(true);
      setError('');

      try {
        const response = await troubleshootApi.getModels();
        if (!active) return;
        setModels(response.data?.models || []);
      } catch (loadError) {
        console.error('LOAD TROUBLESHOOT MODELS ERROR:', loadError);
        if (active) {
          setError(
            loadError.response?.data?.error ||
              'Unable to load troubleshooting guides right now.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadModels();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (loading || error) return undefined;

    setLoaded(false);
    setEntranceFinished(false);

    const loadTimer = window.setTimeout(() => setLoaded(true), 80);
    const finishTimer = window.setTimeout(
      () => setEntranceFinished(true),
      models.length * 90 + 700
    );

    return () => {
      window.clearTimeout(loadTimer);
      window.clearTimeout(finishTimer);
    };
  }, [error, loading, models.length]);

  return (
    <UserLayout>
      <div className="min-h-screen bg-white">
        <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight text-[#cc0000]">
              Troubleshoot Your Box
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Select your Cignal box model to view its troubleshooting guides.
            </p>
          </div>

          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-16 text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-red-100 border-t-[#cc0000]" />
              <p className="mt-4 text-sm font-semibold text-slate-500">
                Loading troubleshooting guides...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
              <AlertCircle size={36} className="mx-auto text-[#cc0000]" />
              <p className="mt-4 text-sm font-semibold text-slate-700">{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#cc0000] px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
              >
                <RefreshCcw size={16} />
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {models.map((model, index) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => navigate(`/troubleshoot/${model.id}`)}
                    style={{
                      transitionDelay: entranceFinished ? '0ms' : `${index * 90}ms`,
                    }}
                    className={`group relative flex min-h-[215px] w-full flex-col overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-[0_5px_18px_rgba(0,0,0,0.08)] transition-all duration-500 ease-out hover:-translate-y-2 hover:border-red-300 hover:shadow-[0_14px_32px_rgba(204,0,0,0.18)] active:scale-[0.98] ${
                      loaded
                        ? 'translate-y-0 border-gray-200 opacity-100'
                        : 'translate-y-8 border-gray-100 opacity-0'
                    }`}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-50/90 via-white to-white opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                    <div className="relative z-10 flex h-32 w-full items-center justify-center">
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-red-50 text-[#cc0000] transition-transform duration-500 group-hover:scale-110">
                        <Tv size={48} strokeWidth={1.7} />
                      </div>
                    </div>

                    <div className="relative z-10 mt-auto pt-5">
                      <h2 className="text-lg font-bold text-gray-800 transition-colors duration-300 group-hover:text-[#cc0000]">
                        {model.name}
                      </h2>
                      {model.description && (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                          {model.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {Number(model.issue_count || 0)} troubleshooting guides
                        </p>
                        <span className="translate-x-2 text-xl font-bold text-[#cc0000] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                          →
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {models.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                  <AlertCircle size={34} className="mx-auto text-slate-300" />
                  <h2 className="mt-4 font-bold text-slate-800">
                    No active box models available
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Troubleshooting models have not been configured yet.
                  </p>
                </div>
              )}
            </>
          )}

          <section className="mt-12 rounded-2xl border border-red-100 bg-red-50 px-6 py-7 text-center">
            <h2 className="font-bold text-gray-800">Cannot find a solution?</h2>
            <p className="mt-1 text-sm text-gray-600">
              Our support team is available to assist you.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/user/report-problem')}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-600 to-red-600 px-7 py-3 text-sm font-bold text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-95"
              >
                <TicketPlus size={17} />
                File Support Ticket
              </button>
              <button
                type="button"
                onClick={() => navigate('/user/technician-request')}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-700 px-7 py-3 text-sm font-bold text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-slate-800 hover:shadow-lg active:scale-95"
              >
                <Wrench size={17} />
                Request Technician
              </button>
            </div>
          </section>
        </main>
      </div>
    </UserLayout>
  );
}
