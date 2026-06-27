import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScrumStore } from '../store/useScrumStore'
import { isHabitScheduledOn } from '../types'
import type { Habit, HabitCompletion, DailyTask } from '../types'

const TODAY = new Date().toLocaleDateString('en-CA')

function dateStr(year: number, month: number, day: number) {
  return new Date(year, month, day).toLocaleDateString('en-CA')
}

function getCalendarDays(year: number, month: number): (string | null)[] {
  const firstDow = new Date(year, month, 1).getDay()        // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(dateStr(year, month, d))
  const trailing = (7 - (cells.length % 7)) % 7
  for (let i = 0; i < trailing; i++) cells.push(null)
  return cells
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DOW_LABELS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const DOW_SHORT   = ['S','M','T','W','T','F','S']

// ─── Day cell ─────────────────────────────────────────────────────────────────

function DayCell({
  ds, habits, habitCompletions, dailyTasks, onClick,
}: {
  ds: string
  habits: Habit[]
  habitCompletions: HabitCompletion[]
  dailyTasks: DailyTask[]
  onClick: () => void
}) {
  const isToday   = ds === TODAY
  const isFuture  = ds > TODAY
  const dayNum    = parseInt(ds.split('-')[2], 10)

  const scheduledHabits = habits.filter((h) => isHabitScheduledOn(h.recurrence, ds))
  const completedHabitIds = new Set(habitCompletions.filter((c) => c.date === ds).map((c) => c.habitId))

  const dayEntries       = dailyTasks.filter((dt) => dt.date === ds)
  const completedTasks   = dayEntries.filter((dt) => dt.completed).length
  const totalTasks       = dayEntries.length
  const allTasksDone     = totalTasks > 0 && completedTasks === totalTasks

  const visibleHabits = scheduledHabits.slice(0, 8)
  const extraHabits   = scheduledHabits.length - visibleHabits.length

  return (
    <div
      onClick={onClick}
      className={`
        min-h-14 md:min-h-24 p-1 md:p-2 rounded-lg border cursor-pointer flex flex-col gap-1 transition-colors
        ${isToday ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}
        ${isFuture ? 'opacity-50' : ''}
      `}
    >
      {/* Day number */}
      <div className="flex items-start justify-between gap-0.5">
        <span className={`text-xs md:text-sm font-semibold leading-none ${isToday ? 'text-indigo-600' : 'text-gray-700'}`}>
          {dayNum}
        </span>
        {/* Task progress pill — hidden on smallest screens */}
        {totalTasks > 0 && (
          <span className={`hidden sm:inline text-xs px-1.5 py-0.5 rounded-full leading-none font-medium ${
            allTasksDone ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
          }`}>
            {completedTasks}/{totalTasks}
          </span>
        )}
        {/* Mobile: just a green dot if all tasks done */}
        {totalTasks > 0 && allTasksDone && (
          <span className="sm:hidden w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 mt-0.5" />
        )}
      </div>

      {/* Habit dots */}
      {visibleHabits.length > 0 && (
        <div className="flex flex-wrap gap-0.5 md:gap-1 mt-auto">
          {visibleHabits.map((h) => {
            const done = completedHabitIds.has(h.id)
            return (
              <div
                key={h.id}
                title={h.title}
                className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full border flex-shrink-0"
                style={{
                  backgroundColor: done ? h.color : 'transparent',
                  borderColor: h.color,
                  opacity: done ? 1 : (isFuture ? 0.3 : 0.5),
                }}
              />
            )
          })}
          {extraHabits > 0 && (
            <span className="text-xs text-gray-400 leading-none self-end">+{extraHabits}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  const { habits } = useScrumStore()
  if (!habits.length) return null
  return (
    <div className="flex flex-wrap gap-3 px-3 md:px-6 pb-4">
      {habits.map((h) => (
        <div key={h.id} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: h.color, borderColor: h.color }} />
          <span className="text-xs text-gray-500">{h.title}</span>
        </div>
      ))}
    </div>
  )
}

// ─── CalendarView ─────────────────────────────────────────────────────────────

export function CalendarView() {
  const { habits, habitCompletions, dailyTasks, setDailyViewDate } = useScrumStore()
  const navigate = useNavigate()

  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0);  setYear(y => y + 1) } else setMonth(m => m + 1) }
  const goToday   = () => { setYear(now.getFullYear()); setMonth(now.getMonth()) }

  const cells = getCalendarDays(year, month)

  const goToDay = (ds: string) => {
    setDailyViewDate(ds)
    navigate('/daily')
  }

  // Month-level stats
  const monthStr  = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthEntries   = dailyTasks.filter((dt) => dt.date.startsWith(monthStr))
  const monthCompleted = monthEntries.filter((dt) => dt.completed).length

  const monthHabitDone = habitCompletions.filter((c) => c.date.startsWith(monthStr)).length
  const monthHabitSched = (() => {
    let count = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = dateStr(year, month, d)
      if (ds > TODAY) break
      habits.forEach((h) => { if (isHabitScheduledOn(h.recurrence, ds)) count++ })
    }
    return count
  })()

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 flex flex-wrap items-center gap-3 justify-between flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h2 className="text-lg md:text-xl font-bold text-gray-800 text-center">{MONTH_NAMES[month]} {year}</h2>
          <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          {(year !== now.getFullYear() || month !== now.getMonth()) && (
            <button onClick={goToday} className="text-xs text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50">
              <span className="hidden sm:inline">This month</span>
              <span className="sm:hidden">Today</span>
            </button>
          )}
        </div>

        {/* Month stats */}
        <div className="flex items-center gap-4 md:gap-6 text-sm text-gray-500">
          {monthHabitSched > 0 && (
            <div className="text-center">
              <p className="font-semibold text-gray-800">{monthHabitDone}/{monthHabitSched}</p>
              <p className="text-xs">habits</p>
            </div>
          )}
          {monthEntries.length > 0 && (
            <div className="text-center">
              <p className="font-semibold text-gray-800">{monthCompleted}/{monthEntries.length}</p>
              <p className="text-xs">tasks</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 px-3 md:px-6 pt-3 md:pt-4 pb-2">
          {DOW_LABELS.map((label, i) => (
            <div key={label} className="text-xs font-semibold text-gray-400 text-center uppercase tracking-wider pb-1">
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{DOW_SHORT[i]}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 md:gap-1.5 px-3 md:px-6 pb-6">
          {cells.map((ds, i) =>
            ds ? (
              <DayCell
                key={ds}
                ds={ds}
                habits={habits}
                habitCompletions={habitCompletions}
                dailyTasks={dailyTasks}
                onClick={() => goToDay(ds)}
              />
            ) : (
              <div key={`empty-${i}`} />
            )
          )}
        </div>

        {/* Habit legend */}
        <Legend />
      </div>
    </div>
  )
}
