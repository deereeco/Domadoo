export default function LabelPill({ label, onRemove, small = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${
        small ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
      }`}
      style={{ backgroundColor: label.color + '33', color: label.color }}
    >
      {label.name}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(label.id) }}
          className="hover:opacity-70 ml-0.5"
        >
          ×
        </button>
      )}
    </span>
  )
}
