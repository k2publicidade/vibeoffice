'use client'

import * as React from 'react'
import { CheckIcon, ChevronDownIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

// ============================================================================
// Types
// ============================================================================

export interface MultiSelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface MultiSelectContextValue {
  selectedValues: string[]
  onSelect: (value: string) => void
  onRemove: (value: string) => void
  isSelected: (value: string) => boolean
}

// ============================================================================
// Context
// ============================================================================

const MultiSelectContext = React.createContext<MultiSelectContextValue | undefined>(undefined)

function useMultiSelect() {
  const context = React.useContext(MultiSelectContext)
  if (!context) {
    throw new Error('useMultiSelect must be used within a MultiSelect')
  }
  return context
}

// ============================================================================
// MultiSelect Root
// ============================================================================

interface MultiSelectProps {
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  children?: React.ReactNode
  maxDisplayItems?: number
  renderSelectedValues?: (selectedValues: string[], options: MultiSelectOption[]) => React.ReactNode
}

function MultiSelect({
  value,
  onValueChange,
  placeholder = 'Selecione...',
  disabled = false,
  className,
  children,
  maxDisplayItems = 2,
  renderSelectedValues,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)

  const handleSelect = React.useCallback(
    (selectedValue: string) => {
      if (value.includes(selectedValue)) {
        onValueChange(value.filter((v) => v !== selectedValue))
      } else {
        onValueChange([...value, selectedValue])
      }
    },
    [value, onValueChange]
  )

  const handleRemove = React.useCallback(
    (removedValue: string) => {
      onValueChange(value.filter((v) => v !== removedValue))
    },
    [value, onValueChange]
  )

  const isSelected = React.useCallback(
    (checkValue: string) => value.includes(checkValue),
    [value]
  )

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Close on Escape
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const contextValue = React.useMemo(
    () => ({
      selectedValues: value,
      onSelect: handleSelect,
      onRemove: handleRemove,
      isSelected,
    }),
    [value, handleSelect, handleRemove, isSelected]
  )

  return (
    <MultiSelectContext.Provider value={contextValue}>
      <div className={cn('relative', className)}>
        <MultiSelectTrigger
          ref={triggerRef}
          open={open}
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          placeholder={placeholder}
          maxDisplayItems={maxDisplayItems}
          renderSelectedValues={renderSelectedValues}
        />
        {open && (
          <MultiSelectContent ref={contentRef}>
            {children}
          </MultiSelectContent>
        )}
      </div>
    </MultiSelectContext.Provider>
  )
}

// ============================================================================
// MultiSelect Trigger
// ============================================================================

interface MultiSelectTriggerProps {
  open: boolean
  onClick: () => void
  disabled?: boolean
  placeholder: string
  maxDisplayItems: number
  renderSelectedValues?: (selectedValues: string[], options: MultiSelectOption[]) => React.ReactNode
}

const MultiSelectTrigger = React.forwardRef<HTMLButtonElement, MultiSelectTriggerProps>(
  ({ open, onClick, disabled, placeholder, maxDisplayItems, renderSelectedValues }, ref) => {
    const { selectedValues, onRemove } = useMultiSelect()

    const displayContent = () => {
      if (selectedValues.length === 0) {
        return <span className="text-muted-foreground">{placeholder}</span>
      }

      if (renderSelectedValues) {
        return renderSelectedValues(selectedValues, [])
      }

      if (selectedValues.length <= maxDisplayItems) {
        return (
          <div className="flex flex-wrap gap-1">
            {selectedValues.map((val) => (
              <Badge
                key={val}
                variant="secondary"
                className="text-xs px-2 py-0.5 gap-1"
              >
                {val}
                <button
                  type="button"
                  className="ml-1 hover:text-destructive transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(val)
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )
      }

      return (
        <span className="text-foreground">
          {selectedValues.length} selecionados
        </span>
      )
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'border-input data-[placeholder]:text-muted-foreground',
          '[&_svg:not([class*="text-"])]:text-muted-foreground',
          'focus-visible:border-ring focus-visible:ring-ring/50',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
          'aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50',
          'flex w-full items-center justify-between gap-2 rounded-md border',
          'bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs',
          'transition-[color,box-shadow] outline-none focus-visible:ring-[3px]',
          'disabled:cursor-not-allowed disabled:opacity-50 min-h-9',
          open && 'border-ring ring-ring/50 ring-[3px]'
        )}
      >
        <div className="flex-1 text-left overflow-hidden">
          {displayContent()}
        </div>
        <ChevronDownIcon
          className={cn(
            'size-4 opacity-50 shrink-0 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>
    )
  }
)
MultiSelectTrigger.displayName = 'MultiSelectTrigger'

// ============================================================================
// MultiSelect Content
// ============================================================================

const MultiSelectContent = React.forwardRef<HTMLDivElement, { children?: React.ReactNode }>(
  ({ children }, ref) => {
    return (
      <div
        ref={ref}
        role="listbox"
        aria-multiselectable="true"
        className={cn(
          // Position
          'absolute z-50 top-full left-0 right-0 mt-1',
          // Dark mode styling (matching Select)
          'bg-zinc-900 text-foreground border border-zinc-800',
          // Animations
          'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2',
          // Layout
          'max-h-60 overflow-y-auto overflow-x-hidden rounded-xl shadow-lg p-1'
        )}
      >
        {children}
      </div>
    )
  }
)
MultiSelectContent.displayName = 'MultiSelectContent'

// ============================================================================
// MultiSelect Item
// ============================================================================

interface MultiSelectItemProps {
  value: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

function MultiSelectItem({ value, children, disabled = false, className }: MultiSelectItemProps) {
  const { isSelected, onSelect } = useMultiSelect()
  const selected = isSelected(value)

  return (
    <div
      role="option"
      aria-selected={selected}
      aria-disabled={disabled}
      onClick={() => !disabled && onSelect(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          !disabled && onSelect(value)
        }
      }}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center',
        'rounded-sm py-2 px-2 text-sm outline-none',
        'transition-colors duration-150',
        'hover:bg-accent hover:text-accent-foreground',
        'focus:bg-accent focus:text-accent-foreground',
        selected && 'bg-accent/50',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    >
      {/* Checkbox visual */}
      <div
        className={cn(
          'mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border',
          'transition-all duration-150',
          selected
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-input bg-transparent dark:bg-input/30'
        )}
      >
        {selected && <CheckIcon className="h-3 w-3" />}
      </div>

      {/* Label */}
      <span className="flex-1">{children}</span>
    </div>
  )
}

// ============================================================================
// MultiSelect Label
// ============================================================================

function MultiSelectLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('text-muted-foreground px-2 py-1.5 text-xs font-medium', className)}>
      {children}
    </div>
  )
}

// ============================================================================
// MultiSelect Separator
// ============================================================================

function MultiSelectSeparator({ className }: { className?: string }) {
  return <div className={cn('bg-border -mx-1 my-1 h-px', className)} />
}

// ============================================================================
// MultiSelect Group
// ============================================================================

function MultiSelectGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('', className)}>{children}</div>
}

// ============================================================================
// Exports
// ============================================================================

export {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectLabel,
  MultiSelectSeparator,
  MultiSelectGroup,
  useMultiSelect,
}
