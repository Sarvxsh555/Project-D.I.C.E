export type FulfillmentStatus = 'READY' | 'PARTIAL' | 'BACKORDER' | 'FULFILLED'

export interface WarehouseStock {
  warehouseId: string
  warehouseName: string
  productId: string
  productSku: string
  productName: string
  available: number
  reserved: number
  incoming: number
  backordered: number
}

export interface LineAllocation {
  id: string
  lineId: string
  productName: string
  sku: string
  requestedQty: number
  allocatedQty: number
  warehouseAllocations: Array<{
    warehouseName: string
    quantity: number
  }>
  backorderQty: number
  status: FulfillmentStatus
  expectedShipmentDate: string
}

export interface FulfillmentOrder {
  id: string
  dealId: string
  dealNumber: string
  customerName: string
  status: FulfillmentStatus
  totalItems: number
  allocations: LineAllocation[]
  expectedShipmentDate: string
  lifecycleStep: 'Approved' | 'Fulfillment Created' | 'Allocated' | 'Shipment Planned' | 'Shipped' | 'Delivered'
  trackingNumber?: string
  warehouse?: string
}

export type FulfillmentPlan = FulfillmentOrder

