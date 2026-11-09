'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ordersAPI } from '@/lib/api'
import Loading from '@/components/Loading'
import { Printer, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRef } from 'react'

export default function InvoicePage() {
  const params = useParams()
  const orderId = parseInt(params.id as string)
  const invoiceRef = useRef<HTMLDivElement>(null)

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersAPI.get(orderId),
    select: (res) => res.data,
  })

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    try {
      const element = invoiceRef.current
      if (!element) return

      // Create a new window for PDF
      const printWindow = window.open('', '', 'height=400,width=800')
      if (!printWindow) {
        toast.error('Could not open print window')
        return
      }

      printWindow.document.write(element.outerHTML)
      printWindow.document.close()
      
      // Trigger download via print
      setTimeout(() => {
        printWindow.print()
        toast.success('Print dialog opened - select "Save as PDF"')
      }, 250)
    } catch (error) {
      toast.error('Failed to generate PDF')
    }
  }

  if (isLoading) return <Loading />

  if (!order) return <div className="text-center py-8 text-gray-600">Invoice not found</div>

  const subtotal = (order.items || []).reduce(
    (sum: number, item: any) => sum + (item.unitPrice || 0) * item.quantity,
    0
  )
  const tax = subtotal * 0.1
  const total = subtotal + tax

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6 flex gap-3 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Printer className="w-5 h-5" />
          Print
        </button>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Download className="w-5 h-5" />
          Save as PDF
        </button>
      </div>

      {/* Invoice */}
      <div ref={invoiceRef} className="bg-white p-12 rounded-lg shadow-lg">
        {/* Header */}
        <div className="mb-8 pb-8 border-b-2 border-gray-200">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">INVOICE</h1>
              <p className="text-gray-600 mt-2">Professional Order Management System</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Invoice #</p>
              <p className="text-2xl font-bold text-gray-900">{order.orderNumber}</p>
              <p className="text-sm text-gray-600 mt-4">
                {new Date(order.createdAt).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Order Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Bill To</h3>
            <p className="text-lg font-semibold text-gray-900">{order.customer?.customerName}</p>
            <p className="text-gray-600">{order.customer?.customerAddress}</p>
            <p className="text-gray-600">{order.customer?.phone}</p>
            <p className="text-gray-600">{order.customer?.email}</p>
          </div>
          <div className="text-right">
            <div className="mb-4">
              <p className="text-sm text-gray-600">Status</p>
              <span
                className={`inline-block px-4 py-2 rounded-lg text-sm font-semibold text-white ${
                  order.status === 'COMPLETED'
                    ? 'bg-green-600'
                    : order.status === 'PAID'
                      ? 'bg-blue-600'
                      : order.status === 'PENDING'
                        ? 'bg-yellow-600'
                        : 'bg-gray-600'
                }`}
              >
                {order.status}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">Due Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID')}
              </p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-8">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Quantity</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Unit Price</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item: any, idx: number) => (
              <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                  {item.product?.productName}
                  <br />
                  <span className="text-xs text-gray-600">{item.product?.productCode}</span>
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">{item.quantity}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">
                  Rp{(item.unitPrice || 0).toLocaleString('id-ID')}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 font-bold">
                  Rp{((item.unitPrice || 0) * item.quantity).toLocaleString('id-ID')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="flex justify-between mb-3 pb-3 border-b border-gray-300">
              <span className="text-gray-700">Subtotal</span>
              <span className="text-gray-900 font-semibold">Rp{subtotal.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between mb-3 pb-3 border-b border-gray-300">
              <span className="text-gray-700">Tax (10%)</span>
              <span className="text-gray-900 font-semibold">Rp{tax.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between bg-blue-50 p-3 rounded-lg">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-blue-600">Rp{total.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 pt-6 mt-8">
          <p className="text-xs text-gray-600 text-center">
            Thank you for your business. This invoice is valid for 30 days from the invoice date.
          </p>
          <p className="text-xs text-gray-600 text-center mt-2">
            Payment Method: Bank Transfer | Account: 1234567890 (BCA)
          </p>
        </div>
      </div>
    </div>
  )
}
