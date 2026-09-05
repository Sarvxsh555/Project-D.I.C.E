import { api } from './api'

// TODO: negotiation preview/accept live on backend NegotiationController;
// confirm whether the customer portal should call these directly or through
// a dedicated portal-scoped endpoint before wiring this up.
export const portalService = {
  previewCounterOffer: (dealId: string, discountPercent: number) =>
    api.post(`/negotiations/${dealId}/preview`, { discountPercent }),
}
