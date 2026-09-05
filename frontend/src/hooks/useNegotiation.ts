import { useState, useCallback } from 'react'
import { quotationService } from '../services/quotationService'
import type { SimulationResponse } from '../types/dice'
import { extractErrorMessage } from '../utils/errors'
import { useToast } from './useToast'

// Real preview/accept (POST /negotiations/{dealId}/preview|accept) live on
// quotationService, correctly typed against NegotiationController's actual
// response shape — see DiceSimulationDrawer for the primary consumer.
export function useNegotiation(dealId?: string) {
  const [preview, setPreview] = useState<SimulationResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()

  const previewDiscount = useCallback(
    async (targetDealId: string, discountPercent: number) => {
      try {
        const res = await quotationService.simulate(targetDealId, discountPercent)
        setPreview(res)
        setError(null)
        setIsLoading(false)
        return res
      } catch (err) {
        const msg = extractErrorMessage(err, 'Failed to calculate counter-offer preview')
        setError(msg)
        setIsLoading(false)
        return null
      }
    },
    []
  )

  const acceptOffer = async (targetDealId: string, discountPercent: number) => {
    try {
      const deal = await quotationService.acceptNegotiation(targetDealId, discountPercent)
      success(`Counter-offer of ${discountPercent}% committed to deal ${deal.dealNumber}`)
      setIsLoading(false)
      return deal
    } catch (err) {
      toastError(extractErrorMessage(err, 'Failed to commit counter-offer'))
      setIsLoading(false)
      return null
    }
  }

  return {
    preview,
    isLoading,
    error,
    previewDiscount: (percent: number) => dealId && previewDiscount(dealId, percent),
    previewDiscountForDeal: previewDiscount,
    acceptOffer,
  }
}
