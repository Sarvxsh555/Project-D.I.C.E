import { useState, useEffect, useCallback } from 'react'
import { approvalService } from '../services/approvalService'
import type { ApprovalView, DecisionRequest } from '../types/approval'
import { extractErrorMessage } from '../utils/errors'
import { useToast } from './useToast'

export function useApprovals() {
  const [approvals, setApprovals] = useState<ApprovalView[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)
  const { success, error: toastError } = useToast()

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const list = await approvalService.getPending()
        if (active) {
          setApprovals(list)
          setIsLoading(false)
        }
      } catch (err) {
        if (active) {
          setError(extractErrorMessage(err, 'Failed to fetch approval queue'))
          setIsLoading(false)
        }
      }
    }
    load()
    return () => {
      active = false
    }
  }, [refreshIndex])

  const refresh = useCallback(() => {
    setIsLoading(true)
    setError(null)
    setRefreshIndex((i) => i + 1)
  }, [])

  const approve = async (id: string, req?: DecisionRequest) => {
    try {
      await approvalService.approve(id, req)
      success('Approval granted successfully')
      refresh()
    } catch (err) {
      toastError(extractErrorMessage(err, 'Failed to approve request'))
    }
  }

  const reject = async (id: string, req?: DecisionRequest) => {
    try {
      await approvalService.reject(id, req)
      success('Request rejected')
      refresh()
    } catch (err) {
      toastError(extractErrorMessage(err, 'Failed to reject request'))
    }
  }

  const escalate = async (id: string, req?: DecisionRequest) => {
    try {
      await approvalService.escalate(id, req)
      success('Request escalated to administration')
      refresh()
    } catch (err) {
      toastError(extractErrorMessage(err, 'Failed to escalate request'))
    }
  }

  return {
    approvals,
    isLoading,
    error,
    approve,
    reject,
    escalate,
    refresh,
  }
}
