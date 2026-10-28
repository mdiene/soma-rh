import {
  flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable,
  type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import clsx from 'clsx'
import { ArrowDown, ArrowUp, Download, Search } from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui'

type Props<T> = {
  data: T[]
  // TanStack Table : chaque colonne a son propre type de valeur, d'où `any` (usage recommandé par la bibliothèque)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[]
  searchPlaceholder?: string
  onRowClick?: (row: T) => void
  exportName?: string
  footer?: boolean
  dense?: boolean
  toolbar?: React.ReactNode
}

/** Tableau triable et filtrable (TanStack Table), avec export CSV compatible Excel. */
export function DataTable<T>({ data, columns, searchPlaceholder = 'Rechercher…', onRowClick, exportName, footer, dense, toolbar }: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [filter, setFilter] = useState('')
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  function exportCsv() {
    const cols = table.getVisibleLeafColumns().filter((c) => c.id !== 'actions')
    const head = cols.map((c) => JSON.stringify(typeof c.columnDef.header === 'string' ? c.columnDef.header : c.id))
    const lines = table.getFilteredRowModel().rows.map((r) =>
      cols.map((c) => {
        const v = r.getValue(c.id)
        if (typeof v === 'number') return String(v).replace('.', ',')
        return JSON.stringify(v ?? '')
      }).join(';'),
    )
    const blob = new Blob(['﻿' + [head.join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${exportName ?? 'export'}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const pad = dense ? 'px-2 py-1.5' : 'px-3 py-2'
  return (
    <div className="panel overflow-hidden">
      <div className="no-print flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <label className="relative flex-1 min-w-[12rem] max-w-sm">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-ink-muted" aria-hidden />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={searchPlaceholder} className="field pl-8" />
        </label>
        <span className="text-xs text-ink-muted">{table.getFilteredRowModel().rows.length} ligne(s)</span>
        <div className="ml-auto flex items-center gap-2">
          {toolbar}
          {exportName && <Button size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={exportCsv}>Exporter CSV</Button>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="table-head">
                {hg.headers.map((h) => {
                  const meta = h.column.columnDef.meta as { align?: 'right' } | undefined
                  return (
                    <th key={h.id} className={clsx(pad, 'whitespace-nowrap', meta?.align === 'right' && 'text-right')}>
                      {h.isPlaceholder ? null : h.column.getCanSort() ? (
                        <button className="inline-flex items-center gap-1 hover:text-ink" onClick={h.column.getToggleSortingHandler()}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {h.column.getIsSorted() === 'asc' && <ArrowUp className="h-3 w-3" />}
                          {h.column.getIsSorted() === 'desc' && <ArrowDown className="h-3 w-3" />}
                        </button>
                      ) : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={clsx('border-b border-line/70 last:border-0', onRowClick && 'cursor-pointer hover:bg-river-light/40')}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as { align?: 'right' } | undefined
                  return (
                    <td key={cell.id} className={clsx(pad, 'whitespace-nowrap', meta?.align === 'right' && 'text-right')}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )
                })}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-sm text-ink-muted">Aucune ligne ne correspond à la recherche.</td></tr>
            )}
          </tbody>
          {footer && (
            <tfoot>
              {table.getFooterGroups().map((fg) => (
                <tr key={fg.id} className="border-t-2 border-ink/20 bg-paper font-semibold">
                  {fg.headers.map((h) => {
                    const meta = h.column.columnDef.meta as { align?: 'right' } | undefined
                    return (
                      <td key={h.id} className={clsx(pad, 'whitespace-nowrap', meta?.align === 'right' && 'text-right')}>
                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.footer, h.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
