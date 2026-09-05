import { useState, useEffect, useCallback } from 'react'
import { quotationService, type ListDealParams } from '../services/quotationService'
import type { DealSummary, DealDetail, CreateDealRequest, DealStatus } from '../types/deal'
import { extractErrorMessage } from '../utils/errors'
import { useToast } from './useToast'

export function useQuotations(initialParams?: ListDealParams) {
  const [deals, setDeals] = useState<DealSummary[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(initialParams?.page ?? 0)
  const [pageSize, setPageSize] = useState(initialParams?.size ?? 10)
  const [statusFilter, setStatusFilter] = useState<DealStatus | undefined>(initialParams?.status)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)
  const { success, error: toastError } = useToast()

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const page = await quotationService.list({
          page: currentPage,
          size: pageSize,
          status: statusFilter,
        })
        if (active) {
          setDeals(page.content)
          setTotalElements(page.totalElements)
          setTotalPages(page.totalPages)
          setIsLoading(false)
        }
      } catch (err) {
        if (active) {
          setError(extractErrorMessage(err, 'Failed to fetch quotations'))
          setIsLoading(false)
        }
      }
    }
    load()
    return () => {
      active = false
    }
  }, [currentPage, pageSize, statusFilter, refreshIndex])

  const refresh = useCallback(() => {
    setIsLoading(true)
    setError(null)
    setRefreshIndex((i) => i + 1)
  }, [])

  const createDeal = async (payload: CreateDealRequest): Promise<DealDetail | null> => {
    try {
      const created = await quotationService.create(payload)
      success(`Deal ${created.dealNumber} created successfully`)
      refresh()
      return created
    } catch (err) {
      toastError(extractErrorMessage(err, 'Failed to create deal'))
      return null
    }
  }

  const applyDiscount = async (id: string, percent: number): Promise<DealDetail | null> => {
    try {
      const updated = await quotationService.applyDiscount(id, { discountPercent: percent })
      success(`Applied ${percent}% discount to ${updated.dealNumber}`)
      refresh()
      return updated
    } catch (err) {
      toastError(extractErrorMessage(err, 'Failed to apply discount'))
      return null
    }
  }

  return {
    deals,
    totalElements,
    totalPages,
    currentPage,
    pageSize,
    statusFilter,
    isLoading,
    error,
    setCurrentPage,
    setPageSize,
    setStatusFilter,
    createDeal,
    applyDiscount,
    refresh,
  }
}
