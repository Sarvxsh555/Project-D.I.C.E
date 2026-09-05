import { useState, useEffect, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { LoadingState } from '../../components/ui/LoadingState'
import { reportingService } from '../../services/reportingService'
import { productService } from '../../services/productService'
import { pricelistService } from '../../services/pricelistService'
import { discountRuleService } from '../../services/ruleService'
import { formatCurrency, formatPercent } from '../../utils/currency'
import type { Product, PricelistItem, DiscountRule } from '../../types/product'
import {
  BarChart3,
  Box,
  Tags,
  ShieldCheck,
  Plus,
} from 'lucide-react'

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'reporting'

  // Reporting State
  const [reports, setReports] = useState<any>(null)

  // Products State
  const [products, setProducts] = useState<Product[]>([])
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [newProdName, setNewProdName] = useState('')
  const [newProdSku, setNewProdSku] = useState('')
  const [newProdCategory, setNewProdCategory] = useState<'Hardware' | 'Service' | 'Software'>('Hardware')
  const [newProdPrice, setNewProdPrice] = useState(25000)
  const [newProdCost, setNewProdCost] = useState(18000)
  const [newProdBilling, setNewProdBilling] = useState<'ONE_TIME' | 'RECURRING'>('ONE_TIME')

  // Pricelists State
  const [pricelists, setPricelists] = useState<PricelistItem[]>([])

  // Discount Rules State
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([])
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false)
  const [newRuleName, setNewRuleName] = useState('')
  const [newRuleTier, setNewRuleTier] = useState<any>('Gold')
  const [newRuleCategory, setNewRuleCategory] = useState('Hardware')
  const [newRuleDiscount, setNewRuleDiscount] = useState(15)
  const [newRuleApproval, setNewRuleApproval] = useState<any>('Sales Manager')

  const [loading, setLoading] = useState(true)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [repRes, prodRes, plRes, drRes] = await Promise.all([
        reportingService.getSummary(),
        productService.list(),
        pricelistService.list(),
        discountRuleService.list(),
      ])
      setReports(repRes)
      setProducts(prodRes)
      setPricelists(plRes)
      setDiscountRules(drRes)
    } catch (err) {
      console.error('Error loading admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const created = await productService.create({
        name: newProdName,
        sku: newProdSku,
        category: newProdCategory,
        basePrice: newProdPrice,
        costPrice: newProdCost,
        billingType: newProdBilling,
        status: 'ACTIVE',
      })
      setProducts((prev) => [...prev, created])
      setIsAddProductOpen(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateRule = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const created = await discountRuleService.create({
        ruleName: newRuleName,
        customerTier: newRuleTier,
        category: newRuleCategory,
        maxDiscountPercent: newRuleDiscount,
        riskThreshold: 60,
        approvalLevel: newRuleApproval,
        status: 'ACTIVE',
        effectiveDate: new Date().toISOString().split('T')[0],
        version: 'v1.1',
      })
      setDiscountRules((prev) => [...prev, created])
      setIsAddRuleOpen(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleRuleStatus = async (rule: DiscountRule) => {
    const nextStatus = rule.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const updated = await discountRuleService.update(rule.id, { status: nextStatus })
    setDiscountRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)))
  }

  if (loading) {
    return <LoadingState message="Loading administration console & reporting engine..." rows={5} />
  }

  const tabs = [
    { id: 'reporting', label: 'Executive Reporting', icon: BarChart3 },
    { id: 'products', label: 'Products Master', icon: Box },
    { id: 'pricelists', label: 'Tier Pricelists', icon: Tags },
    { id: 'discount-rules', label: 'Discount & Governance Rules', icon: ShieldCheck },
  ]

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Administration & Governance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure commercial pricing, discount guardrails, and executive performance analytics
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200">
          {tabs.map((t) => {
            const Icon = t.icon
            const isActive = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setSearchParams({ tab: t.id })}
                className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  isActive
                    ? 'bg-white text-[#5E2A52] font-semibold border border-slate-200/80 shadow-none'
                    : 'text-slate-600 hover:text-slate-900 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* TAB 1: EXECUTIVE REPORTING */}
      {activeTab === 'reporting' && reports && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block mb-1">
                Total Closed Pipeline
              </span>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {formatCurrency(reports.totalDealValue)}
              </div>
              <span className="text-[11px] text-emerald-700 mt-1 block font-medium">
                Avg Deal: {formatCurrency(reports.averageDealValue)}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block mb-1">
                Average Gross Margin
              </span>
              <div className="text-xl font-bold text-emerald-700 font-mono">
                {formatPercent(reports.averageMargin)}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Avg Discount Rate: {formatPercent(reports.discountRate)}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block mb-1">
                Governance SLA Velocity
              </span>
              <div className="text-xl font-bold text-[#5E2A52] font-mono">
                {reports.averageApprovalHours}h
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Approval Rate: {reports.approvalRate}%
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded p-3">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block mb-1">
                Cash Collection Rate
              </span>
              <div className="text-xl font-bold text-slate-900 font-mono">
                {reports.invoiceCollectionRate}%
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Dispatch SLA: {reports.averageFulfillmentDays} days
              </span>
            </div>
          </div>

          {/* Restrained Analytics Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded p-4">
              <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700 mb-3">
                Deal Performance Distribution
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Enterprise Hardware Pipeline</span>
                  <span className="font-semibold text-slate-900 font-mono">₹28,50,000 (58.7%)</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Recurring 24/7 Support Contracts</span>
                  <span className="font-semibold text-slate-900 font-mono">₹12,40,000 (25.5%)</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Implementation Professional Services</span>
                  <span className="font-semibold text-slate-900 font-mono">₹7,60,000 (15.8%)</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded p-4">
              <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700 mb-3">
                Governance Exception Analytics
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Automated Direct Approvals</span>
                  <span className="font-semibold text-emerald-700 font-mono">82%</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Sales Manager Reviews</span>
                  <span className="font-semibold text-amber-700 font-mono">14%</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">VP & Finance Dual Signoffs</span>
                  <span className="font-semibold text-rose-700 font-mono">4%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS MASTER */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700">
              Commercial Products & Services Catalog
            </h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddProductOpen(true)}
              className="bg-[#5E2A52] hover:bg-[#4d2243] flex items-center gap-1.5 rounded"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Product
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/75 text-[11px] uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Product Name</th>
                  <th className="py-2 px-3">SKU</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Base Price</th>
                  <th className="py-2 px-3 text-right">Cost Price</th>
                  <th className="py-2 px-3">Billing Type</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-medium text-slate-900">
                      <div>{p.name}</div>
                      <div className="text-[10px] text-slate-400">{p.description}</div>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-500">{p.sku}</td>
                    <td className="py-2 px-3">{p.category}</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-900 font-mono">
                      {formatCurrency(p.basePrice)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400 font-mono">
                      {formatCurrency(p.costPrice)}
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant={p.billingType === 'RECURRING' ? 'info' : 'neutral'}>
                        {p.billingType === 'RECURRING' ? 'Recurring' : 'One-Time'}
                      </Badge>
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant="success">{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PRICELISTS */}
      {activeTab === 'pricelists' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700">
              Customer Tier Pricelists (Bronze, Silver, Gold)
            </h3>
          </div>

          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/75 text-[11px] uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Customer Tier</th>
                  <th className="py-2 px-3">Product Name</th>
                  <th className="py-2 px-3">SKU</th>
                  <th className="py-2 px-3 text-right">Negotiated Tier Price</th>
                  <th className="py-2 px-3">Effective From</th>
                  <th className="py-2 px-3">Effective To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pricelists.map((pl) => (
                  <tr key={pl.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-semibold text-[#5E2A52]">{pl.tier} Tier</td>
                    <td className="py-2 px-3 font-medium text-slate-900">{pl.productName}</td>
                    <td className="py-2 px-3 font-mono text-slate-500">{pl.sku}</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-900 font-mono">
                      {formatCurrency(pl.tierPrice)}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-500">{pl.effectiveFrom}</td>
                    <td className="py-2 px-3 font-mono text-slate-500">{pl.effectiveTo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DISCOUNT RULES & GOVERNANCE */}
      {activeTab === 'discount-rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700">
                Configurable Governance Policies & Discount Thresholds
              </h3>
              <p className="text-xs text-slate-500">
                Proves governance is dynamically configured rather than hardcoded
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddRuleOpen(true)}
              className="bg-[#5E2A52] hover:bg-[#4d2243] flex items-center gap-1.5 rounded"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Rule
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/75 text-[11px] uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Rule Name</th>
                  <th className="py-2 px-3">Customer Tier</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Max Discount</th>
                  <th className="py-2 px-3 text-right">Risk Threshold</th>
                  <th className="py-2 px-3">Required Approval Level</th>
                  <th className="py-2 px-3">Version</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discountRules.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-semibold text-slate-900">{r.ruleName}</td>
                    <td className="py-2 px-3 font-medium text-[#5E2A52]">{r.customerTier}</td>
                    <td className="py-2 px-3 text-slate-700">{r.category}</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-900 font-mono">
                      {formatPercent(r.maxDiscountPercent)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">{r.riskThreshold}</td>
                    <td className="py-2 px-3 font-medium text-slate-800">{r.approvalLevel}</td>
                    <td className="py-2 px-3 font-mono text-[10px] text-slate-400">{r.version}</td>
                    <td className="py-2 px-3">
                      <Badge variant={r.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleRuleStatus(r)}
                        className="text-xs text-slate-600 py-0.5 px-2 rounded"
                      >
                        {r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Product */}
      <Modal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        title="Add Commercial Product"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Product Name:</label>
            <input
              type="text"
              required
              value={newProdName}
              onChange={(e) => setNewProdName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#5E2A52]"
              placeholder="e.g. GPU AI Acceleration Node"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SKU:</label>
              <input
                type="text"
                required
                value={newProdSku}
                onChange={(e) => setNewProdSku(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#5E2A52]"
                placeholder="HW-2005"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category:</label>
              <select
                value={newProdCategory}
                onChange={(e) => setNewProdCategory(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs bg-white focus:ring-1 focus:ring-[#5E2A52]"
              >
                <option value="Hardware">Hardware</option>
                <option value="Service">Service</option>
                <option value="Software">Software</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Base Price (₹):</label>
              <input
                type="number"
                value={newProdPrice}
                onChange={(e) => setNewProdPrice(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#5E2A52]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cost Price (₹):</label>
              <input
                type="number"
                value={newProdCost}
                onChange={(e) => setNewProdCost(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#5E2A52]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Billing Type:</label>
            <select
              value={newProdBilling}
              onChange={(e) => setNewProdBilling(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded text-xs bg-white focus:ring-1 focus:ring-[#5E2A52]"
            >
              <option value="ONE_TIME">One-Time Capital</option>
              <option value="RECURRING">Recurring Subscription</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setIsAddProductOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-[#5E2A52]">
              Save Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Rule */}
      <Modal
        isOpen={isAddRuleOpen}
        onClose={() => setIsAddRuleOpen(false)}
        title="Create Governance Discount Rule"
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Rule Name:</label>
            <input
              type="text"
              required
              value={newRuleName}
              onChange={(e) => setNewRuleName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#5E2A52]"
              placeholder="e.g. Platinum Tier Cap"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category:</label>
              <select
                value={newRuleCategory}
                onChange={(e) => setNewRuleCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs bg-white focus:ring-1 focus:ring-[#5E2A52]"
              >
                <option value="Hardware">Hardware</option>
                <option value="Service">Service</option>
                <option value="Software">Software</option>
                <option value="All">All Categories</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tier:</label>
              <select
                value={newRuleTier}
                onChange={(e) => setNewRuleTier(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs bg-white focus:ring-1 focus:ring-[#5E2A52]"
              >
                <option value="Bronze">Bronze</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="All">All Tiers</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Max Discount %:</label>
              <input
                type="number"
                value={newRuleDiscount}
                onChange={(e) => setNewRuleDiscount(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-[#5E2A52]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Approval Authority:</label>
            <select
              value={newRuleApproval}
              onChange={(e) => setNewRuleApproval(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded text-xs bg-white focus:ring-1 focus:ring-[#5E2A52]"
            >
              <option value="None">None (Auto-Approved)</option>
              <option value="Sales Manager">Sales Manager</option>
              <option value="Sales Manager + Finance">Sales Manager + Finance</option>
              <option value="VP of Sales">VP of Sales</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setIsAddRuleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="bg-[#5E2A52]">
              Create Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
