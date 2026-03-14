import { useState } from 'react'

export default function DatePickerPopover({ onSelectDate, onClose }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-indexed

  const todayStr = today.toISOString().split('T')[0]

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const canGoNext =
    viewYear < today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth < today.getMonth())

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (!canGoNext) return
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(viewYear, viewMonth)
  )

  const cells = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const handleDayClick = (day) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (dateStr >= todayStr) return // only past dates allowed
    onSelectDate(dateStr)
    onClose()
  }

  return (
    <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg p-3 w-56">
      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-2 text-center">
        What day was this completed on?
      </p>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          tabIndex={-1}
          onClick={prevMonth}
          className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">{monthLabel}</span>
        <button
          tabIndex={-1}
          onClick={nextMonth}
          className={`p-1 rounded ${canGoNext ? 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200' : 'text-zinc-200 dark:text-zinc-700 cursor-not-allowed'}`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <span key={d} className="text-[10px] text-center text-zinc-400">{d}</span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} />
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = dateStr === todayStr
          const isFuture = dateStr > todayStr
          return (
            <button
              key={day}
              tabIndex={-1}
              disabled={isFuture || isToday}
              onClick={() => handleDayClick(day)}
              className={`text-xs rounded-md py-0.5 text-center transition-colors ${
                isToday
                  ? 'ring-2 ring-inset ring-indigo-400 text-indigo-500 dark:text-indigo-400 font-medium cursor-not-allowed'
                  : isFuture
                  ? 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed'
                  : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
