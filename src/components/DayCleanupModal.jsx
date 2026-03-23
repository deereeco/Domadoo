import { useState } from 'react'
import { useStore } from '../store/useStore.js'

// Returns flat list of checkbox descendants with depth (for display)
function getCheckboxSubtasks(nodeId, nodes, depth = 0) {
  const node = nodes[nodeId]
  if (!node) return []
  return node.childrenIds.flatMap(cid => {
    const child = nodes[cid]
    if (!child || child.type !== 'CHECKBOX') return []
    return [
      { id: cid, content: child.content, status: child.status, depth },
      ...getCheckboxSubtasks(cid, nodes, depth + 1),
    ]
  })
}

// Tooltip popover shown when ? button is tapped/clicked
function ActionTooltip({ text, onClose }) {
  return (
    <div
      className="absolute z-50 bottom-full left-0 mb-1 w-56 rounded-lg shadow-lg bg-zinc-800 dark:bg-zinc-700 text-white text-xs p-2.5 leading-relaxed"
      onClick={e => { e.stopPropagation(); onClose() }}
    >
      {text}
      <div className="absolute top-full left-3 w-2 h-2 overflow-hidden">
        <div className="w-2 h-2 bg-zinc-800 dark:bg-zinc-700 rotate-45 -translate-y-1" />
      </div>
    </div>
  )
}

// Action button with optional ? tooltip
function ActionBtn({ label, action, resolved, onResolve, tooltip, activeTooltip, onTooltipToggle, testId }) {
  const isActive = resolved === action
  return (
    <div className="relative flex-shrink-0">
      <div className="flex items-center gap-0.5">
        <button
          data-testid={testId}
          onClick={() => onResolve(action)}
          className={`px-2 py-1 text-xs rounded-md font-medium transition-colors border ${
            isActive
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
          }`}
          title={tooltip}
        >
          {label}
        </button>
        <button
          onClick={e => { e.stopPropagation(); onTooltipToggle(action) }}
          className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 text-[10px] w-4 h-4 flex items-center justify-center"
          title="What does this do?"
          tabIndex={-1}
        >?</button>
      </div>
      {activeTooltip === action && (
        <ActionTooltip text={tooltip} onClose={() => onTooltipToggle(null)} />
      )}
    </div>
  )
}

export default function DayCleanupModal() {
  const {
    pendingCleanupTasks, resolveCleanupTask, finalizeDayCleanup,
    lastCleanupDate, isPeeking, enterPeekMode, nodes,
  } = useStore()

  // Per-task expand state for subtree (default expanded)
  const [expandedTasks, setExpandedTasks] = useState({})
  // Per-task active tooltip action
  const [activeTooltips, setActiveTooltips] = useState({})

  if (!pendingCleanupTasks || pendingCleanupTasks.length === 0) return null
  if (isPeeking) return null

  const allResolved = pendingCleanupTasks.every(t => t.resolved !== null)

  const incompleteTasks = pendingCleanupTasks.filter(t => !t.isCompleted && !t.isPartiallyCompleted)
  const partialTasks = pendingCleanupTasks.filter(t => t.isPartiallyCompleted)
  const completedTasks = pendingCleanupTasks.filter(t => t.isCompleted)

  const totalSections = [incompleteTasks, partialTasks, completedTasks].filter(s => s.length > 0).length

  const dateLabel = lastCleanupDate
    ? new Date(lastCleanupDate + 'T12:00:00').toLocaleDateString(undefined, {
        weekday: 'long', month: 'short', day: 'numeric',
      })
    : 'Yesterday'

  const buildSubtitle = () => {
    const parts = []
    if (incompleteTasks.length > 0) parts.push(`${incompleteTasks.length} incomplete`)
    if (partialTasks.length > 0) parts.push(`${partialTasks.length} partially complete`)
    if (completedTasks.length > 0) parts.push(`${completedTasks.length} completed`)
    return `${dateLabel} had ${parts.join(', ')} task${pendingCleanupTasks.length !== 1 ? 's' : ''}. What would you like to do?`
  }

  const handleApplyAll = (action, filter) => {
    pendingCleanupTasks.forEach(t => {
      if (t.resolved === null && filter(t)) resolveCleanupTask(t.id, action)
    })
  }

  const toggleExpand = (taskId) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !(prev[taskId] ?? true) }))
  }

  const toggleTooltip = (taskId, action) => {
    setActiveTooltips(prev => ({
      ...prev,
      [taskId]: prev[taskId] === action ? null : action,
    }))
  }

  const isExpanded = (taskId) => expandedTasks[taskId] ?? true

  // Render subtask tree for a today-copy node
  const renderSubtasks = (taskId) => {
    const subtasks = getCheckboxSubtasks(taskId, nodes)
    if (subtasks.length === 0) return null
    if (!isExpanded(taskId)) return null
    return (
      <div className="ml-5 mt-1.5 space-y-1">
        {subtasks.map(st => (
          <div key={st.id} className="flex items-start gap-1.5" style={{ paddingLeft: st.depth * 12 }}>
            <div className={`flex-shrink-0 mt-0.5 w-3 h-3 rounded border-2 flex items-center justify-center ${
              st.status === 'COMPLETED'
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-zinc-300 dark:border-zinc-600'
            }`}>
              {st.status === 'COMPLETED' && (
                <svg className="w-2 h-2 text-white" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span className={`text-xs flex-1 ${
              st.status === 'COMPLETED'
                ? 'text-zinc-400 dark:text-zinc-500 line-through'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}>{st.content || 'Untitled'}</span>
          </div>
        ))}
      </div>
    )
  }

  const renderExpandToggle = (taskId) => {
    const subtasks = getCheckboxSubtasks(taskId, nodes)
    if (subtasks.length === 0) return null
    const exp = isExpanded(taskId)
    return (
      <button
        onClick={() => toggleExpand(taskId)}
        className="ml-5 mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-600 hover:text-zinc-500 flex items-center gap-0.5"
        tabIndex={-1}
      >
        <svg className={`w-2.5 h-2.5 transition-transform ${exp ? '' : '-rotate-90'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
        {exp ? `Hide ${subtasks.length} subtask${subtasks.length !== 1 ? 's' : ''}` : `Show ${subtasks.length} subtask${subtasks.length !== 1 ? 's' : ''}`}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setActiveTooltips({})}>
      {/* Dimmed backdrop */}
      <div className="flex-1 bg-black/20" />
      <div
        className="animate-slide-in-right bg-white dark:bg-zinc-900 w-full max-w-sm h-full border-l border-zinc-200 dark:border-zinc-700 shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-white">New day — tasks to review</h2>
              <p className="text-xs text-zinc-400 mt-0.5">{buildSubtitle()}</p>
            </div>
            <button
              data-testid="cleanup-peek-btn"
              onClick={enterPeekMode}
              title="Peek at your board for context"
              className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Peek
            </button>
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" data-testid="cleanup-task-list">

          {/* Incomplete section */}
          {incompleteTasks.length > 0 && (
            <>
              {totalSections > 1 && (
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400 pb-1">Incomplete</div>
              )}
              {incompleteTasks.map(task => (
                <div key={task.id} data-testid={`cleanup-task-${task.id}`} className="space-y-1">
                  <div className="flex items-start gap-2">
                    <div className="w-3.5 h-3.5 mt-0.5 rounded border-2 border-zinc-400 flex-shrink-0" />
                    <span className="text-sm text-zinc-800 dark:text-zinc-200 flex-1">{task.content || 'Untitled'}</span>
                  </div>
                  {renderExpandToggle(task.id)}
                  {renderSubtasks(task.id)}
                  <div className="flex flex-wrap gap-2 ml-5 pt-1">
                    <ActionBtn
                      label="Keep on 'Today's Tasks'"
                      action="today"
                      resolved={task.resolved}
                      onResolve={a => resolveCleanupTask(task.id, a)}
                      tooltip="Leave this task in Today's Tasks for tomorrow. Nothing is archived."
                      activeTooltip={activeTooltips[task.id]}
                      onTooltipToggle={a => toggleTooltip(task.id, a)}
                      testId={`cleanup-action-today-${task.id}`}
                    />
                    <ActionBtn
                      label="Mark as completed, archive & repeat"
                      action="complete_repeat"
                      resolved={task.resolved}
                      onResolve={a => resolveCleanupTask(task.id, a)}
                      tooltip="Mark this task as done (recording it in history with today's date), then reset it to incomplete and keep it in Today's Tasks for tomorrow."
                      activeTooltip={activeTooltips[task.id]}
                      onTooltipToggle={a => toggleTooltip(task.id, a)}
                      testId={`cleanup-action-complete-repeat-${task.id}`}
                    />
                    <ActionBtn
                      label="Mark as completed, archive & remove"
                      action="complete_remove"
                      resolved={task.resolved}
                      onResolve={a => resolveCleanupTask(task.id, a)}
                      tooltip="Mark this task as done, archive it to history, and permanently remove it from Today's Tasks and its source card."
                      activeTooltip={activeTooltips[task.id]}
                      onTooltipToggle={a => toggleTooltip(task.id, a)}
                      testId={`cleanup-action-complete-${task.id}`}
                    />
                    <ActionBtn
                      label="Return to original card"
                      action="pushback"
                      resolved={task.resolved}
                      onResolve={a => resolveCleanupTask(task.id, a)}
                      tooltip="Remove from Today's Tasks and return this task to its source card as incomplete. Nothing is archived."
                      activeTooltip={activeTooltips[task.id]}
                      onTooltipToggle={a => toggleTooltip(task.id, a)}
                      testId={`cleanup-action-pushback-${task.id}`}
                    />
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Partially completed section */}
          {partialTasks.length > 0 && (
            <>
              <div className={`text-xs font-semibold uppercase tracking-wide text-amber-500 pb-1 ${incompleteTasks.length > 0 ? 'pt-2 border-t border-zinc-100 dark:border-zinc-800' : ''}`}>
                Partially complete
              </div>
              {partialTasks.map(task => (
                <div key={task.id} data-testid={`cleanup-task-${task.id}`} className="space-y-1">
                  <div className="flex items-start gap-2">
                    {/* Partial checkbox indicator */}
                    <div className="w-3.5 h-3.5 mt-0.5 rounded border-2 border-amber-400 bg-amber-100 dark:bg-amber-900/30 flex-shrink-0 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-sm bg-amber-400" />
                    </div>
                    <span className="text-sm text-zinc-800 dark:text-zinc-200 flex-1">{task.content || 'Untitled'}</span>
                  </div>
                  {renderExpandToggle(task.id)}
                  {renderSubtasks(task.id)}
                  <div className="flex flex-wrap gap-2 ml-5 pt-1">
                    <ActionBtn
                      label="Keep on Today's Tasks"
                      action="today"
                      resolved={task.resolved}
                      onResolve={a => resolveCleanupTask(task.id, a)}
                      tooltip="Leave this task and all its subtasks in Today's Tasks for tomorrow. Nothing is archived yet."
                      activeTooltip={activeTooltips[task.id]}
                      onTooltipToggle={a => toggleTooltip(task.id, a)}
                    />
                    <ActionBtn
                      label="Archive completed, keep rest on Today's"
                      action="partial_archive_keep"
                      resolved={task.resolved}
                      onResolve={a => resolveCleanupTask(task.id, a)}
                      tooltip="Record the completed subtasks in history with today's date and remove them. The parent task and its remaining incomplete subtasks stay in Today's Tasks."
                      activeTooltip={activeTooltips[task.id]}
                      onTooltipToggle={a => toggleTooltip(task.id, a)}
                    />
                    <ActionBtn
                      label="Archive completed, push rest to source"
                      action="partial_archive_source"
                      resolved={task.resolved}
                      onResolve={a => resolveCleanupTask(task.id, a)}
                      tooltip="Record the completed subtasks in history, then remove this task from Today's Tasks entirely. The parent task and its remaining incomplete subtasks return to the source card."
                      activeTooltip={activeTooltips[task.id]}
                      onTooltipToggle={a => toggleTooltip(task.id, a)}
                    />
                    <ActionBtn
                      label="Mark all done, archive & remove"
                      action="partial_force_remove"
                      resolved={task.resolved}
                      onResolve={a => resolveCleanupTask(task.id, a)}
                      tooltip="Mark all subtasks and the parent as done, archive everything to history, and permanently remove from Today's Tasks and the source card."
                      activeTooltip={activeTooltips[task.id]}
                      onTooltipToggle={a => toggleTooltip(task.id, a)}
                    />
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Completed section */}
          {completedTasks.length > 0 && (
            <>
              <div className={`text-xs font-semibold uppercase tracking-wide text-zinc-400 pb-1 ${(incompleteTasks.length > 0 || partialTasks.length > 0) ? 'pt-2 border-t border-zinc-100 dark:border-zinc-800' : ''}`}>
                Completed
              </div>
              {completedTasks.map(task => (
                <div key={task.id} data-testid={`cleanup-task-${task.id}`} className="space-y-1">
                  <div className="flex items-start gap-2">
                    <div className="w-3.5 h-3.5 mt-0.5 rounded border-2 border-emerald-500 bg-emerald-500 flex-shrink-0 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-sm text-zinc-400 dark:text-zinc-500 flex-1 line-through">{task.content || 'Untitled'}</span>
                  </div>
                  {renderExpandToggle(task.id)}
                  {renderSubtasks(task.id)}
                  <div className="flex flex-wrap gap-2 ml-5 pt-1">
                    <ActionBtn
                      label="Archive & repeat"
                      action="archive_repeat"
                      resolved={task.resolved}
                      onResolve={a => resolveCleanupTask(task.id, a)}
                      tooltip="Archive this completed task to history with today's date, then reset it to incomplete and keep it in Today's Tasks for tomorrow."
                      activeTooltip={activeTooltips[task.id]}
                      onTooltipToggle={a => toggleTooltip(task.id, a)}
                      testId={`cleanup-action-repeat-${task.id}`}
                    />
                    <ActionBtn
                      label="Archive & remove"
                      action="archive_remove"
                      resolved={task.resolved}
                      onResolve={a => resolveCleanupTask(task.id, a)}
                      tooltip="Archive this completed task to history and permanently remove it from Today's Tasks and its source card."
                      activeTooltip={activeTooltips[task.id]}
                      onTooltipToggle={a => toggleTooltip(task.id, a)}
                      testId={`cleanup-action-remove-${task.id}`}
                    />
                    <ActionBtn
                      label="Return to original card"
                      action="pushback"
                      resolved={task.resolved}
                      onResolve={a => resolveCleanupTask(task.id, a)}
                      tooltip="Unmark as done and remove from Today's Tasks. The task returns to its source card as incomplete. Nothing is archived."
                      activeTooltip={activeTooltips[task.id]}
                      onTooltipToggle={a => toggleTooltip(task.id, a)}
                      testId={`cleanup-action-pushback-${task.id}`}
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer — bulk actions */}
        <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {incompleteTasks.length > 0 && (
              <>
                <button onClick={() => handleApplyAll('today', t => !t.isCompleted && !t.isPartiallyCompleted)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                  All → Today
                </button>
                <button onClick={() => handleApplyAll('complete_repeat', t => !t.isCompleted && !t.isPartiallyCompleted)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                  All: Mark done & repeat
                </button>
                <button onClick={() => handleApplyAll('complete_remove', t => !t.isCompleted && !t.isPartiallyCompleted)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                  All: Mark done & remove
                </button>
                <button onClick={() => handleApplyAll('pushback', t => !t.isCompleted && !t.isPartiallyCompleted)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                  All: Return to card
                </button>
              </>
            )}
            {partialTasks.length > 0 && (
              <>
                <button onClick={() => handleApplyAll('today', t => t.isPartiallyCompleted)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                  All partial → Today
                </button>
                <button onClick={() => handleApplyAll('partial_archive_keep', t => t.isPartiallyCompleted)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                  All partial: Archive done, keep rest
                </button>
                <button onClick={() => handleApplyAll('partial_archive_source', t => t.isPartiallyCompleted)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                  All partial: Archive done, push rest to source
                </button>
              </>
            )}
            {completedTasks.length > 0 && (
              <>
                <button onClick={() => handleApplyAll('archive_repeat', t => t.isCompleted)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                  All ↺ Repeat
                </button>
                <button onClick={() => handleApplyAll('archive_remove', t => t.isCompleted)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                  All ✓ Remove
                </button>
                <button onClick={() => handleApplyAll('pushback', t => t.isCompleted)}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                  All ↩ Push back
                </button>
              </>
            )}
          </div>
          <button
            data-testid="cleanup-done-btn"
            onClick={finalizeDayCleanup}
            disabled={!allResolved}
            className={`px-4 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              allResolved
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
