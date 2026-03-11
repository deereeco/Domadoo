import { useRef, useEffect, useCallback } from 'react'

export default function NodeContent({ content, onChange, onKeyDown, className = '', placeholder = 'Note…' }) {
  const ref = useRef(null)

  // Sync external content changes (e.g. undo)
  useEffect(() => {
    if (ref.current && ref.current.textContent !== content) {
      ref.current.textContent = content
    }
  }, [content])

  const handleInput = useCallback(() => {
    onChange(ref.current.textContent)
  }, [onChange])

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={onKeyDown}
      data-placeholder={placeholder}
      className={`outline-none min-w-0 break-words ${className} empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400 dark:empty:before:text-zinc-600`}
    />
  )
}
