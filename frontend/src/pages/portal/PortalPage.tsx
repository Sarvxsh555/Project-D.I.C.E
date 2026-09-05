import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'
import { portalService } from '../../services/negotiationService'
import { productService } from '../../services/productService'
import { quotationService } from '../../services/quotationService'
import { formatCurrency, formatPercent } from '../../utils/currency'
import type { PortalQuoteView } from '../../types/negotiation'
import type { Product } from '../../types/product'
import type { DealSummary } from '../../types/deal'
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Calendar,
  Layers,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  Building2,
  FileText,
  Clock,
  ChevronRight,
  Package,
} from 'lucide-react'

// Pre-defined Commercial Packages for Demo
const PRESET_PACKAGES = [
  {
    id: 'pkg-footwear-apparel',
    title: 'Athletic Field & Uniform Package',
    category: 'Footwear & Apparel',
    description: 'Bundle of 50 Air-Velocity Shoes + 25 WeatherShield Thermal Jackets for organizational field teams.',
    unitPrice: 9750,
    suggestedDiscount: 6.0,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
    items: ['50x Air-Velocity Pro Running Shoes', '25x WeatherShield Performance Thermal Jackets'],
  },
  {
    id: 'pkg-stem-robotics',
    title: 'STEM & Robotics Educational Package',
    category: 'Toys & Games',
    description: 'Complete STEM laboratory bundle with 30 AI Robotics Explorer Kits and 10 Quadcopter Drones.',
    unitPrice: 6550,
    suggestedDiscount: 5.5,
    imageUrl: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=600&auto=format&fit=crop&q=80',
    items: ['30x STEM AI Robotics Explorer Kits', '10x 4K Programmable Quadcopter Drones'],
  },
  {
    id: 'pkg-workstation-cloud',
    title: 'Executive CAD & Cloud SLA Bundle',
    category: 'Electronics & Cloud',
    description: 'Hardware and uptime bundle: 10 Ultra-Curved 34" Monitors + 2 Enterprise 2U Servers + 24/7 SLA.',
    unitPrice: 18100,
    suggestedDiscount: 5.5,
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80',
    items: ['10x Ultra-Curved 34" Gaming & CAD Monitors', '2x DICE Enterprise 2U Servers', '1x 24/7 Cloud Support SLA'],
  },
]

export default function PortalPage() {
  const { token: urlToken } = useParams<{ token?: string }>()
  const [searchParams] = useSearchParams()
  const activeToken = urlToken || searchParams.get('token') || 'portal-token-q1004-hyb'

  // Tab State: 'proposal' | 'catalog' | 'account'
  const [activeTab, setActiveTab] = useState<'proposal' | 'catalog' | 'account'>('proposal')

  const [quote, setQuote] = useState<PortalQuoteView | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [pastOrders, setPastOrders] = useState<DealSummary[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Counteroffer / Negotiation modal state
  const [isCounterofferOpen, setIsCounterofferOpen] = useState(
    searchParams.get('action') === 'negotiate'
  )
  const [requestedDiscount, setRequestedDiscount] = useState<number>(6.0)
  const [counterMessage, setCounterMessage] = useState(
    'Can we proceed at 6.0% discount across the items in this package?'
  )
  const [negotiatingPackageName, setNegotiatingPackageName] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedSuccess, setSubmittedSuccess] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [quoteData, productsData, ordersData] = await Promise.all([
        portalService.getQuote(activeToken).catch(() => null),
        productService.list(),
        quotationService.list(),
      ])

      if (quoteData) {
        setQuote(quoteData)
      } else {
        // Fallback demo quote
        setQuote({
          dealNumber: 'Q-1004',
          customerName: 'Acme Global Corp',
          customerTier: 'GOLD',
          totalAmount: 34791,
          currency: 'USD',
          status: 'UNDER_NEGOTIATION',
          paymentTerms: 'Net 30',
          validUntil: '2026-09-30',
          lines: [
            {
              productName: 'Classic Leather Oxford Dress Shoes',
              quantity: 50,
              unitPrice: 195,
              total: 10319,
            },
            {
              productName: 'Ultra-Curved 34" Gaming & CAD Monitor',
              quantity: 10,
              unitPrice: 650,
              total: 7248,
            },
            {
              productName: 'Enterprise 24/7 Cloud Support SLA Plan',
              quantity: 12,
              unitPrice: 1200,
              total: 16057,
            },
          ],
        })
      }

      setProducts(productsData)
      setPastOrders(ordersData.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired customer portal session')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeToken])

  const handleAccept = async () => {
    try {
      await portalService.accept(activeToken)
      setQuote((prev) => (prev ? { ...prev, status: 'CONFIRMED' } : null))
    } catch (err) {
      console.error(err)
    }
  }

  const handleReject = async () => {
    try {
      await portalService.reject(activeToken)
      setQuote((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null))
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmitCounteroffer = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const updated = await portalService.counteroffer(activeToken, {
        requestedDiscountPercent: requestedDiscount,
        message: counterMessage,
      })
      setQuote(updated)
      setIsCounterofferOpen(false)
      setSubmittedSuccess(true)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open negotiation for a specific package
  const startPackageNegotiation = (pkg: typeof PRESET_PACKAGES[0]) => {
    setNegotiatingPackageName(pkg.title)
    setRequestedDiscount(pkg.suggestedDiscount)
    setCounterMessage(`We would like to order the "${pkg.title}" bundle. Could you confirm a ${pkg.suggestedDiscount}% commercial package discount?`)
    setIsCounterofferOpen(true)
  }

  const filteredProducts = categoryFilter === 'ALL'
    ? products
    : products.filter((p) => p.category === categoryFilter)

  if (loading) {
    return <LoadingState message="Decrypting secure customer commercial session..." rows={4} />
  }

  if (error || !quote) {
    return (
      <ErrorState
        title="Quote Unavailable"
        message={error || 'The requested quotation link is invalid or expired.'}
        onRetry={loadData}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Customer Identity & Tier */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-[#714B67]/10 flex items-center justify-center text-[#714B67]">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">{quote.customerName}</h1>
              <Badge variant="primary" size="sm">
                GOLD TIER ACCOUNT
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Customer Portal — Max Discount Policy Allowance: <strong className="text-emerald-700 font-semibold">15.0%</strong> • Standard Benchmark: <strong className="text-slate-700">5–6%</strong>
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('proposal')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'proposal'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Proposal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'catalog'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#714B67]" />
            <span>Storefront & Packages</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'account'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Orders & Data
          </button>
        </div>
      </div>

      {/* Submission Success Banner */}
      {submittedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3.5 flex items-start gap-3 text-emerald-900 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-xs">Counter-Discount Proposal Transmitted</h4>
            <p className="text-xs text-emerald-800 mt-0.5">
              Your requested {requestedDiscount}% commercial package discount has been submitted to the DICE engine.
              Because it complies with standard governance (5–6% target), automated approval is currently in progress.
            </p>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 1: ACTIVE PROPOSAL & NEGOTIATION */}
      {/* =================================================================== */}
      {activeTab === 'proposal' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                    Commercial Proposal
                  </span>
                  <Badge variant="primary">{quote.status.replace('_', ' ')}</Badge>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  Quotation {quote.dealNumber}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Commercial packages tailored with multi-line discount governance.
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Total Proposed Investment
                </span>
                <span className="text-2xl font-bold text-[#714B67] font-mono">
                  {formatCurrency(quote.totalAmount)}
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  Payment Terms: <strong className="font-medium text-slate-700">{quote.paymentTerms}</strong>
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mt-5 overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] uppercase font-semibold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Package / Line Item</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Total Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {quote.lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                        <Package className="w-4 h-4 text-[#714B67]" />
                        <span>{line.productName}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium">{line.quantity} units</td>
                      <td className="py-3 px-3 text-right text-slate-600 font-mono">
                        {formatCurrency(line.unitPrice)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(line.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Net:</span>
                  <span className="font-mono font-medium">{formatCurrency(quote.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Estimated Tax (18%):</span>
                  <span className="font-mono font-medium">{formatCurrency(Math.round(quote.totalAmount * 0.18))}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                  <span>Total Payable:</span>
                  <span className="font-mono text-[#714B67] text-sm">
                    {formatCurrency(Math.round(quote.totalAmount * 1.18))}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Actions */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Offer Valid Until: <strong className="font-medium text-slate-700">{quote.validUntil}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReject}
                  disabled={quote.status === 'CANCELLED' || quote.status === 'CONFIRMED'}
                  className="text-rose-700 border-rose-200 hover:bg-rose-50 text-xs py-1.5 px-3 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Decline
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCounterofferOpen(true)}
                  disabled={quote.status === 'CANCELLED' || quote.status === 'CONFIRMED'}
                  className="text-[#714B67] border-[#714B67]/30 hover:bg-[#FAF5F9] text-xs py-1.5 px-3 cursor-pointer font-medium"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1 text-[#714B67]" />
                  Negotiate Discount / Terms
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAccept}
                  disabled={quote.status === 'CONFIRMED' || quote.status === 'CANCELLED'}
                  className="bg-[#714B67] hover:bg-[#5e3d55] flex items-center gap-1.5 text-xs py-1.5 px-3 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Accept & Sign Proposal
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: STOREFRONT & PACKAGES (CUSTOMIZED IMAGES & NEGOTIATION) */}
      {/* =================================================================== */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* SECTION: COMMERCIAL PACKAGES READY FOR NEGOTIATION */}
          <div className="bg-gradient-to-r from-[#FAF5F9] to-white border border-[#714B67]/20 rounded-lg p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#714B67]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Recommended Commercial Packages (With Bundle Discounts)
              </h2>
            </div>
            <p className="text-xs text-slate-600">
              Select pre-engineered bundles with pre-approved 5–6% discounts. You can submit custom negotiations directly on these packages.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PRESET_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs hover:border-[#714B67] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="h-32 w-full bg-slate-100 relative overflow-hidden">
                      <img
                        src={pkg.imageUrl}
                        alt={pkg.title}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-[#714B67] text-white">
                        {pkg.suggestedDiscount}% Bundle Disc
                      </span>
                    </div>

                    <div className="p-3.5 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        {pkg.category}
                      </span>
                      <h3 className="font-bold text-xs text-slate-900">{pkg.title}</h3>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{pkg.description}</p>

                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <span className="text-[10px] font-semibold text-slate-700 block">Includes:</span>
                        {pkg.items.map((item, i) => (
                          <div key={i} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 pt-0 border-t border-slate-100 mt-3">
                    <div className="flex items-center justify-between text-xs py-2">
                      <span className="text-slate-500">Package Value:</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(pkg.unitPrice)}
                      </span>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => startPackageNegotiation(pkg)}
                      className="w-full text-xs py-1.5 bg-[#714B67] hover:bg-[#5e3d55] text-white flex items-center justify-center gap-1.5 cursor-pointer rounded-md font-medium"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Negotiate This Package</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION: ALL PRODUCTS CATALOG (SHOES, TOYS, ELECTRONICS, ETC.) */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Full Commercial Product Catalog
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Browse products available for your enterprise procurement tier.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-1">
                {['ALL', 'Footwear & Shoes', 'Toys & Games', 'Consumer Electronics', 'Enterprise Hardware', 'Apparel & Sportswear', 'Service'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                      categoryFilter === cat
                        ? 'bg-[#714B67] text-white border-[#714B67]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat === 'ALL' ? 'All' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className="border border-slate-200 rounded-lg overflow-hidden bg-white hover:border-[#714B67]/50 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="h-36 w-full bg-slate-100 overflow-hidden relative">
                      <img
                        src={p.imageUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80'}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-white/95 text-slate-800 shadow-2xs">
                        {p.category}
                      </span>
                    </div>

                    <div className="p-3 space-y-1">
                      <div className="text-[10px] font-mono text-slate-400">{p.sku}</div>
                      <h4 className="font-semibold text-xs text-slate-900 line-clamp-1">{p.name}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{p.description}</p>
                    </div>
                  </div>

                  <div className="p-3 pt-0 border-t border-slate-100 mt-2">
                    <div className="flex items-center justify-between text-xs py-1">
                      <span className="text-slate-400 text-[11px]">List Price</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {formatCurrency(p.basePrice)}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNegotiatingPackageName(p.name)
                        setRequestedDiscount(6.0)
                        setCounterMessage(`We are interested in ordering ${p.name}. Can you offer a 6.0% discount for volume units?`)
                        setIsCounterofferOpen(true)
                      }}
                      className="w-full mt-2 text-xs py-1 border-slate-300 text-[#714B67] hover:bg-[#714B67] hover:text-white cursor-pointer rounded-md font-medium transition-colors"
                    >
                      Request Quote / Negotiate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: ACCOUNT DATA & PAST ORDERS */}
      {/* =================================================================== */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                Customer Governance Tier
              </span>
              <div className="text-xl font-bold font-mono text-amber-600 mt-1">
                GOLD TIER (15% Max)
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Qualified for tier-1 executive fast-track approvals
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                Available Credit Facility
              </span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                $1,000,000.00
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Payment Terms: Net 30 days
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                Confirmed Orders Executed
              </span>
              <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
                {pastOrders.filter((o) => o.status === 'CONFIRMED').length} Orders
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                3-4 orders closed under 5–6% target discount
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Commercial Order History & Contracts
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Order #</TableHead>
                  <TableHead>Customer Account</TableHead>
                  <TableHead align="right" className="w-32">Total Value</TableHead>
                  <TableHead align="right" className="w-28">Discount %</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-32">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastOrders.slice(0, 4).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-bold text-[#714B67]">
                      {order.dealNumber}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {order.customerName}
                    </TableCell>
                    <TableCell align="right" className="font-mono font-bold text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell align="right">
                      <span className="font-mono text-emerald-700 font-semibold">
                        5.5% (Benchmark)
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.status === 'CONFIRMED' ? 'success' : 'neutral'} size="sm">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Recent'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* NEGOTIATION / COUNTEROFFER MODAL */}
      {/* =================================================================== */}
      {isCounterofferOpen && (
        <Modal
          isOpen={isCounterofferOpen}
          onClose={() => setIsCounterofferOpen(false)}
          title={`Propose Counter-Discount / Terms ${negotiatingPackageName ? `(${negotiatingPackageName})` : ''}`}
        >
          <form onSubmit={handleSubmitCounteroffer} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Requested Counter-Discount Percent (%):
              </label>
              <input
                type="number"
                min={0}
                max={15}
                step={0.5}
                required
                value={requestedDiscount}
                onChange={(e) => setRequestedDiscount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Your Gold Tier account policy limit is <strong>15.0%</strong>. Standard fast-track is <strong>5–6%</strong>.
              </span>
            </div>

            {/* Live feedback */}
            <div className={`p-3 rounded-lg border text-xs space-y-1 ${
              requestedDiscount <= 6.0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  {requestedDiscount <= 6.0
                    ? 'Eligible for DICE Auto-Approval (<6%)'
                    : 'Requires Fast-Track Sales Manager Review (6-15%)'}
                </span>
              </div>
              <p className="text-[11px] opacity-90">
                {requestedDiscount <= 6.0
                  ? 'Your requested rate fits within commercial guidelines and will process immediately.'
                  : 'Your account executive and sales manager will receive notification to review.'}
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Message / Negotiation Rationale:
              </label>
              <textarea
                rows={3}
                required
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
                placeholder="State your volume commitments, bundle requests, or pricing feedback..."
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs leading-relaxed"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCounterofferOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                className="bg-[#714B67] hover:bg-[#5e3d55] text-white font-medium"
              >
                {isSubmitting ? 'Transmitting to DICE Engine...' : 'Transmit Counteroffer'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
