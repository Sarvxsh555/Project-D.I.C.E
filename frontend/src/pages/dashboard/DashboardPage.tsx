import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { dashboardService, type DashboardSummary, type ActivityItem, type AtRiskDeal } from '../../services/dashboardService'
import { productService } from '../../services/productService'
import { quotationService } from '../../services/quotationService'
import { useAuth } from '../../hooks/useAuth'
import { STAKEHOLDER_DEFINITIONS } from '../../types/auth'
import type { Product, Customer } from '../../types/product'
import type { DealSummary } from '../../types/deal'
import { formatCurrency, formatPercent } from '../../utils/currency'
import {
  Plus,
  ShoppingBag,
  PackagePlus,
  Percent,
  CheckCircle2,
  TrendingUp,
  Tag,
  Layers,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'

// Preset high-quality images for one-click demo product addition
const DEMO_PRESET_IMAGES: { label: string; url: string; category: string }[] = [
  {
    label: 'Sport Sneakers',
    url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
    category: 'Footwear & Shoes',
  },
  {
    label: 'Oxford Shoes',
    url: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&auto=format&fit=crop&q=80',
    category: 'Footwear & Shoes',
  },
  {
    label: 'Robot STEM Toy',
    url: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=600&auto=format&fit=crop&q=80',
    category: 'Toys & Games',
  },
  {
    label: 'Drone Quadcopter',
    url: 'https://images.unsplash.com/photo-1507582020432-2a3bc4ff7ac8?w=600&auto=format&fit=crop&q=80',
    category: 'Toys & Games',
  },
  {
    label: 'Curved 4K Monitor',
    url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80',
    category: 'Consumer Electronics',
  },
  {
    label: 'Studio Headphones',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
    category: 'Consumer Electronics',
  },
  {
    label: 'Thermal Jacket',
    url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80',
    category: 'Apparel & Sportswear',
  },
]

export default function DashboardPage() {
  const { currentUser } = useAuth()
  const currentMeta = STAKEHOLDER_DEFINITIONS[currentUser.role] || STAKEHOLDER_DEFINITIONS.SALES_REP

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [atRiskDeals, setAtRiskDeals] = useState<AtRiskDeal[]>([])
  const [deals, setDeals] = useState<DealSummary[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  // Add Product Modal State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [prodName, setProdName] = useState('')
  const [prodCategory, setProdCategory] = useState('Footwear & Shoes')
  const [prodSku, setProdSku] = useState('')
  const [prodUnitPrice, setProdUnitPrice] = useState(150)
  const [prodCostPrice, setProdCostPrice] = useState(65)
  const [prodTax, setProdTax] = useState(12)
  const [prodImage, setProdImage] = useState('https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80')
  const [prodDesc, setProdDesc] = useState('')
  const [isSubmittingProd, setIsSubmittingProd] = useState(false)

  // Quick Sale Modal State
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false)
  const [saleCustomerId, setSaleCustomerId] = useState('')
  const [saleProductId, setSaleProductId] = useState('')
  const [saleUnits, setSaleUnits] = useState(25)
  const [saleDiscount, setSaleDiscount] = useState(5.5)
  const [isSubmittingSale, setIsSubmittingSale] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [sumRes, actRes, riskRes, prodRes, custRes, dealsRes] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getActivity(),
        dashboardService.getAtRiskDeals(),
        productService.list(),
        productService.listCustomers(),
        quotationService.list(),
      ])
      setSummary(sumRes)
      setActivity(actRes)
      setAtRiskDeals(riskRes)
      setProducts(prodRes)
      setCustomers(custRes)
      setDeals(dealsRes.content)

      if (custRes.length > 0) setSaleCustomerId(custRes[0].id)
      if (prodRes.length > 0) setSaleProductId(prodRes[0].id)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard telemetry')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filtered products
  const filteredProducts = useMemo(() => {
    if (categoryFilter === 'ALL') return products
    return products.filter((p) => p.category === categoryFilter)
  }, [products, categoryFilter])

  // Categories list
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return ['ALL', ...Array.from(set)]
  }, [products])

  // Calculation for quick sale form
  const selectedSaleProduct = useMemo(() => {
    return products.find((p) => p.id === saleProductId) || products[0]
  }, [products, saleProductId])

  const quickSaleCalculations = useMemo(() => {
    if (!selectedSaleProduct) return { subtotal: 0, discountVal: 0, netVal: 0, marginVal: 0, marginPct: 0 }
    const unitPrice = selectedSaleProduct.basePrice || 0
    const costPrice = selectedSaleProduct.costPrice || 0
    const qty = Number(saleUnits) || 1
    const disc = Number(saleDiscount) || 0

    const subtotal = unitPrice * qty
    const discountVal = (subtotal * disc) / 100
    const netVal = subtotal - discountVal
    const totalCost = costPrice * qty
    const profit = netVal - totalCost
    const marginPct = netVal > 0 ? (profit / netVal) * 100 : 0

    return { subtotal, discountVal, netVal, profit, marginPct }
  }, [selectedSaleProduct, saleUnits, saleDiscount])

  // Handle Add Product Submit
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingProd(true)
    try {
      const generatedSku = prodSku.trim() || `SKU-${Date.now().toString().slice(-5)}`
      const newP = await productService.create({
        name: prodName.trim() || 'New Catalog Item',
        category: prodCategory,
        sku: generatedSku,
        basePrice: Number(prodUnitPrice),
        costPrice: Number(prodCostPrice),
        taxPercent: Number(prodTax),
        imageUrl: prodImage,
        description: prodDesc.trim() || `${prodCategory} item added directly from operations dashboard.`,
        billingType: 'ONE_TIME',
        status: 'ACTIVE',
      })
      setProducts((prev) => [newP, ...prev])
      setIsAddProductOpen(false)
      setNotification(`Product "${newP.name}" successfully added to the catalog!`)
      setTimeout(() => setNotification(null), 4000)
      // Reset form
      setProdName('')
      setProdSku('')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create product')
    } finally {
      setIsSubmittingProd(false)
    }
  }

  // Handle Quick Sale Submit
  const handleQuickSale = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingSale(true)
    try {
      const created = await quotationService.create({
        customerId: saleCustomerId,
        currency: 'USD',
        lines: [
          {
            productId: saleProductId,
            quantity: Number(saleUnits),
            discountPercent: Number(saleDiscount),
            unitPrice: selectedSaleProduct ? selectedSaleProduct.basePrice : 100,
          },
        ],
      })
      setNotification(`Sale recorded successfully! Quotation ${created.dealNumber} created with ${saleUnits} units @ ${saleDiscount}% discount.`)
      setTimeout(() => setNotification(null), 5000)
      setIsQuickSaleOpen(false)
      // Refresh pipeline
      const freshDeals = await quotationService.list()
      setDeals(freshDeals.content)
      const freshSum = await dashboardService.getSummary()
      setSummary(freshSum)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to record sale')
    } finally {
      setIsSubmittingSale(false)
    }
  }

  // Pre-fill quick sale from card click
  const openQuickSaleForProduct = (prod: Product) => {
    setSaleProductId(prod.id)
    setSaleUnits(20)
    setSaleDiscount(5.5) // Default 5.5% compliant discount benchmark
    setIsQuickSaleOpen(true)
  }

  if (loading) {
    return <LoadingState message="Loading sales operations and commercial catalog dashboard..." rows={6} />
  }

  if (error || !summary) {
    return (
      <ErrorState
        title="Dashboard Telemetry Offline"
        message={error || 'Unable to connect to sales governance stream.'}
        onRetry={fetchData}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg p-3.5 flex items-center gap-3 shadow-xs animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs font-medium">{notification}</span>
        </div>
      )}

      {/* PAGE HEADER & DUAL CALL-TO-ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Commercial Operations Dashboard
            </h1>
            <Badge variant={currentMeta.badgeVariant} size="sm">
              {currentMeta.title}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time pipeline governance, multi-category inventory (Shoes, Toys, Electronics), 5–6% discount governance, and instant sales creation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Action 1: Add Product */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddProductOpen(true)}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-md cursor-pointer"
          >
            <PackagePlus className="w-4 h-4 text-emerald-600" />
            <span>Add Product</span>
          </Button>

          {/* Action 2: Quick Sale */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsQuickSaleOpen(true)}
            className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-md cursor-pointer font-medium"
          >
            <ShoppingBag className="w-4 h-4 text-indigo-600" />
            <span>Create Sale</span>
          </Button>

          {/* Action 3: New Full Quotation */}
          <Link to="/quotations?action=new">
            <Button
              variant="primary"
              size="sm"
              className="bg-[#714B67] hover:bg-[#5e3d55] text-white text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer py-1.5 px-3 rounded-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Full Proposal</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              Total Deals & Orders
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
            {summary.totalDeals}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Pipeline: {formatCurrency(summary.openPipelineValue)}
          </div>
        </div>

        <div className="bg-white border border-emerald-200/80 rounded-lg p-4 shadow-2xs hover:shadow-xs transition-shadow bg-gradient-to-b from-emerald-50/20 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-800">
              5–6% Benchmark Compliance
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-2 tracking-tight">
            96.4%
          </div>
          <div className="text-[11px] text-emerald-700 mt-1">
            3-4 active sales within target margin
          </div>
        </div>

        <div className="bg-white border border-amber-200/80 rounded-lg p-4 shadow-2xs hover:shadow-xs transition-shadow bg-gradient-to-b from-amber-50/20 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-800">
              Pending Approvals
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-2 tracking-tight">
            {summary.pendingApprovals}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            DICE automated risk tier routing
          </div>
        </div>

        <div className="bg-white border border-[#714B67]/20 rounded-lg p-4 shadow-2xs hover:shadow-xs transition-shadow bg-gradient-to-b from-[#FAF5F9]/30 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#714B67]">
              Active Catalog Items
            </span>
            <Layers className="w-4 h-4 text-[#714B67]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#714B67] mt-2 tracking-tight">
            {products.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Shoes, Toys, Electronics, Apparel
          </div>
        </div>
      </div>

      {/* SECTION: MULTI-CATEGORY PRODUCT CATALOG & QUICK-SELL HUB */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Commercial Catalog & Quick-Sell Hub
              </h2>
              <Badge variant="neutral" size="sm">
                {filteredProducts.length} Items Available
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sell everything: Shoes, Toys, Gadgets, Apparel, and Services with customized images and instant 5–6% discount governance.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {uniqueCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                  categoryFilter === cat
                    ? 'bg-[#714B67] text-white border-[#714B67] shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat === 'ALL' ? 'All Products' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid with Customized Images */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((p) => {
            const margin = p.basePrice > 0 ? Math.round(((p.basePrice - p.costPrice) / p.basePrice) * 100) : 0
            return (
              <div
                key={p.id}
                className="group border border-slate-200 rounded-lg overflow-hidden bg-white hover:border-[#714B67]/60 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Customized Image Display */}
                  <div className="h-36 w-full bg-slate-100 overflow-hidden relative">
                    <img
                      src={p.imageUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80'}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-white/90 backdrop-blur-xs text-slate-700 shadow-2xs">
                      {p.category}
                    </span>
                  </div>

                  <div className="p-3.5 space-y-1.5">
                    <div className="text-[10px] font-mono text-slate-400">{p.sku}</div>
                    <h3 className="font-semibold text-xs text-slate-900 line-clamp-1 group-hover:text-[#714B67]">
                      {p.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {p.description || 'Enterprise grade catalog product ready for commercial quotation.'}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 pt-0 border-t border-slate-100 mt-2">
                  <div className="flex items-center justify-between text-xs py-1.5">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">List Price</span>
                      <span className="font-bold text-slate-900 font-mono text-sm">
                        {formatCurrency(p.basePrice)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Margin</span>
                      <span className="font-semibold text-emerald-600 font-mono text-xs">
                        +{margin}%
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openQuickSaleForProduct(p)}
                    className="w-full mt-2 text-xs py-1.5 bg-slate-50 hover:bg-[#714B67] hover:text-white hover:border-[#714B67] transition-colors border-slate-200 text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer rounded-md font-medium"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Quick Sell Product</span>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* SECTION: 3-4 COMMERCIAL SALES PIPELINE (5-6% GOVERNANCE BENCHMARK) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span>Confirmed Sales Pipeline</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 font-medium">
                5–6% Discount Target
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Commercial contracts confirmed under DICE automated discount limits
            </p>
          </div>
          <Link
            to="/quotations"
            className="text-xs text-[#714B67] font-semibold hover:underline flex items-center gap-1"
          >
            <span>View All Quotes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead align="right" className="w-32">Total Value</TableHead>
              <TableHead align="right" className="w-28">Margin %</TableHead>
              <TableHead align="right" className="w-24">Risk Score</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-32">Sales Owner</TableHead>
              <TableHead align="right" className="w-24">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.slice(0, 4).map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <Link
                    to={`/quotations?id=${d.id}`}
                    className="font-mono font-bold text-[#714B67] hover:underline"
                  >
                    {d.dealNumber}
                  </Link>
                </TableCell>
                <TableCell className="font-semibold text-slate-900">
                  {d.customerName}
                </TableCell>
                <TableCell align="right" className="font-mono font-bold text-slate-900">
                  {formatCurrency(d.totalAmount)}
                </TableCell>
                <TableCell align="right">
                  <span className="font-mono text-emerald-700 font-semibold">
                    {formatPercent(d.marginPercent)}
                  </span>
                </TableCell>
                <TableCell align="right">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {d.riskScore}/100
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={d.status === 'CONFIRMED' || d.status === 'APPROVED' ? 'success' : 'warning'} size="sm">
                    {d.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-600 text-xs">
                  {d.owner || 'Arun Rep'}
                </TableCell>
                <TableCell align="right">
                  <Link to={`/quotations?id=${d.id}`}>
                    <Button variant="outline" size="sm" className="text-xs py-1 px-2.5">
                      Open
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* SECTION: AUDITED DEAL ACTIVITY STREAM */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Real-time DICE Telemetry & Audits
            </h2>
            <p className="text-[11px] text-slate-400">Policy evaluations, approval routing events, and threshold validations</p>
          </div>
          <span className="text-xs font-mono text-slate-400">Live feed</span>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
          {activity.length === 0 ? (
            <EmptyState title="No activity yet" description="Audited events will appear here as deals move through the pipeline." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Timestamp</TableHead>
                  <TableHead className="w-32">Deal #</TableHead>
                  <TableHead className="w-36">Event Type</TableHead>
                  <TableHead className="w-32">Actor</TableHead>
                  <TableHead>Event Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.slice(0, 5).map((act) => (
                  <TableRow key={act.id}>
                    <TableCell className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <Link to={`/quotations?id=${act.dealId}`} className="font-mono font-semibold text-[#714B67] hover:underline">
                        {act.dealNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral" size="sm">
                        {act.eventType.replaceAll('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-800">
                      {act.actor}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {act.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* MODAL 1: ADD NEW PRODUCT DIRECTLY TO DASHBOARD CATALOG */}
      {/* =================================================================== */}
      {isAddProductOpen && (
        <Modal
          isOpen={isAddProductOpen}
          onClose={() => setIsAddProductOpen(false)}
          title="Add New Commercial Product to Dashboard"
        >
          <form onSubmit={handleAddProduct} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Product Name:</label>
              <input
                type="text"
                required
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="e.g. Pro Velocity Trail Shoes, STEM Solar Rover, 4K Drone"
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-[#714B67] focus:border-[#714B67]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category:</label>
                <select
                  value={prodCategory}
                  onChange={(e) => setProdCategory(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                >
                  <option value="Footwear & Shoes">Footwear & Shoes</option>
                  <option value="Toys & Games">Toys & Games</option>
                  <option value="Consumer Electronics">Consumer Electronics</option>
                  <option value="Enterprise Hardware">Enterprise Hardware</option>
                  <option value="Apparel & Sportswear">Apparel & Sportswear</option>
                  <option value="Service">Services & Subscriptions</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">SKU (Auto or Custom):</label>
                <input
                  type="text"
                  value={prodSku}
                  onChange={(e) => setProdSku(e.target.value)}
                  placeholder="e.g. SHOE-PRO-99"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unit List Price ($):</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={prodUnitPrice}
                  onChange={(e) => setProdUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unit Cost Price ($):</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={prodCostPrice}
                  onChange={(e) => setProdCostPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tax Percent (%):</label>
                <input
                  type="number"
                  min={0}
                  max={28}
                  value={prodTax}
                  onChange={(e) => setProdTax(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono"
                />
              </div>
            </div>

            {/* Customized Image URL + Quick Preset Click */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Product Image URL:</label>
              <input
                type="url"
                required
                value={prodImage}
                onChange={(e) => setProdImage(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono"
              />

              <div className="mt-2">
                <span className="text-[10px] text-slate-500 font-semibold block mb-1">Or Pick a Quick Preset:</span>
                <div className="flex flex-wrap gap-1.5">
                  {DEMO_PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setProdImage(preset.url)
                        setProdCategory(preset.category)
                        if (!prodName) setProdName(preset.label)
                      }}
                      className="px-2 py-0.5 border border-slate-200 rounded text-[11px] bg-slate-50 hover:bg-slate-100 cursor-pointer text-slate-700"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Description:</label>
              <textarea
                rows={2}
                value={prodDesc}
                onChange={(e) => setProdDesc(e.target.value)}
                placeholder="Key technical attributes, specifications, and warranty details..."
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddProductOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmittingProd}
                className="bg-[#714B67] hover:bg-[#5e3d55] text-white"
              >
                {isSubmittingProd ? 'Saving to Catalog...' : 'Publish Product to Dashboard'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: QUICK SALE & QUOTATION CREATOR WITH 5-6% GOVERNANCE */}
      {/* =================================================================== */}
      {isQuickSaleOpen && (
        <Modal
          isOpen={isQuickSaleOpen}
          onClose={() => setIsQuickSaleOpen(false)}
          title="Create Sale & Quotation (5–6% Governance Benchmark)"
        >
          <form onSubmit={handleQuickSale} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Client Account:</label>
              <select
                value={saleCustomerId}
                onChange={(e) => setSaleCustomerId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.segment}) - Credit: {formatCurrency(c.creditLimit)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Product to Sell:</label>
              <select
                value={saleProductId}
                onChange={(e) => setSaleProductId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.category}] {p.name} — {formatCurrency(p.basePrice)} (Cost: {formatCurrency(p.costPrice)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Units (Quantity):</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={saleUnits}
                  onChange={(e) => setSaleUnits(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Commercial Discount %:</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  required
                  value={saleDiscount}
                  onChange={(e) => setSaleDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* LIVE DICE GOVERNANCE INDICATOR (5-6% Benchmark) */}
            <div className={`p-3 rounded-lg border text-xs space-y-1 ${
              saleDiscount <= 6.0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : saleDiscount <= 12.0
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {saleDiscount <= 6.0 ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>DICE Status: Auto-Approved (Target 5–6% Benchmark)</span>
                  </>
                ) : saleDiscount <= 12.0 ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>DICE Status: Sales Manager Approval Triggered (&gt;6%)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>DICE Status: High Risk — Finance & VP Signoff Required (&gt;12%)</span>
                  </>
                )}
              </div>
              <p className="text-[11px] opacity-90">
                {saleDiscount <= 6.0
                  ? 'This discount is fully within commercial policy. No manual escalation required.'
                  : 'Escalation will be dispatched sequentially through the approval engine.'}
              </p>
            </div>

            {/* LIVE FINANCIAL CALCULATION PREVIEW */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Gross Subtotal ({saleUnits} units):</span>
                <span>{formatCurrency(quickSaleCalculations.subtotal)}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Discount ({saleDiscount}%):</span>
                <span>-{formatCurrency(quickSaleCalculations.discountVal)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1.5">
                <span>Net Invoice Amount:</span>
                <span className="text-[#714B67] text-sm">{formatCurrency(quickSaleCalculations.netVal)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold pt-0.5">
                <span>Estimated Net Profit & Margin:</span>
                <span>{formatCurrency(quickSaleCalculations.profit)} ({quickSaleCalculations.marginPct.toFixed(1)}%)</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsQuickSaleOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmittingSale}
                className="bg-[#714B67] hover:bg-[#5e3d55] text-white font-medium"
              >
                {isSubmittingSale ? 'Processing Sale...' : 'Confirm Sale & Generate Order'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
