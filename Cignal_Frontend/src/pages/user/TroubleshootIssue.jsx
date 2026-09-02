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
const ACTIVE_TROUBLESHOOT_SESSION_KEY = 'cignalcare-active-troubleshoot-session';

function ComponentIcon({ kind, size = 17 }) {
  if (kind === 'power') return <Power size={size} />;
  if (kind === 'signal') return <SatelliteDish size={size} />;
  if (kind === 'video') return <Cable size={size} />;
  if (kind === 'card') return <CircleDot size={size} />;
  return <Power size={size} />;
}

function OptionBadge({ children, tone = 'slate' }) {
  const tones = {
    red: 'bg-red-100 text-[#a50000]',
    slate: 'bg-slate-100 text-slate-600',
    dark: 'bg-slate-900 text-white',
    amber: 'bg-amber-50 text-amber-800',
  };

  return (
    <span className={`rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

function SupportOptionCard({ active, icon: Icon, title, description, meta, onClick, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group min-h-[136px] rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-red-200 sm:p-5 ${
        active
          ? 'border-[#cc0000] bg-red-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-red-200 hover:shadow-sm'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
            active ? 'bg-[#cc0000] text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-red-50 group-hover:text-[#cc0000]'
          }`}
        >
          <Icon size={19} />
        </span>
        {meta}
      </div>
      <p className="mt-4 text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </button>
  );
}

export default function TroubleshootIssue() {
  const { modelId, issueId } = useParams();
  const navigate = useNavigate();
  const storageKey = `troubleshoot-progress:${modelId}:${issueId}`;
  const guideRef = useRef(null);
  const outcomeSentRef = useRef(new Set());

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
  const [activeOption, setActiveOption] = useState('recommended');
  const [videoWatched, setVideoWatched] = useState(false);
  const [videoResult, setVideoResult] = useState('');
  const [shortcutResults, setShortcutResults] = useState({ quick: '', factory: '' });

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
  const options = issue?.support_options || {};
  const quickRestart = options.quick_restart || {};
  const factoryReset = options.factory_reset || {};

  const quickRestartSteps = useMemo(
    () =>
      quickRestart.available && quickRestart.section_title
        ? steps.filter((step) => step.sectionTitle === quickRestart.section_title)
        : [],
    [quickRestart.available, quickRestart.section_title, steps]
  );

  const factoryResetSteps = useMemo(
    () =>
      factoryReset.available && factoryReset.section_title
        ? steps.filter((step) => step.sectionTitle === factoryReset.section_title)
        : [],
    [factoryReset.available, factoryReset.section_title, steps]
  );

  const quickRestartAvailable = quickRestart.available && quickRestartSteps.length > 0;
  const factoryResetAvailable = factoryReset.available && factoryResetSteps.length > 0;

  const writtenSteps = useMemo(() => {
    if (activeOption === 'quick' && quickRestartAvailable) return quickRestartSteps;
    if (activeOption === 'factory' && factoryResetAvailable) return factoryResetSteps;
    return steps;
  }, [activeOption, factoryResetAvailable, factoryResetSteps, quickRestartAvailable, quickRestartSteps, steps]);

  const selectedMode = useMemo(() => {
    if (activeOption === 'quick') {
      return {
        key: 'quick',
        title: 'Quick Restart',
        label: 'Fast option',
        description: 'Only the receiver power-cycle steps are shown. Saved receiver settings are not changed.',
        resultQuestion: 'Did the quick restart solve the problem?',
      };
    }

    if (activeOption === 'factory') {
      return {
        key: 'factory',
        title: 'Factory Reset',
        label: 'Advanced option',
        description: 'Only the receiver-specific factory-reset and required setup steps are shown.',
        resultQuestion: 'Did the factory reset solve the problem?',
      };
    }

    return {
      key: 'recommended',
      title: 'Full Troubleshooting Guide',
      label: 'Recommended',
      description: 'Follow the complete receiver-specific troubleshooting process in the verified order.',
      resultQuestion: 'Did the full troubleshooting guide solve the problem?',
    };
  }, [activeOption]);

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
      setActiveOption('recommended');
      setVideoWatched(false);
      setVideoResult('');
      setShortcutResults({ quick: '', factory: '' });

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
          const savedOption = ['recommended', 'quick', 'factory'].includes(saved.activeOption)
            ? saved.activeOption
            : 'recommended';
          const selectedSupport = selectedIssue.support_options || {};
          const optionAvailable =
            savedOption === 'recommended' ||
            (savedOption === 'quick' && selectedSupport.quick_restart?.available) ||
            (savedOption === 'factory' && selectedSupport.factory_reset?.available);

          setCompletedSteps(savedCompleted);
          setActiveOption(optionAvailable ? savedOption : 'recommended');
          setVideoWatched(saved.videoWatched === true);
          setVideoResult(typeof saved.videoResult === 'string' ? saved.videoResult : '');
          setShortcutResults({
            quick: typeof saved.shortcutResults?.quick === 'string' ? saved.shortcutResults.quick : '',
            factory: typeof saved.shortcutResults?.factory === 'string' ? saved.shortcutResults.factory : '',
          });
          setCurrentStep(
            Number.isInteger(savedCurrent) && savedCurrent >= 0
              ? savedCurrent
              : 0
          );
        } catch {
          localStorage.removeItem(storageKey);
          setCompletedSteps([]);
          setCurrentStep(0);
          setVideoWatched(false);
          setVideoResult('');
          setShortcutResults({ quick: '', factory: '' });
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
      JSON.stringify({
        currentStep,
        completedSteps,
        activeOption: guideMode === 'written' ? activeOption : 'recommended',
        videoWatched,
        videoResult,
        shortcutResults,
      })
    );
  }, [
    activeOption,
    completedSteps,
    currentStep,
    guideMode,
    issue,
    loading,
    shortcutResults,
    steps.length,
    storageKey,
    videoResult,
    videoWatched,
  ]);

  useEffect(() => {
    if (loading || !model || !issue || steps.length === 0) return;

    const safeIndex = Math.min(currentStep, Math.max(writtenSteps.length - 1, 0));
    const currentSessionStep =
      guideMode === 'written' && writtenSteps.length > 0
        ? writtenSteps[safeIndex]
        : null;
    const quickStepIds = new Set(quickRestartSteps.map((step) => step.id));
    const factoryStepIds = new Set(factoryResetSteps.map((step) => step.id));

    const session = {
      version: 1,
      modelId: String(model.id),
      issueId: String(issue.id),
      guideMode,
      activeOption: guideMode === 'video' ? 'video' : activeOption,
      currentStepId: currentSessionStep?.id || '',
      currentStepIndex: currentSessionStep ? safeIndex : -1,
      completedStepIds: completedSteps,
      quickRestartAttempted:
        shortcutResults.quick !== '' ||
        completedSteps.some((id) => quickStepIds.has(id)),
      quickRestartResult: shortcutResults.quick,
      factoryResetAttempted:
        shortcutResults.factory !== '' ||
        completedSteps.some((id) => factoryStepIds.has(id)),
      factoryResetResult: shortcutResults.factory,
      videoWatched,
      videoId: videoWatched ? String(video?.id || '') : '',
      videoResult,
      overallResult:
        result === 'solved' ? 'resolved' : result === 'unsolved' ? 'unresolved' : '',
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(
      ACTIVE_TROUBLESHOOT_SESSION_KEY,
      JSON.stringify(session)
    );
  }, [
    activeOption,
    completedSteps,
    currentStep,
    factoryResetSteps,
    guideMode,
    issue,
    loading,
    model,
    quickRestartSteps,
    result,
    shortcutResults,
    steps.length,
    video,
    videoResult,
    videoWatched,
    writtenSteps,
  ]);

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
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                <RefreshCcw size={16} /> Try Again
              </button>
              <button
                type="button"
                onClick={() => navigate(`/troubleshoot/${modelId}`)}
                className="min-h-11 rounded-xl bg-[#cc0000] px-5 py-3 text-sm font-bold text-white"
              >
                Back to Issues
              </button>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  const safeCurrentStep = Math.min(currentStep, Math.max(writtenSteps.length - 1, 0));
  const activeStep = writtenSteps[safeCurrentStep];
  const writtenStepIds = new Set(writtenSteps.map((step) => step.id));
  const modeCompletedSteps = completedSteps.filter((id) => writtenStepIds.has(id));
  const isCurrentCompleted = activeStep ? completedSteps.includes(activeStep.id) : false;
  const progress = writtenSteps.length
    ? Math.round((modeCompletedSteps.length / writtenSteps.length) * 100)
    : 0;
  const issueTitle = issue.title || 'Troubleshooting issue';
  const completedSummary = `${completedSteps.length} of ${steps.length} troubleshooting steps completed`;
  const completedStepSummary = steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => completedSteps.includes(step.id))
    .map(
      ({ step, index }) =>
        `- Step ${index + 1}${step.sectionTitle ? ` (${step.sectionTitle})` : ''}`
    );
  const ticketDescription = [
    `Box model: ${model.name}`,
    `Issue: ${issueTitle}`,
    completedSummary,
    shortcutResults.quick
      ? `Quick Restart: attempted (${shortcutResults.quick})`
      : '',
    shortcutResults.factory
      ? `Factory Reset: attempted (${shortcutResults.factory})`
      : '',
    videoWatched
      ? `Video Guide: viewed${video?.title ? ` (${video.title})` : ''}${videoResult ? ` — ${videoResult}` : ''}`
      : '',
    completedStepSummary.length ? 'Steps marked completed in CignalCare+:' : '',
    ...completedStepSummary,
    'Troubleshooting result: Issue still persists',
    '',
    'Additional details:',
  ].filter(Boolean).join('\n');

  const scrollToGuide = () => {
    window.setTimeout(() => {
      guideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const selectWrittenMode = (optionName, modeSteps) => {
    if (!Array.isArray(modeSteps) || modeSteps.length === 0) return;
    const firstIncomplete = modeSteps.findIndex((step) => !completedSteps.includes(step.id));
    setGuideMode('written');
    setActiveOption(optionName);
    setCurrentStep(firstIncomplete >= 0 ? firstIncomplete : 0);
    setResult(null);
    scrollToGuide();
  };

  const startRecommended = () => selectWrittenMode('recommended', steps);
  const startQuickRestart = () => selectWrittenMode('quick', quickRestartSteps);
  const startFactoryReset = () => selectWrittenMode('factory', factoryResetSteps);

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
    if (safeCurrentStep < writtenSteps.length - 1) {
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
    setActiveOption('recommended');
    setVideoWatched(false);
    setVideoResult('');
    setShortcutResults({ quick: '', factory: '' });
    localStorage.removeItem(storageKey);
    localStorage.removeItem(ACTIVE_TROUBLESHOOT_SESSION_KEY);
  };

  const markSolved = () => {
    if (guideMode === 'video') {
      setVideoWatched(true);
      setVideoResult('resolved');
    } else if (activeOption === 'quick' || activeOption === 'factory') {
      setShortcutResults((previous) => ({
        ...previous,
        [activeOption]: 'resolved',
      }));
    }

    setResult('solved');
    recordSupportOutcome('resolved');
  };

  const markUnsolved = () => {
    if (guideMode === 'video') {
      setVideoWatched(true);
      setVideoResult('not_resolved');
    } else if (activeOption === 'quick' || activeOption === 'factory') {
      setShortcutResults((previous) => ({
        ...previous,
        [activeOption]: 'not_resolved',
      }));
    }

    setResult('unsolved');
    recordSupportOutcome('unresolved');
  };

  const openVideo = () => {
    setGuideMode('video');
    setActiveOption('video');
    setVideoWatched(true);
    setVideoResult((previous) => previous || 'viewed');
    setResult(null);
    scrollToGuide();
  };

  const continueFromVideo = () => {
    setVideoWatched(true);
    setVideoResult('not_resolved');
    startRecommended();
  };

  const continueFromShortcut = () => {
    if (activeOption === 'quick' || activeOption === 'factory') {
      setShortcutResults((previous) => ({
        ...previous,
        [activeOption]: 'not_resolved',
      }));
    }
    startRecommended();
  };

  return (
    <UserLayout>
      <div className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            <button
              type="button"
              onClick={() => navigate(`/troubleshoot/${model.id}`)}
              className="mb-4 inline-flex min-h-10 items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-[#cc0000]"
            >
              <ArrowLeft size={15} /> Back to {model.name} Issues
            </button>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#cc0000]">
                    {model.name}{issue.category ? ` · ${issue.category}` : ''}
                  </span>
                  {model.source_url && (
                    <a
                      href={model.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-8 items-center gap-1 text-[10px] font-bold text-slate-500 transition hover:text-[#cc0000]"
                    >
                      Official Cignal guide <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {issueTitle}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  {issue.description}
                </p>
              </div>

              <button
                type="button"
                onClick={restartGuide}
                className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-red-200 hover:text-[#cc0000]"
              >
                <RotateCcw size={15} /> Restart Session
              </button>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
          {!result && (
            <section className="mb-6">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#cc0000]">
                  Support options
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Choose the type of help you want
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                  Use the full guide for the complete recommended process, or choose a focused option when you only want to restart, reset, or watch the available official video.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SupportOptionCard
                  active={activeOption === 'recommended'}
                  icon={BookOpen}
                  title="Full Troubleshooting Guide"
                  description="Follow every verified step for this receiver and issue in the recommended order."
                  meta={<OptionBadge tone="red">Recommended · {steps.length} steps</OptionBadge>}
                  onClick={startRecommended}
                />

                {quickRestartAvailable && (
                  <SupportOptionCard
                    active={activeOption === 'quick'}
                    icon={Power}
                    title={quickRestart.title || 'Quick Restart'}
                    description="Show only the safe power-cycle steps without changing the receiver's saved setup."
                    meta={<OptionBadge>Fast option · {quickRestartSteps.length} steps</OptionBadge>}
                    onClick={startQuickRestart}
                  />
                )}

                {factoryResetAvailable && (
                  <SupportOptionCard
                    active={activeOption === 'factory'}
                    icon={RotateCcw}
                    title={factoryReset.title || 'Factory Reset'}
                    description="Show only the receiver-specific factory-reset and required setup procedure."
                    meta={<OptionBadge tone="amber">Advanced · {factoryResetSteps.length} steps</OptionBadge>}
                    onClick={startFactoryReset}
                  />
                )}

                {video && (
                  <SupportOptionCard
                    active={activeOption === 'video'}
                    icon={PlayCircle}
                    title="Video Guide"
                    description="Watch the verified Cignal video for the procedure it demonstrates, then continue with written steps if needed."
                    meta={
                      <OptionBadge tone="dark">
                        Official Cignal · {video.type === 'supplemental' || video.coverage === 'partial' ? 'Supplemental' : 'Full'}
                      </OptionBadge>
                    }
                    onClick={openVideo}
                  />
                )}
              </div>
            </section>
          )}

          {relatedComponents.length > 0 && !result && (
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Connections or controls involved
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {relatedComponents.map((component) => (
                      <span
                        key={component.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                      >
                        <ComponentIcon kind={component.kind} />
                        {component.name}
                      </span>
                    ))}
                  </div>
                </div>
                {model.guide?.verified && (
                  <span className="inline-flex items-center gap-1.5 self-start rounded-md bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 sm:self-center">
                    <ShieldCheck size={12} /> Verified receiver guide
                  </span>
                )}
              </div>
            </section>
          )}

          {activeOption === 'factory' && factoryReset.warning && !result && (
            <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-amber-700" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
                    Before factory reset
                  </p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    {factoryReset.warning}
                  </p>
                </div>
              </div>
            </section>
          )}

          <div ref={guideRef} className="scroll-mt-24">
            {!result && guideMode === 'video' && video && (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#cc0000]">
                          <Youtube size={12} /> Video guide
                        </span>
                        {video.verified && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                            <ShieldCheck size={12} /> Official source
                          </span>
                        )}
                        {(video.type === 'supplemental' || video.coverage === 'partial') && (
                          <span className="rounded-md bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
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
                      onClick={startRecommended}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:border-red-200 hover:text-[#cc0000]"
                    >
                      <BookOpen size={14} /> Open Written Guide
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-sm sm:rounded-2xl">
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
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-700"
                      >
                        <CheckCircle2 size={17} /> Yes, problem solved
                      </button>
                      {video.coverage === 'full' ? (
                        <button
                          type="button"
                          onClick={markUnsolved}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                        >
                          <XCircle size={17} /> Still having the problem
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={continueFromVideo}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                        >
                          <BookOpen size={17} /> Continue Written Guide
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {!result && guideMode === 'written' && activeStep && (
              <>
                <section className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#cc0000]">
                          Selected support mode
                        </span>
                        <OptionBadge tone={selectedMode.key === 'recommended' ? 'red' : selectedMode.key === 'factory' ? 'amber' : 'slate'}>
                          {selectedMode.label}
                        </OptionBadge>
                      </div>
                      <h2 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">{selectedMode.title}</h2>
                      <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
                        {selectedMode.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center">
                      <p className="text-lg font-bold text-slate-900">{writtenSteps.length}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">steps in this option</p>
                    </div>
                  </div>
                </section>

                <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
                <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-24 lg:self-start">
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
                    {modeCompletedSteps.length} of {writtenSteps.length} steps completed in this option
                  </p>

                  <div className="mt-4 max-h-[280px] space-y-1.5 overflow-y-auto pr-1 sm:max-h-[340px] lg:max-h-[420px]">
                    {writtenSteps.map((step, index) => {
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
                          className={`flex min-h-11 w-full items-center gap-3 rounded-xl p-3 text-left transition ${
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
                  <div className="border-b border-slate-100 bg-red-50/60 px-5 py-5 sm:px-7">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[#cc0000]">
                          Step {safeCurrentStep + 1} of {writtenSteps.length}
                        </p>
                        <h2 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
                          {activeStep.sectionTitle}
                        </h2>
                      </div>
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#cc0000] text-sm font-bold text-white sm:h-11 sm:w-11">
                        {safeCurrentStep + 1}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-7">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                      <p className="text-[15px] font-semibold leading-7 text-slate-800 sm:text-base sm:leading-8">
                        {activeStep.instruction}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={toggleCurrentStep}
                      className={`mt-5 flex min-h-14 w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
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
                        <p className="mt-0.5 text-xs opacity-70">Mark the step after safely completing it.</p>
                      </div>
                    </button>

                    <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-between">
                      <button
                        type="button"
                        disabled={safeCurrentStep === 0}
                        onClick={() => {
                          setCurrentStep((previous) => Math.max(0, previous - 1));
                          setResult(null);
                        }}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"
                      >
                        <ArrowLeft size={16} /> Previous
                      </button>

                      {safeCurrentStep < writtenSteps.length - 1 ? (
                        <button
                          type="button"
                          onClick={goNext}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-4 py-3 text-xs font-bold text-white transition hover:bg-red-700 sm:px-5"
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
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-4 py-3 text-xs font-bold text-white transition hover:bg-red-700 sm:px-5"
                        >
                          {selectedMode.key === 'quick'
                            ? 'Finish Quick Restart'
                            : selectedMode.key === 'factory'
                              ? 'Finish Factory Reset'
                              : 'Finish Full Guide'}{' '}
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </section>
                </div>
              </>
            )}
          </div>

          {result === 'question' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-9">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="mt-5 text-xl font-bold text-slate-900 sm:text-2xl">
                {selectedMode.resultQuestion}
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                You completed the <strong>{selectedMode.title}</strong> for <strong>{issueTitle}</strong> on the <strong>{model.name}</strong>.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={markSolved}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-green-700"
                >
                  <CheckCircle2 size={18} /> Yes, it is solved
                </button>
                {selectedMode.key === 'recommended' ? (
                  <button
                    type="button"
                    onClick={markUnsolved}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-red-700"
                  >
                    <XCircle size={18} /> No, it still persists
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={continueFromShortcut}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    <BookOpen size={18} /> Continue Full Troubleshooting
                  </button>
                )}
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
                  className="min-h-11 rounded-xl bg-[#cc0000] px-6 py-3 text-sm font-bold text-white"
                >
                  Return to Troubleshoot
                </button>
                <button
                  type="button"
                  onClick={restartGuide}
                  className="min-h-11 rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600"
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
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-red-700"
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
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-900"
                >
                  <Wrench size={18} /> Request Technician
                </button>
              </div>

              <button
                type="button"
                onClick={() => setResult('question')}
                className="mt-4 min-h-10 w-full text-center text-xs font-bold text-slate-500 hover:text-[#cc0000]"
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
