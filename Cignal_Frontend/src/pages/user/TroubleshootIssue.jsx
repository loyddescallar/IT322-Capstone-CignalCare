import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Cable,
  Check,
  CheckCircle2,
  Circle,
  CircleDot,
  ExternalLink,
  PlayCircle,
  Power,
  RefreshCcw,
  RotateCcw,
  SatelliteDish,
  ShieldCheck,
  TicketPlus,
  Wrench,
  XCircle,
  Youtube,
} from 'lucide-react';
import troubleshootApi from '../../api/troubleshootApi';
import UserLayout from '../../components/UserLayout';

const SAFETY_REMINDER =
  'Do not open the receiver or power adapter, touch exposed wiring, climb onto the roof, or adjust the satellite dish yourself. Stop and request professional assistance whenever a step cannot be completed safely.';

function ComponentIcon({ kind, size = 17 }) {
  if (kind === 'power') return <Power size={size} />;
  if (kind === 'signal') return <SatelliteDish size={size} />;
  if (kind === 'video') return <Cable size={size} />;
  if (kind === 'card') return <CircleDot size={size} />;
  return <Power size={size} />;
}

export default function TroubleshootIssue() {
  const { modelId, issueId } = useParams();
  const navigate = useNavigate();
  const storageKey = `troubleshoot-progress:${modelId}:${issueId}`;

  const [model, setModel] = useState(null);
  const [issue, setIssue] = useState(null);
  const [apiSteps, setApiSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [result, setResult] = useState(null);
  const [guideMode, setGuideMode] = useState('written');
  const outcomeSentRef = useRef(new Set());

  const steps = useMemo(
    () =>
      apiSteps.map((step) => ({
        id: String(step.id),
        sectionTitle: step.section_title || `Step ${step.step_number}`,
        instruction: step.instruction,
      })),
    [apiSteps]
  );

  const videos = issue?.video_guides || [];
  const video = videos[0] || null;
  const relatedComponents = useMemo(() => {
    const components = model?.guide?.components || [];
    const relatedIds = issue?.related_components || [];
    return components.filter((component) => relatedIds.includes(component.id));
  }, [issue, model]);

  useEffect(() => {
    let active = true;

    async function loadGuide() {
      setLoading(true);
      setError('');
      setResult(null);
      setGuideMode('written');

      try {
        const [modelsResponse, issuesResponse, stepsResponse] = await Promise.all([
          troubleshootApi.getModels(),
          troubleshootApi.getIssuesByModel(modelId),
          troubleshootApi.getStepsByIssue(issueId, modelId),
        ]);

        if (!active) return;

        const listModel = (modelsResponse.data?.models || []).find(
          (item) => String(item.id) === String(modelId)
        );
        const selectedModel =
          stepsResponse.data?.model || issuesResponse.data?.model || listModel;
        const selectedIssue =
          stepsResponse.data?.issue ||
          (issuesResponse.data?.issues || []).find(
            (item) => String(item.id) === String(issueId)
          );
        const loadedSteps = stepsResponse.data?.steps || [];

        if (!selectedModel || !selectedIssue) {
          setError('The selected troubleshooting guide is no longer available.');
          setModel(selectedModel || null);
          setIssue(selectedIssue || null);
          setApiSteps([]);
          return;
        }

        if (loadedSteps.length === 0) {
          setError('No troubleshooting steps are configured for this issue yet.');
          setModel(selectedModel);
          setIssue(selectedIssue);
          setApiSteps([]);
          return;
        }

        setModel(selectedModel);
        setIssue(selectedIssue);
        setApiSteps(loadedSteps);

        const validStepIds = new Set(loadedSteps.map((step) => String(step.id)));
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
          const savedCompleted = Array.isArray(saved.completedSteps)
            ? saved.completedSteps.map(String).filter((id) => validStepIds.has(id))
            : [];
          const savedCurrent = Number(saved.currentStep);
          setCompletedSteps(savedCompleted);
          setCurrentStep(
            Number.isInteger(savedCurrent) &&
              savedCurrent >= 0 &&
              savedCurrent < loadedSteps.length
              ? savedCurrent
              : 0
          );
        } catch {
          localStorage.removeItem(storageKey);
          setCompletedSteps([]);
          setCurrentStep(0);
        }
      } catch (loadError) {
        console.error('LOAD TROUBLESHOOT GUIDE ERROR:', loadError);
        if (active) {
          setError(
            loadError.response?.data?.error ||
              'Unable to load this troubleshooting guide.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadGuide();
    return () => {
      active = false;
    };
  }, [issueId, modelId, reloadKey, storageKey]);

  useEffect(() => {
    if (loading || !issue || steps.length === 0) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify({ currentStep, completedSteps })
    );
  }, [completedSteps, currentStep, issue, loading, steps.length, storageKey]);

  if (loading) {
    return (
      <UserLayout>
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-red-100 border-t-[#cc0000]" />
            <p className="mt-4 text-sm font-semibold text-slate-500">
              Loading troubleshooting guide...
            </p>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (error || !model || !issue || steps.length === 0) {
    return (
      <UserLayout>
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <XCircle size={40} className="mx-auto text-red-500" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Troubleshooting guide unavailable
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {error || 'Return to the model page and select another issue.'}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                <RefreshCcw size={16} /> Try Again
              </button>
              <button
                type="button"
                onClick={() => navigate(`/troubleshoot/${modelId}`)}
                className="rounded-xl bg-[#cc0000] px-5 py-3 text-sm font-bold text-white"
              >
                Back to Issues
              </button>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  const safeCurrentStep = Math.min(currentStep, steps.length - 1);
  const activeStep = steps[safeCurrentStep];
  const isCurrentCompleted = completedSteps.includes(activeStep.id);
  const progress = Math.round((completedSteps.length / steps.length) * 100);
  const issueTitle = issue.title || 'Troubleshooting issue';
  const completedSummary = `${completedSteps.length} of ${steps.length} troubleshooting steps completed`;
  const ticketDescription = [
    `Box model: ${model.name}`,
    `Issue: ${issueTitle}`,
    completedSummary,
    'Troubleshooting result: Issue still persists',
    '',
    'Additional details:',
  ].join('\n');

  const toggleCurrentStep = () => {
    setCompletedSteps((previous) =>
      previous.includes(activeStep.id)
        ? previous.filter((id) => id !== activeStep.id)
        : [...previous, activeStep.id]
    );
  };

  const goNext = () => {
    if (!isCurrentCompleted) {
      setCompletedSteps((previous) => [...previous, activeStep.id]);
    }
    if (safeCurrentStep < steps.length - 1) {
      setCurrentStep(safeCurrentStep + 1);
    }
  };

  const recordSupportOutcome = async (outcome) => {
    const key = `${modelId}:${issueId}:${outcome}`;
    if (outcomeSentRef.current.has(key)) return;
    outcomeSentRef.current.add(key);
    try {
      await troubleshootApi.recordOutcome({ modelId, issueId, outcome });
    } catch (outcomeError) {
      outcomeSentRef.current.delete(key);
      console.error('SAVE TROUBLESHOOT OUTCOME ERROR:', outcomeError);
    }
  };

  const restartGuide = () => {
    setCurrentStep(0);
    setCompletedSteps([]);
    setResult(null);
    setGuideMode('written');
    localStorage.removeItem(storageKey);
  };

  const markSolved = () => {
    setResult('solved');
    recordSupportOutcome('resolved');
  };

  const markUnsolved = () => {
    setResult('unsolved');
    recordSupportOutcome('unresolved');
  };

  const switchMode = (mode) => {
    setGuideMode(mode);
    setResult(null);
  };

  return (
    <UserLayout>
      <div className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => navigate(`/troubleshoot/${model.id}`)}
              className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-[#cc0000]"
            >
              <ArrowLeft size={15} /> Back to {model.name} Issues
            </button>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#cc0000]">
                    {model.name}{issue.category ? ` · ${issue.category}` : ''}
                  </span>
                  {model.source_url && (
                    <a
                      href={model.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 transition hover:text-[#cc0000]"
                    >
                      Official Cignal guide <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                  {issueTitle}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  {issue.description}
                </p>
              </div>

              <button
                type="button"
                onClick={restartGuide}
                className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-red-200 hover:text-[#cc0000]"
              >
                <RotateCcw size={15} /> Restart
              </button>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
          {video && !result && (
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Choose how you want to follow this guide
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => switchMode('written')}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                    guideMode === 'written'
                      ? 'border-red-300 bg-red-50 ring-1 ring-red-200'
                      : 'border-slate-200 hover:border-red-200'
                  }`}
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-[#cc0000] shadow-sm">
                    <BookOpen size={19} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-slate-900">Step-by-Step</span>
                    <span className="mt-1 block text-xs text-slate-500">Follow the exact guide for this box model.</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('video')}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                    guideMode === 'video'
                      ? 'border-red-300 bg-red-50 ring-1 ring-red-200'
                      : 'border-slate-200 hover:border-red-200'
                  }`}
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#cc0000] text-white shadow-sm">
                    <PlayCircle size={19} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-slate-900">Watch Video</span>
                    <span className="mt-1 block text-xs text-slate-500">Use the verified visual guide when you prefer watching.</span>
                  </span>
                </button>
              </div>
            </section>
          )}

          {relatedComponents.length > 0 && !result && (
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[#cc0000]">
                Parts involved
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {relatedComponents.map((component) => (
                  <span
                    key={component.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    <ComponentIcon kind={component.kind} />
                    {component.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {!result && guideMode === 'video' && video && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#cc0000]">
                        <Youtube size={12} /> Video Guide
                      </span>
                      {video.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          <ShieldCheck size={12} /> Verified source
                        </span>
                      )}
                      {video.coverage === 'partial' && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                          Supplemental
                        </span>
                      )}
                    </div>
                    <h2 className="mt-3 text-xl font-bold text-slate-900">{video.title}</h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {video.source_label || video.source}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchMode('written')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:border-red-200 hover:text-[#cc0000]"
                  >
                    <BookOpen size={14} /> Read Steps Instead
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-sm">
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.youtube_id)}?rel=0`}
                    title={video.title}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>

                {video.purpose && (
                  <p className="mt-4 text-sm leading-6 text-slate-600">{video.purpose}</p>
                )}

                {video.note && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={17} className="mt-0.5 flex-shrink-0 text-amber-700" />
                      <p className="text-xs leading-5 text-amber-900">{video.note}</p>
                    </div>
                  </div>
                )}

                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-900">Did the video solve your problem?</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={markSolved}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-700"
                    >
                      <CheckCircle2 size={17} /> Yes, problem solved
                    </button>
                    {video.coverage === 'full' ? (
                      <button
                        type="button"
                        onClick={markUnsolved}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                      >
                        <XCircle size={17} /> Still having the problem
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => switchMode('written')}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                      >
                        <BookOpen size={17} /> Continue model-specific steps
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {!result && guideMode === 'written' && (
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Your progress</p>
                  <span className="text-sm font-bold text-[#cc0000]">{progress}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#cc0000] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {completedSteps.length} of {steps.length} steps completed
                </p>

                <div className="mt-5 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {steps.map((step, index) => {
                    const completed = completedSteps.includes(step.id);
                    const active = safeCurrentStep === index;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => {
                          setCurrentStep(index);
                          setResult(null);
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                          active ? 'bg-red-50 ring-1 ring-red-200' : 'hover:bg-slate-50'
                        }`}
                      >
                        {completed ? (
                          <CheckCircle2 size={18} className="flex-shrink-0 text-green-600" />
                        ) : (
                          <Circle
                            size={18}
                            className={active ? 'flex-shrink-0 text-[#cc0000]' : 'flex-shrink-0 text-slate-300'}
                          />
                        )}
                        <div className="min-w-0">
                          <p className={`text-xs font-bold ${active ? 'text-[#cc0000]' : 'text-slate-700'}`}>
                            Step {index + 1}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">{step.instruction}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-gradient-to-r from-red-50 to-white px-5 py-5 sm:px-7">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-[#cc0000]">
                        Step {safeCurrentStep + 1} of {steps.length}
                      </p>
                      <h2 className="mt-1 text-xl font-bold text-slate-900">{activeStep.sectionTitle}</h2>
                    </div>
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#cc0000] text-sm font-bold text-white">
                      {safeCurrentStep + 1}
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-7">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                    <p className="text-base font-semibold leading-8 text-slate-800">{activeStep.instruction}</p>
                  </div>

                  <button
                    type="button"
                    onClick={toggleCurrentStep}
                    className={`mt-5 flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                      isCurrentCompleted
                        ? 'border-green-200 bg-green-50 text-green-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-red-200'
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
                        isCurrentCompleted ? 'bg-green-600 text-white' : 'border-2 border-slate-300 bg-white'
                      }`}
                    >
                      {isCurrentCompleted && <Check size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold">
                        {isCurrentCompleted ? 'Step completed' : 'I completed this step'}
                      </p>
                      <p className="mt-0.5 text-xs opacity-70">Mark each step after safely completing it.</p>
                    </div>
                  </button>

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={safeCurrentStep === 0}
                      onClick={() => {
                        setCurrentStep((previous) => Math.max(0, previous - 1));
                        setResult(null);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowLeft size={16} /> Previous
                    </button>

                    {safeCurrentStep < steps.length - 1 ? (
                      <button
                        type="button"
                        onClick={goNext}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-5 py-3 text-xs font-bold text-white transition hover:bg-red-700"
                      >
                        Complete & Next <ArrowRight size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!isCurrentCompleted) {
                            setCompletedSteps((previous) => [...previous, activeStep.id]);
                          }
                          setResult('question');
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-5 py-3 text-xs font-bold text-white transition hover:bg-red-700"
                      >
                        Finish Guide <CheckCircle2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}

          {result === 'question' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-9">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-slate-900">Did these steps solve the problem?</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                You completed the guided troubleshooting for <strong>{issueTitle}</strong> on the <strong>{model.name}</strong>.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={markSolved}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-green-700"
                >
                  <CheckCircle2 size={18} /> Yes, it is solved
                </button>
                <button
                  type="button"
                  onClick={markUnsolved}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  <XCircle size={18} /> No, it still persists
                </button>
              </div>
            </section>
          )}

          {result === 'solved' && (
            <section className="rounded-2xl border border-green-200 bg-white p-6 text-center shadow-sm sm:p-9">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
                <CheckCircle2 size={34} />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-slate-900">Problem resolved</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                The troubleshooting outcome has been saved.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate('/troubleshoot')}
                  className="rounded-xl bg-[#cc0000] px-6 py-3 text-sm font-bold text-white"
                >
                  Return to Troubleshoot
                </button>
                <button
                  type="button"
                  onClick={restartGuide}
                  className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600"
                >
                  Run Guide Again
                </button>
              </div>
            </section>
          )}

          {result === 'unsolved' && (
            <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">The issue needs further assistance</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Choose a support option below. Your selected box, issue, and troubleshooting summary will be added automatically.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">
                <p><strong>Box:</strong> {model.name}</p>
                <p><strong>Issue:</strong> {issueTitle}</p>
                <p><strong>Progress:</strong> {completedSummary}</p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    recordSupportOutcome('ticket');
                    navigate('/user/report-problem', {
                      state: {
                        prefillCategory: 'Technical Problem',
                        prefillSubject: `${model.name} — ${issueTitle}`,
                        prefillDescription: ticketDescription,
                      },
                    });
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  <TicketPlus size={18} /> File Support Ticket
                </button>
                <button
                  type="button"
                  onClick={() => {
                    recordSupportOutcome('technician');
                    navigate('/user/technician-request', {
                      state: {
                        prefillServiceType: 'Signal / Dish Repair',
                        prefillIssueDescription: ticketDescription,
                      },
                    });
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-900"
                >
                  <Wrench size={18} /> Request Technician
                </button>
              </div>

              <button
                type="button"
                onClick={() => setResult('question')}
                className="mt-4 w-full text-center text-xs font-bold text-slate-500 hover:text-[#cc0000]"
              >
                Go back
              </button>
            </section>
          )}

          {issue.note && (
            <section className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-900">Guide note</p>
              <p className="mt-1 text-xs leading-5 text-blue-800">{issue.note}</p>
            </section>
          )}

          <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-amber-700" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-900">Safety reminder</p>
                <p className="mt-1 text-xs leading-5 text-amber-800">{SAFETY_REMINDER}</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </UserLayout>
  );
}
