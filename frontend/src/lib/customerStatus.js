export const QUOTATION_STATUS_LABEL = {
  DRAFT: 'Sent',
  PENDING_APPROVAL: 'Being reviewed',
  NEGOTIATION: 'Negotiation in progress',
  APPROVED: 'Ready for confirmation',
  ORDERED: 'Order placed',
  FULFILLMENT: 'Being fulfilled',
  COMPLETED: 'Completed',
};

export const QUOTATION_STATUS_TONE = {
  DRAFT: 'blue',
  PENDING_APPROVAL: 'amber',
  NEGOTIATION: 'amber',
  APPROVED: 'green',
  ORDERED: 'green',
  FULFILLMENT: 'blue',
  COMPLETED: 'green',
};

export function quotationStatusLabel(stage) {
  return QUOTATION_STATUS_LABEL[stage] || stage;
}

export const ORDER_STATUS_LABEL = {
  CONFIRMED: 'Order Placed',
  FULFILLING: 'Preparing Order',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const ORDER_STATUS_TONE = {
  CONFIRMED: 'blue',
  FULFILLING: 'amber',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

export function orderStatusLabel(status) {
  return ORDER_STATUS_LABEL[status] || status;
}

export const FULFILLMENT_STAGE_LABEL = {
  PROPOSED: 'Preparing',
  CONFIRMED: 'Allocated',
};

export function fulfillmentStageLabel(status) {
  return FULFILLMENT_STAGE_LABEL[status] || status;
}

/** Quotations that need the customer to look at them right now. */
export function needsCustomerAction(quote) {
  return ['NEGOTIATION', 'APPROVED'].includes(quote.stage) && !quote.customerAccepted;
}
