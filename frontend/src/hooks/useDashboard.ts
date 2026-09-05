import { useState, useEffect, useCallback } from 'react'
import { dashboardService, type DashboardSummary, type ActivityItem, type ApprovalQueueItem } from '../services/dashboardService'
import { extractErrorMessage } from '../utils/errors'

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [approvalQueue, setApprovalQueue] = useState<ApprovalQueueItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [sum, queue, act] = await Promise.all([
          dashboardService.getSummary(),
          dashboardService.getApprovalQueue(),
          dashboardService.getActivity(),
        ])
        if (active) {
          setSummary(sum)
          setApprovalQueue(queue)
          setActivity(act)
          setIsLoading(false)
        }
      } catch (err) {
        if (active) {
          setError(extractErrorMessage(err, 'Failed to fetch dashboard data'))
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
    setRefreshIndex((prev) => prev + 1)
  }, [])

  return {
    summary,
    approvalQueue,
    activity,
    isLoading,
    error,
    refresh,
  }
}
