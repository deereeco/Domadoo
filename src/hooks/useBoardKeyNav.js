import { useEffect } from 'react'
import { useStore } from '../store/useStore.js'

export function useBoardKeyNav() {
  const addRootNode = useStore(s => s.addRootNode)
  const undo = useStore(s => s.undo)
  const redo = useStore(s => s.redo)

  useEffect(() => {
    const handler = (e) => {
      const inContentEditable = document.activeElement?.contentEditable === 'true'

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        if (!inContentEditable) { e.preventDefault(); undo() }
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        if (!inContentEditable) { e.preventDefault(); redo() }
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        const newId = addRootNode()
        setTimeout(() => {
          const el = document.querySelector(`[data-nodeid="${newId}"] [contenteditable]`)
          if (el) {
            el.focus()
            const r = document.createRange()
            r.selectNodeContents(el)
            r.collapse(false)
            const s = window.getSelection()
            s.removeAllRanges()
            s.addRange(r)
          }
        }, 50)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [addRootNode, undo, redo])
}
