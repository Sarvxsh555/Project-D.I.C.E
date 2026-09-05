import React, { createContext, useContext } from 'react'
import { cn } from '../../utils/cn'

interface TabsContextType {
  value: string
  onChange: (val: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

export interface TabItem {
  id: string
  label: string
  count?: number
}

export interface TabsProps {
  value?: string
  onValueChange?: (value: string) => void
  tabs?: TabItem[]
  activeTab?: string
  onChange?: (value: string) => void
  children?: React.ReactNode
  className?: string
}

export function Tabs({
  value,
  onValueChange,
  tabs,
  activeTab,
  onChange,
  children,
  className,
}: TabsProps) {
  const currentVal = value ?? activeTab ?? ''
  const handleValChange = onValueChange ?? onChange ?? (() => {})

  return (
    <TabsContext.Provider value={{ value: currentVal, onChange: handleValChange }}>
      <div className={cn('w-full', className)}>
        {tabs ? (
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} count={tab.count}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        ) : null}
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b border-slate-200 pb-px text-sm font-medium text-slate-600',
        className
      )}
    >
      {children}
    </div>
  )
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  count?: number
}

export function TabsTrigger({
  value,
  count,
  className,
  children,
  ...props
}: TabsTriggerProps) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('TabsTrigger must be used within Tabs')

  const isSelected = ctx.value === value

  return (
    <button
      type="button"
      onClick={() => ctx.onChange(value)}
      className={cn(
        'relative inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold tracking-wide transition-all border-b-2',
        isSelected
          ? 'border-[#5E2A52] text-[#5E2A52]'
          : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300',
        className
      )}
      {...props}
    >
      <span>{children}</span>
      {count !== undefined && (
        <span
          className={cn(
            'ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-semibold',
            isSelected ? 'bg-[#FAF5F9] text-[#5E2A52]' : 'bg-slate-100 text-slate-600'
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('TabsContent must be used within Tabs')

  if (ctx.value !== value) return null

  return (
    <div className={cn('pt-4', className)} {...props}>
      {children}
    </div>
  )
}
