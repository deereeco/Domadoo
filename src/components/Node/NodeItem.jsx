import { useState, useRef, useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../../store/useStore.js'
import { useKeyboardNav } from '../../hooks/useKeyboardNav.js'
import { useNodeVisibility, useDescendantLabelColors } from '../../hooks/useNodeVisibility.js'
import NodeContent from './NodeContent.jsx'
import LabelPill from '../Labels/LabelPill.jsx'
import LabelAssigner from '../Labels/LabelAssigner.jsx'

export default function NodeItem({ nodeId, parentId, depth = 0, focusNode }) {
  const node = useStore(s => s.nodes[nodeId])
  const labels = useStore(s => s.labels)
  const { updateNodeContent, toggleComplete, toggleExpand, toggleNodeType,
          toggleLabelOnNode, deleteNode, openDetailsModal, addChildNode, dragMode } = useStore()

  const visibility = useNodeVisibility()
  const vis = visibility[nodeId] ?? { visible: true, dimmed: false, hasHiddenChildren: false }
  const descendantColors = useDescendantLabelColors(nodeId)

  const [showLabelAssigner, setShowLabelAssigner] = useState(false)
  const [showNodeMenu, setShowNodeMenu] = useState(false)
  const nodeRef = useRef(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: nodeId,
    data: { type: 'node', nodeId, parentId, depth },
  })

  const handleKeyDown = useKeyboardNav(nodeId, parentId, focusNode)

  const focusThis = useCallback(() => {
    const el = nodeRef.current?.querySelector('[contenteditable]')
    if (el) { el.focus(); const range = document.createRange(); range.selectNodeContents(el); range.collapse(false); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range) }
  }, [])

  if (!node || !vis.visible) return null

  const isCompleted = node.status === 'COMPLETED'
  const hasChildren = node.childrenIds.length > 0
  const nodeLabels = node.labelIds.map(id => labels[id]).filter(Boolean)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : vis.dimmed ? 0.45 : 1,
  }

  return (
    <div
      ref={(el) => { setNodeRef(el); nodeRef.current = el }}
      data-nodeid={nodeId}
      style={{ ...style, paddingLeft: depth > 0 ? `${Math.min(depth * 16, 64)}px` : undefined }}
      className="group relative"
    >
      <div
        {...attributes}
        {...listeners}
        className={`flex items-start gap-1.5 py-0.5 rounded-lg px-1 -mx-1 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors touch-none ${dragMode ? 'cursor-grab select-none' : ''} ${vis.dimmed ? 'opacity-40' : ''}`}
      >
        {/* Drag handle — always visible in drag mode, hover-only otherwise */}
        <span
          className={`flex-shrink-0 mt-1 text-zinc-400 ${dragMode ? 'opacity-40' : 'opacity-0 group-hover:opacity-40'}`}
          aria-hidden="true"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
          </svg>
        </span>

        {/* Interactive content — disabled in drag mode */}
        <div className={`flex items-start gap-1.5 flex-1 min-w-0 ${dragMode ? 'pointer-events-none' : ''}`}>

        {/* Expand toggle */}
        <button
          onClick={() => hasChildren && toggleExpand(nodeId)}
          className={`flex-shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center text-zinc-400 transition-transform ${
            hasChildren ? 'hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer' : 'opacity-0 cursor-default'
          } ${node.uiState.isExpanded ? '' : '-rotate-90'}`}
          tabIndex={-1}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Checkbox or bullet */}
        {node.type === 'CHECKBOX' ? (
          <button
            onClick={() => toggleComplete(nodeId)}
            className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              isCompleted
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-500 dark:hover:border-zinc-400'
            }`}
          >
            {isCompleted && (
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ) : (
          <span className="flex-shrink-0 mt-2 w-4 flex justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
          </span>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <NodeContent
            content={node.content}
            onChange={(val) => updateNodeContent(nodeId, val)}
            onKeyDown={handleKeyDown}
            placeholder={depth === 0 ? 'Task…' : 'Sub-task…'}
            className={`text-sm text-zinc-800 dark:text-zinc-100 leading-relaxed ${
              isCompleted ? 'line-through text-zinc-400 dark:text-zinc-600' : ''
            }`}
          />

          {/* Labels row */}
          {nodeLabels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {nodeLabels.map(label => (
                <LabelPill
                  key={label.id}
                  label={label}
                  small
                  onRemove={() => toggleLabelOnNode(nodeId, label.id)}
                />
              ))}
            </div>
          )}

          {/* Collapsed summary dots */}
          {!node.uiState.isExpanded && hasChildren && descendantColors.length > 0 && (
            <div className="flex gap-1 mt-1">
              {descendantColors.map((color, i) => (
                <span key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              ))}
            </div>
          )}

          {/* Hidden children indicator */}
          {vis.hasHiddenChildren && node.uiState.isExpanded && (
            <p className="text-[10px] text-zinc-400 italic mt-0.5">Some items hidden by filter</p>
          )}
        </div>

        {/* Node actions (shown on hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {/* Add child */}
          <button
            onClick={() => { addChildNode(nodeId); toggleExpand(nodeId) && null; useStore.getState().updateNode(nodeId, { uiState: { ...node.uiState, isExpanded: true } }) }}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            title="Add sub-item"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
            </svg>
          </button>

          {/* Type toggle */}
          <button
            onClick={() => toggleNodeType(nodeId)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            title={node.type === 'CHECKBOX' ? 'Switch to bullet' : 'Switch to checkbox'}
          >
            {node.type === 'CHECKBOX' ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="4" strokeWidth={2} />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="3" strokeWidth={2} />
              </svg>
            )}
          </button>

          {/* Label assigner */}
          <div className="relative">
            <button
              onClick={() => setShowLabelAssigner(v => !v)}
              className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              title="Add label"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </button>
            {showLabelAssigner && (
              <LabelAssigner nodeId={nodeId} onClose={() => setShowLabelAssigner(false)} />
            )}
          </div>

          {/* Open details */}
          <button
            onClick={() => openDetailsModal(nodeId)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            title="Open details"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          </button>

          {/* Delete */}
          <button
            onClick={() => deleteNode(nodeId)}
            className="p-1 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        </div>{/* end interactive content wrapper */}
      </div>

      {/* Children */}
      {node.uiState.isExpanded && hasChildren && (
        <div className="ml-6">
          {node.childrenIds.map(childId => (
            <NodeItem
              key={childId}
              nodeId={childId}
              parentId={nodeId}
              depth={depth + 1}
              focusNode={focusNode}
            />
          ))}
        </div>
      )}
    </div>
  )
}
