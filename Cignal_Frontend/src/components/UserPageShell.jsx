import UserLayout from './UserLayout';

export default function UserPageShell({
  title,
  description,
  icon: Icon,
  actions,
  children,
  contentClassName = '',
}) {
  return (
    <UserLayout>
      <main className="w-full bg-slate-50/70">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8 xl:px-12">
          {(title || description || actions) && (
            <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-1 w-full bg-gradient-to-r from-[#8f0000] via-[#cc0000] to-[#ef4444]" />
              <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  {Icon && (
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#cc0000] ring-1 ring-red-100">
                      <Icon size={21} />
                    </div>
                  )}
                  <div className="min-w-0">
                    {title && <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>}
                    {description && <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>}
                  </div>
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
              </div>
            </section>
          )}

          <div className={contentClassName}>{children}</div>
        </div>
      </main>
    </UserLayout>
  );
}
