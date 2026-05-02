import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'

import { cn } from '../../lib/cn'

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
  disabled?: boolean
  className?: string
  wrapperClassName?: string
  dropdownClassName?: string
  optionClassName?: string
  dropdownMinWidth?: number
  dropdownOffset?: number
  dropdownAnchor?: 'self' | 'parent'
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
  disabled,
  className,
  wrapperClassName,
  dropdownClassName,
  optionClassName,
  dropdownMinWidth,
  dropdownOffset = 8,
  dropdownAnchor = 'self',
  growOnOpen,
}: CompactSelectProps<TValue>) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const listboxId = `${selectId}-listbox`
  const rootRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const openFrameRef = useRef<number | null>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>()
  const [expandedWidth, setExpandedWidth] = useState<number>()

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined
  const enabledIndexes = useMemo(
    () => options.map((option, index) => (option.disabled ? -1 : index)).filter((index) => index >= 0),
    [options],
  )
  const firstEnabledIndex = enabledIndexes[0] ?? -1
  const [activeIndex, setActiveIndex] = useState(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex)

  function getAnchorElement() {
    return dropdownAnchor === 'parent'
      ? rootRef.current?.parentElement ?? rootRef.current ?? buttonRef.current
      : rootRef.current ?? buttonRef.current
  }

  function getMenuWidth(anchorWidth: number) {
    const buttonStyle = buttonRef.current ? window.getComputedStyle(buttonRef.current) : undefined
    const optionFont = buttonStyle?.font || '500 13px "DM Sans", sans-serif'
    const widestOptionText = options.reduce((width, option) => {
      const labelWidth = measureTextWidth(option.label, optionFont)
      const descriptionWidth = option.description ? measureTextWidth(option.description, optionFont) : 0
      return Math.max(width, labelWidth, descriptionWidth)
    }, 0)
    const optionChromeWidth = 58 + (options.some((option) => option.swatch) ? 18 : 0)
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
  }, [growOnOpen, dropdownAnchor, dropdownMinWidth, options])

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
    const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow
    const maxHeight = Math.max(120, Math.min(280, openAbove ? spaceAbove : spaceBelow))

    setExpandedWidthFromAnchor(width, rect.width)
    setMenuStyle({
      position: 'fixed',
      left,
      top: openAbove ? rect.top - gap : rect.bottom + gap,
      width,
      maxHeight,
      transform: openAbove ? 'translateY(-100%)' : undefined,
      transformOrigin: openAbove ? 'bottom' : 'top',
    })
  }, [dropdownAnchor, dropdownMinWidth, dropdownOffset, options])

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

    if (event.key === 'Home' && isOpen) {
      event.preventDefault()
      setActiveIndex(firstEnabledIndex)
      return
    }

    if (event.key === 'End' && isOpen) {
      event.preventDefault()
      setActiveIndex(enabledIndexes[enabledIndexes.length - 1] ?? -1)
      return
    }

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

  useLayoutEffect(() => {
    syncExpandedWidth()
  }, [syncExpandedWidth, value])

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

  const menu = isOpen && menuStyle && typeof document !== 'undefined' ? createPortal(
    <div
      ref={menuRef}
      style={menuStyle}
      className={cn(
        'z-[1200] rounded-lg border border-stone-300 bg-white p-1 shadow-[0_18px_40px_rgba(28,25,23,.16)] animate-[fadein_.12s_ease]',
        dropdownClassName,
      )}
    >
      <div
        id={listboxId}
        role="listbox"
        className="overflow-x-hidden overflow-y-auto pr-0.5"
        style={{ maxHeight: typeof menuStyle.maxHeight === 'number' ? menuStyle.maxHeight - 8 : menuStyle.maxHeight }}
      >
        {options.map((option, index) => {
          const isSelected = option.value === value
          const isActive = activeIndex === index

          return (
            <button
              key={option.value}
              id={`${listboxId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={option.disabled}
              onMouseEnter={() => {
                if (!option.disabled) setActiveIndex(index)
              }}
              onClick={() => selectOption(index)}
              className={cn(
                'flex w-full min-w-0 items-start gap-2 whitespace-normal rounded-md px-2.5 py-2 text-left text-[13px] font-medium leading-snug outline-none transition-colors',
                isSelected
                  ? 'bg-stone-900 text-white'
                  : isActive
                    ? 'bg-stone-100 text-stone-950'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-950',
                option.disabled && 'cursor-not-allowed opacity-45',
                optionClassName,
              )}
            >
              {option.swatch ? (
                <span
                  className="mt-[5px] h-2 w-2 flex-shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                  style={{ background: option.swatch }}
                />
              ) : null}
              <span className="min-w-0 flex-1 whitespace-normal">
                <span className="block whitespace-normal break-words leading-snug [overflow-wrap:anywhere]">{option.label}</span>
                {option.description ? (
                  <span className={cn('mt-0.5 block whitespace-normal break-words text-[11px] leading-snug [overflow-wrap:anywhere]', isSelected ? 'text-white/70' : 'text-stone-400')}>
                    {option.description}
                  </span>
                ) : null}
              </span>
              {isSelected ? <Check size={14} className="mt-0.5 flex-shrink-0" /> : null}
            </button>
          )
        })}
      </div>
    </div>,
    document.body,
  ) : null

  return (
    <div
      ref={rootRef}
      style={growOnOpen && expandedWidth ? { width: expandedWidth } : undefined}
      className={cn('relative min-w-0', wrapperClassName)}
    >
      <button
        ref={buttonRef}
        id={selectId}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
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
        className={cn('inline-flex w-full min-w-0 items-center text-left leading-none', className)}
      >
        <span className="block min-w-0 truncate">{selectedOption?.label ?? placeholder}</span>
      </button>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      {menu}
    </div>
  )
}
