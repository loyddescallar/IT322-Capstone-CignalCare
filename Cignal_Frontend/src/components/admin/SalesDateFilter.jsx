import { DATE_PERIODS } from '../../utils/adminBusinessRules';

// Shared calendar-period controls. Custom range is inclusive of both dates.
export default function SalesDateFilter({ period, setPeriod, from, setFrom, to, setTo }) {
  return (
    <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
      <label className="flex min-w-[130px] flex-col gap-1 text-xs text-gray-600">
        Date Range
        <select aria-label="Sales date range" value={period} onChange={event => setPeriod(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-red-600">
          {DATE_PERIODS.map(item => <option key={item}>{item}</option>)}
        </select>
      </label>
      {period === 'Custom Range' && <>
        <label className="flex flex-col gap-1 text-xs text-gray-600">From
          <input aria-label="From date" type="date" value={from} max={to || undefined} onChange={event => setFrom(event.target.value)} className="min-w-0 rounded-lg border border-gray-200 px-2 py-2 text-xs outline-none focus:border-red-600" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">To
          <input aria-label="To date" type="date" value={to} min={from || undefined} onChange={event => setTo(event.target.value)} className="min-w-0 rounded-lg border border-gray-200 px-2 py-2 text-xs outline-none focus:border-red-600" />
        </label>
      </>}
      {period === 'Custom Range' && (!from || !to || from > to) && <span role="alert" className="text-xs text-red-600">{from && to && from > to ? 'From must be on or before To.' : 'Choose both From and To dates.'}</span>}
    </div>
  );
}
