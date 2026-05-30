import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

import { cn } from '../../lib/cn'
import { FieldMessage, fieldStateClass } from './form-field'

let textMeasureCanvas: HTMLCanvasElement | null = null

function measureTextWidth(text: string, font: string) {
  if (typeof document === 'undefined') return text.length * 8
  textMeasureCanvas ??= document.createElement('canvas')
  const context = textMeasureCanvas.getContext('2d')
  if (!context) return text.length * 8
  context.font = font
  return context.measureText(text).width
}

export type CompactSelectOption<TValue extends string = string> = {
  value: TValue
  label: string
  description?: string
  disabled?: boolean
  swatch?: string
}

interface CompactSelectProps<TValue extends string = string> {
  id?: string
  name?: string
  value: TValue
  options: Array<CompactSelectOption<TValue>>
  onChange: (value: TValue) => void
  placeholder?: string
  ariaLabel?: string
  hint?: string
  error?: string | null
  disabled?: boolean
  leftIcon?: ReactNode
  className?: string
  wrapperClassName?: string
  dropdownClassName?: string
  optionClassName?: string
  dropdownMinWidth?: number
  dropdownOffset?: number
  dropdownAnchor?: 'self' | 'parent' | 'button'
  dropdownWidth?: 'content' | 'trigger'
  growOnOpen?: boolean
}

export function CompactSelect<TValue extends string = string>({
  id,
  name,
  value,
  options,
  onChange,
  placeholder = 'Selecione',
  ariaLabel,
  hint,
  error,
  disabled,
  leftIcon,
  className,
  wrapperClassName,
  dropdownClassName,
  optionClassName,
  dropdownMinWidth,
  dropdownOffset = 8,
  dropdownAnchor = 'self',
  dropdownWidth = 'content',
  growOnOpen,
}: CompactSelectProps<TValue>) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const listboxId = `${selectId}-listbox`
  const messageId = `${selectId}-message`
  const rootRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const openFrameRef = useRef<number | null>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>()
  const [expandedWidth, setExpandedWidth] = useState<number>()
  const [openAbove, setOpenAbove] = useState(false)

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined
  const enabledIndexes = useMemo(
    () => options.map((option, index) => (option.disabled ? -1 : index)).filter((index) => index >= 0),
    [options],
  )
  const firstEnabledIndex = enabledIndexes[0] ?? -1
  const [activeIndex, setActiveIndex] = useState(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex)
  const hasSwatch = options.some((o) => o.swatch)

  function getAnchorElement() {
    if (dropdownAnchor === 'button') return buttonRef.current ?? rootRef.current
    return dropdownAnchor === 'parent'
      ? rootRef.current?.parentElement ?? rootRef.current ?? buttonRef.current
      : rootRef.current ?? buttonRef.current
  }

  function getMenuWidth(anchorWidth: number) {
    if (dropdownWidth === 'trigger') {
      return Math.min(anchorWidth, Math.max(120, window.innerWidth - 24))
    }
    const buttonStyle = buttonRef.current ? window.getComputedStyle(buttonRef.current) : undefined
    const optionFont = buttonStyle?.font || '500 13px "DM Sans", sans-serif'
    const widestOptionText = options.reduce((width, option) => {
      const labelWidth = measureTextWidth(option.label, optionFont)
      const descriptionWidth = option.description ? measureTextWidth(option.description, optionFont) : 0
      return Math.max(width, labelWidth, descriptionWidth)
    }, 0)
    const optionChromeWidth = 58 + (hasSwatch ? 18 : 0)
    const contentWidth = Math.ceil(widestOptionText + optionChromeWidth)
    const desiredWidth = Math.max(anchorWidth, dropdownMinWidth ?? 0, contentWidth)
    return Math.min(desiredWidth, Math.max(180, window.innerWidth - 24))
  }

  function setExpandedWidthFromAnchor(width: number, anchorWidth: number) {
    const rootWidth = rootRef.current?.getBoundingClientRect().width ?? anchorWidth
    const anchorChromeWidth = dropdownAnchor === 'parent' ? Math.max(0, anchorWidth - rootWidth) : 0
    setExpandedWidth(Math.max(0, width - anchorChromeWidth))
  }

  function cancelPendingOpen() {
    if (openFrameRef.current === null) return
    window.cancelAnimationFrame(openFrameRef.current)
    openFrameRef.current = null
  }

  const syncExpandedWidth = useCallback(() => {
    if (!growOnOpen) return
    const trigger = getAnchorElement()
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    setExpandedWidthFromAnchor(getMenuWidth(rect.width), rect.width)
  }, [growOnOpen, dropdownAnchor, dropdownMinWidth, dropdownWidth, options])

  const updateMenuPosition = useCallback(() => {
    const trigger = getAnchorElement()
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const viewportPadding = 12
    const gap = dropdownOffset
    const width = getMenuWidth(rect.width)
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - width - viewportPadding,
    )
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding - gap
    const spaceAbove = rect.top - viewportPadding - gap
    const shouldOpenAbove = spaceBelow < 180 && spaceAbove > spaceBelow
    const maxHeight = Math.max(120, Math.min(280, shouldOpenAbove ? spaceAbove : spaceBelow))

    setOpenAbove(shouldOpenAbove)
    setExpandedWidthFromAnchor(width, rect.width)
    setMenuStyle({
      position: 'fixed',
      left,
      top: shouldOpenAbove ? rect.top - gap : rect.bottom + gap,
      width,
      maxHeight,
      transform: shouldOpenAbove ? 'translateY(-100%)' : undefined,
      transformOrigin: shouldOpenAbove ? 'bottom' : 'top',
    })
  }, [dropdownAnchor, dropdownMinWidth, dropdownOffset, dropdownWidth, options])

  function getNextIndex(currentIndex: number, direction: 1 | -1) {
    if (enabledIndexes.length === 0) return -1
    const currentPosition = enabledIndexes.indexOf(currentIndex)
    if (currentPosition === -1) return direction === 1 ? enabledIndexes[0] : enabledIndexes[enabledIndexes.length - 1]
    return enabledIndexes[(currentPosition + direction + enabledIndexes.length) % enabledIndexes.length]
  }

  function openMenu(nextActiveIndex = selectedIndex >= 0 ? selectedIndex : firstEnabledIndex) {
    if (disabled || enabledIndexes.length === 0) return
    const trigger = getAnchorElement()
    if (!trigger) return
    cancelPendingOpen()
    const rect = trigger.getBoundingClientRect()
    setExpandedWidthFromAnchor(getMenuWidth(rect.width), rect.width)
    setActiveIndex(nextActiveIndex)
    openFrameRef.current = window.requestAnimationFrame(() => {
      openFrameRef.current = window.requestAnimationFrame(() => {
        openFrameRef.current = null
        updateMenuPosition()
        setIsOpen(true)
      })
    })
  }

  function selectOption(index: number) {
    const option = options[index]
    if (!option || option.disabled) return
    onChange(option.value)
    cancelPendingOpen()
    setExpandedWidth(undefined)
    setIsOpen(false)
    buttonRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!isOpen) openMenu(getNextIndex(selectedIndex, 1))
      else setActiveIndex((current) => getNextIndex(current, 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) openMenu(getNextIndex(selectedIndex, -1))
      else setActiveIndex((current) => getNextIndex(current, -1))
      return
    }
    if (event.key === 'Home' && isOpen) { event.preventDefault(); setActiveIndex(firstEnabledIndex); return }
    if (event.key === 'End' && isOpen) { event.preventDefault(); setActiveIndex(enabledIndexes[enabledIndexes.length - 1] ?? -1); return }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (isOpen) selectOption(activeIndex)
      else openMenu()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelPendingOpen()
      setExpandedWidth(undefined)
      setIsOpen(false)
      return
    }
    if (event.key === 'Tab') {
      cancelPendingOpen()
      setExpandedWidth(undefined)
      setIsOpen(false)
    }
  }

  useEffect(() => cancelPendingOpen, [])

  useEffect(() => {
    if (isOpen) return
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex)
  }, [firstEnabledIndex, isOpen, selectedIndex])

  useLayoutEffect(() => { syncExpandedWidth() }, [syncExpandedWidth, value])

  useEffect(() => {
    if (!growOnOpen) return undefined
    window.addEventListener('resize', syncExpandedWidth)
    return () => window.removeEventListener('resize', syncExpandedWidth)
  }, [growOnOpen, syncExpandedWidth])

  useEffect(() => {
    if (!isOpen) return undefined
    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)
    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [isOpen, updateMenuPosition])

  useEffect(() => {
    if (!isOpen) return undefined
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      cancelPendingOpen()
      setExpandedWidth(undefined)
      setIsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return
    document.getElementById(`${listboxId}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, isOpen, listboxId])

  /* ── Dropdown menu via portal ── */
  const menu = menuStyle && typeof document !== 'undefined' ? createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          style={menuStyle}
          initial={{ opacity: 0, scaleY: 0.94, y: openAbove ? 6 : -6 }}
          animate={{ opacity: 1, scaleY: 1, y: 0 }}
          exit={{ opacity: 0, scaleY: 0.94, y: openAbove ? 6 : -6 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'z-[1200] overflow-hidden rounded-lg border border-slate-300/80 bg-white p-1.5',
            'shadow-[0_20px_60px_rgba(15,23,42,0.14),0_4px_16px_rgba(15,23,42,0.08)]',
            dropdownClassName,
          )}
        >
          <div
            id={listboxId}
            role="listbox"
            className="overflow-x-hidden overflow-y-auto"
            style={{
              maxHeight: typeof menuStyle.maxHeight === 'number'
                ? menuStyle.maxHeight - 12
                : menuStyle.maxHeight,
            }}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value
              const isActive = activeIndex === index

              return (
                <motion.button
                  key={option.value}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  onMouseEnter={() => { if (!option.disabled) setActiveIndex(index) }}
                  onClick={() => selectOption(index)}
                  initial={false}
                  animate={{
                    backgroundColor: isSelected
                      ? 'rgba(79,70,229,1)'
                      : isActive
                        ? 'rgba(238,242,255,1)'
                        : 'rgba(255,255,255,0)',
                  }}
                  transition={{ duration: 0.12 }}
                  className={cn(
                    'group flex w-full min-w-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left outline-none transition-colors',
                    option.disabled && 'cursor-not-allowed opacity-40',
                    optionClassName,
                  )}
                >
                  {/* Swatch */}
                  {option.swatch ? (
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                      style={{ background: option.swatch }}
                    />
                  ) : null}

                  {/* Label + description */}
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate text-[13px] font-semibold leading-snug',
                        isSelected ? 'text-white' : 'text-slate-800',
                      )}
                    >
                      {option.label}
                    </span>
                    {option.description ? (
                      <span
                        className={cn(
                          'mt-0.5 block truncate text-[11px] leading-snug',
                          isSelected ? 'text-indigo-200' : 'text-slate-400',
                        )}
                      >
                        {option.description}
                      </span>
                    ) : null}
                  </span>

                  {/* Check icon */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
                        className="flex-shrink-0"
                      >
                        <Check size={13} className="text-white" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  ) : null

  return (
    <div
      ref={rootRef}
      style={growOnOpen && expandedWidth ? { width: expandedWidth } : undefined}
      className={cn('relative min-w-0', wrapperClassName)}
    >
      {/* ── Trigger button ── */}
      <button
        ref={buttonRef}
        id={selectId}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={(hint || error) ? messageId : undefined}
        aria-activedescendant={isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => {
          if (isOpen) {
            cancelPendingOpen()
            setExpandedWidth(undefined)
            setIsOpen(false)
            return
          }
          openMenu()
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          'group relative inline-flex w-full min-w-0 items-center justify-between gap-2.5 rounded-xl border',
          'min-h-11 px-3.5 text-left leading-none outline-none',
          'border-slate-300 bg-white shadow-sm transition-all duration-200',
          'hover:border-indigo-300 hover:shadow-md',
          isOpen && 'border-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]',
          error && 'border-red-400 bg-red-50/50',
          disabled && 'cursor-not-allowed opacity-55',
          className,
        )}
      >
        {/* Selected value / placeholder */}
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {leftIcon ? (
            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-slate-400">
              {leftIcon}
            </span>
          ) : null}

          {/* Swatch for selected */}
          {selectedOption?.swatch && (
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full ring-1 ring-inset ring-black/10"
              style={{ background: selectedOption.swatch }}
            />
          )}

          <AnimatePresence mode="wait">
            <motion.span
              key={selectedOption?.value ?? '__placeholder__'}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={cn(
                'block min-w-0 flex-1 truncate text-[13px] font-semibold',
                selectedOption ? 'text-slate-800' : 'text-slate-400',
              )}
            >
              {selectedOption?.label ?? placeholder}
            </motion.span>
          </AnimatePresence>
        </span>

        {/* Chevron */}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="flex-shrink-0"
        >
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-4 w-4 transition-colors duration-200',
              isOpen ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-500',
              disabled && 'opacity-45',
            )}
          />
        </motion.span>

        {/* Active underline */}
        <motion.span
          className="pointer-events-none absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-indigo-500"
          initial={false}
          animate={{ scaleX: isOpen ? 1 : 0, opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: 'left' }}
        />
      </button>

      {name ? <input type="hidden" name={name} value={value} /> : null}
      <FieldMessage id={messageId} hint={hint} error={error} />
      {menu}
    </div>
  )
}
