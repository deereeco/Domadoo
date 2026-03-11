import { useStore } from '../../store/useStore.js'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import NodeItem from '../Node/NodeItem.jsx'
import NodeContent from '../Node/NodeContent.jsx'

function Breadcrumb({ nodeId }) {
  const nodes = useStore(s => s.nodes)
  const crumbs = []
  let current = nodes[nodeId]
  while (current) {
    crumbs.unshift(current)
    current = current.parentId ? nodes[current.parentId] : null
  }
  return (
    <div className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500 flex-wrap">
      {crumbs.map((n, i) => (
        <span key={n.id} className="flex items-center gap-1">
          {i > 0 && <span>/</span>}
          <span className={i === crumbs.length - 1 ? 'text-zinc-600 dark:text-zinc-300 font-medium' : ''}>
            {n.content || 'Untitled'}
          </span>
        </span>
      ))}
    </div>
  )
}

export default function DetailsModal() {
  const { detailsModalNodeId, closeDetailsModal, nodes, updateNodeContent, addChildNode, toggleComplete } = useStore()
  const node = nodes[detailsModalNodeId]

  if (!node) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={closeDetailsModal}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-zinc-200 dark:border-zinc-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-1">
              <Breadcrumb nodeId={detailsModalNodeId} />
              <NodeContent
                content={node.content}
                onChange={val => updateNodeContent(detailsModalNodeId, val)}
                placeholder="Title…"
                className="text-xl font-semibold text-zinc-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {node.type === 'CHECKBOX' && (
                <button
                  onClick={() => toggleComplete(detailsModalNodeId)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    node.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200'
                  }`}
                >
                  {node.status === 'COMPLETED' ? '✓ Done' : 'Mark done'}
                </button>
              )}
              <button
                onClick={closeDetailsModal}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {node.childrenIds.map(childId => (
            <NodeItem
              key={childId}
              nodeId={childId}
              parentId={detailsModalNodeId}
              depth={0}
              focusNode={() => {}}
            />
          ))}

          <button
            onClick={() => addChildNode(detailsModalNodeId)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors mt-2"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
            </svg>
            Add sub-item
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-600 flex items-center justify-between">
          <span>Created {new Date(node.createdAt).toLocaleDateString()}</span>
          {node.completedAt && (
            <span>Completed {new Date(node.completedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  )
}
