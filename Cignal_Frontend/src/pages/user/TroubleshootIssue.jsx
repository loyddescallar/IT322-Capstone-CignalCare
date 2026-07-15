import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  RotateCcw,
  TicketPlus,
  Wrench,
  XCircle,
} from 'lucide-react';
import {
  findBoxModel,
  findTroubleshootIssue,
} from '../../data/troubleshootData';
import UserLayout from '../../components/UserLayout';

function buildSteps(issue) {
  return issue.sections.flatMap((section) =>
    section.steps.map((instruction, index) => ({
      id: `${section.title}-${index}`,
      sectionTitle: section.title,
      instruction,
    }))
  );
}

export default function TroubleshootIssue() {
  const { modelId, issueId } = useParams();
  const navigate = useNavigate();
  const model = findBoxModel(modelId);
  const issue = findTroubleshootIssue(modelId, issueId);
  const steps = useMemo(() => (issue ? buildSteps(issue) : []), [issue]);
  const storageKey = `troubleshoot-progress:${modelId}:${issueId}`;

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (Array.isArray(saved.completedSteps)) {
        setCompletedSteps(saved.completedSteps);
      }
      if (
        Number.isInteger(saved.currentStep) &&
        saved.currentStep >= 0 &&
        saved.currentStep < steps.length
      ) {
        setCurrentStep(saved.currentStep);
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, steps.length]);

  useEffect(() => {
    if (!issue) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify({ currentStep, completedSteps })
    );
  }, [completedSteps, currentStep, issue, storageKey]);

  if (!model || !issue || steps.length === 0) {
    return (
      <UserLayout>
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <XCircle size={40} className="mx-auto text-red-500" />
            <h1 className="mt-4 text-xl font-black text-slate-900">
              Troubleshooting guide not found
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Return to the model page and select another issue.
            </p>
            <button
              type="button"
              onClick={() => navigate(`/troubleshoot/${modelId}`)}
              className="mt-6 rounded-xl bg-[#cc0000] px-5 py-3 text-sm font-bold text-white"
            >
              Back to Issues
            </button>
          </div>
        </div>
      </UserLayout>
    );
  }

  const activeStep = steps[currentStep];
  const isCurrentCompleted = completedSteps.includes(activeStep.id);
  const allStepsCompleted = completedSteps.length === steps.length;
  const progress = Math.round((completedSteps.length / steps.length) * 100);

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
    if (currentStep < steps.length - 1) {
      setCurrentStep((previous) => previous + 1);
    }
  };

  const restartGuide = () => {
    setCurrentStep(0);
    setCompletedSteps([]);
    setResult(null);
    localStorage.removeItem(storageKey);
  };

  const completedSummary = `${completedSteps.length} of ${steps.length} troubleshooting steps completed`;
  const ticketDescription = [
    `Box model: ${model.name}`,
    `Issue: ${issue.shortTitle}`,
    completedSummary,
    `Troubleshooting result: Issue still persists`,
    '',
    'Additional details:',
  ].join('\n');

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
              <ArrowLeft size={15} />
              Back to {model.name} Issues
            </button>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="hidden h-20 w-28 flex-shrink-0 items-center justify-center rounded-2xl border border-red-100 bg-red-50 p-3 sm:flex">
                  <img
                    src={model.image}
                    alt={model.name}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#cc0000]">
                    {model.name} · {issue.category}
                  </p>
                  <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
                    {issue.shortTitle}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {issue.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={restartGuide}
                className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-red-200 hover:text-[#cc0000] sm:self-auto"
              >
                <RotateCcw size={15} />
                Restart Guide
              </button>
            </div>
          </div>
        </section>

        <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Your progress
              </p>
              <span className="text-sm font-black text-[#cc0000]">
                {progress}%
              </span>
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
                const active = currentStep === index;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      setCurrentStep(index);
                      setResult(null);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                      active
                        ? 'bg-red-50 ring-1 ring-red-200'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {completed ? (
                      <CheckCircle2
                        size={18}
                        className="flex-shrink-0 text-green-600"
                      />
                    ) : (
                      <Circle
                        size={18}
                        className={
                          active
                            ? 'flex-shrink-0 text-[#cc0000]'
                            : 'flex-shrink-0 text-slate-300'
                        }
                      />
                    )}
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-bold ${
                          active ? 'text-[#cc0000]' : 'text-slate-700'
                        }`}
                      >
                        Step {index + 1}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">
                        {step.sectionTitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section>
            {!result && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-gradient-to-r from-red-50 to-white px-5 py-5 sm:px-7">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-[#cc0000]">
                        Step {currentStep + 1} of {steps.length}
                      </p>
                      <h2 className="mt-1 text-xl font-black text-slate-900">
                        {activeStep.sectionTitle}
                      </h2>
                    </div>
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#cc0000] text-sm font-black text-white">
                      {currentStep + 1}
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-7">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                    <p className="text-base font-semibold leading-8 text-slate-800">
                      {activeStep.instruction}
                    </p>
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
                        isCurrentCompleted
                          ? 'bg-green-600 text-white'
                          : 'border-2 border-slate-300 bg-white'
                      }`}
                    >
                      {isCurrentCompleted && <Check size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold">
                        {isCurrentCompleted
                          ? 'Step completed'
                          : 'I completed this step'}
                      </p>
                      <p className="mt-0.5 text-xs opacity-70">
                        Mark each step after safely completing the instruction.
                      </p>
                    </div>
                  </button>

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={currentStep === 0}
                      onClick={() => {
                        setCurrentStep((previous) => previous - 1);
                        setResult(null);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowLeft size={16} />
                      Previous
                    </button>

                    {currentStep < steps.length - 1 ? (
                      <button
                        type="button"
                        onClick={goNext}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-5 py-3 text-xs font-bold text-white transition hover:bg-red-700"
                      >
                        Complete & Next
                        <ArrowRight size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!isCurrentCompleted) {
                            setCompletedSteps((previous) => [
                              ...previous,
                              activeStep.id,
                            ]);
                          }
                          setResult('question');
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-5 py-3 text-xs font-bold text-white transition hover:bg-red-700"
                      >
                        Finish Guide
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {result === 'question' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-9">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="mt-5 text-2xl font-black text-slate-900">
                  Did these steps solve the problem?
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                  You completed the guided troubleshooting for{' '}
                  <strong>{issue.shortTitle}</strong> on the{' '}
                  <strong>{model.name}</strong>.
                </p>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setResult('solved')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-green-700"
                  >
                    <CheckCircle2 size={18} />
                    Yes, it is solved
                  </button>
                  <button
                    type="button"
                    onClick={() => setResult('unsolved')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-red-700"
                  >
                    <XCircle size={18} />
                    No, it still persists
                  </button>
                </div>
              </div>
            )}

            {result === 'solved' && (
              <div className="rounded-2xl border border-green-200 bg-white p-6 text-center shadow-sm sm:p-9">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <CheckCircle2 size={34} />
                </div>
                <h2 className="mt-5 text-2xl font-black text-slate-900">
                  Problem resolved 🎉
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                  Your progress has been saved. You may restart this guide or
                  return to the troubleshooting page.
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
              </div>
            )}

            {result === 'unsolved' && (
              <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      The issue needs further assistance
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Choose the support option below. Your selected box,
                      issue, and completed-step summary will be added to the
                      form automatically.
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">
                  <p>
                    <strong>Box:</strong> {model.name}
                  </p>
                  <p>
                    <strong>Issue:</strong> {issue.shortTitle}
                  </p>
                  <p>
                    <strong>Progress:</strong> {completedSummary}
                  </p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/user/report-problem', {
                        state: {
                          prefillCategory: 'Technical Problem',
                          prefillSubject: `${model.name} — ${issue.shortTitle}`,
                          prefillDescription: ticketDescription,
                        },
                      })
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#cc0000] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-red-700"
                  >
                    <TicketPlus size={18} />
                    File Support Ticket
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/user/technician-request', {
                        state: {
                          prefillServiceType: 'Signal / Dish Repair',
                          prefillIssueDescription: ticketDescription,
                        },
                      })
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-900"
                  >
                    <Wrench size={18} />
                    Request Technician
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setResult('question')}
                  className="mt-4 w-full text-center text-xs font-bold text-slate-500 hover:text-[#cc0000]"
                >
                  Go back
                </button>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={18}
                  className="mt-0.5 flex-shrink-0 text-amber-700"
                />
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-amber-800">
                    Safety reminder
                  </p>
                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    {issue.note}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </UserLayout>
  );
}
