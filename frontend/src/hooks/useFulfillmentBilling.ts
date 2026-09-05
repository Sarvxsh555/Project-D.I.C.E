import { useState, useCallback } from 'react'
import { fulfillmentService } from '../services/fulfillmentService'
import { billingService } from '../services/billingService'
import type { FulfillmentPlan } from '../types/fulfillment'
import type { BillingSchedule } from '../types/billing'
import { extractErrorMessage } from '../utils/errors'
import { useToast } from './useToast'

export function useFulfillmentBilling() {
  const [fulfillmentPlan, setFulfillmentPlan] = useState<FulfillmentPlan | null>(null)
  const [billingSchedule, setBillingSchedule] = useState<BillingSchedule | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()

  const loadPlan = useCallback(async (dealId: string) => {
    try {
      const plan = await fulfillmentService.getPlan(dealId)
      setFulfillmentPlan(plan)
      setIsLoading(false)
      return plan
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to load fulfillment plan')
      setError(msg)
      setIsLoading(false)
      return null
    }
  }, [])

  const commitPlan = async (dealId: string) => {
    try {
      const plan = await fulfillmentService.commit(dealId)
      setFulfillmentPlan(plan)
      success('Fulfillment plan committed across warehouse network')
      return plan
    } catch (err) {
      toastError(extractErrorMessage(err, 'Failed to commit fulfillment plan'))
      return null
    }
  }

  const markShipped = async (dealId: string) => {
    try {
      const deal = await fulfillmentService.ship(dealId)
      success(`Deal ${deal.dealNumber} marked as shipped`)
      return deal
    } catch (err) {
      toastError(extractErrorMessage(err, 'Failed to record shipment'))
      return null
    }
  }

  const loadSchedule = useCallback(async (dealId: string) => {
    try {
      const sched = await billingService.getSchedule(dealId)
      setBillingSchedule(sched)
      setIsLoading(false)
      return sched
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to load billing schedule')
      setError(msg)
      setIsLoading(false)
      return null
    }
  }, [])

  const draftInvoice = async (dealId: string) => {
    try {
      const sched = await billingService.draft(dealId)
      setBillingSchedule(sched)
      success('Invoice drafted and queued for dispatch')
      return sched
    } catch (err) {
      toastError(extractErrorMessage(err, 'Failed to draft invoice'))
      return null
    }
  }

  return {
    fulfillmentPlan,
    billingSchedule,
    isLoading,
    error,
    loadPlan,
    commitPlan,
    markShipped,
    loadSchedule,
    draftInvoice,
  }
}
