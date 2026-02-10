/**
 * BILL PREVIEW COMPONENT - STEP 4: PRESENTATION ONLY
 * ====================================================
 * 
 * Displays bill data from billingService in print-ready format.
 * NO calculations, NO mutations, NO business logic.
 */

import { useState } from 'react';
import { getGSTSummary } from '../../services/billingService';
import './BillPreview.css';

const BillPreview = ({ bill, onClose }) => {
  const [isPrinting, setIsPrinting] = useState(false);

  if (!bill) {
    return (
      <div className="bill-preview-error">
        <p>No bill data available</p>
      </div>
    );
  }

  const gstSummary = getGSTSummary(bill);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    
    let date;
    // Handle Firestore Timestamp
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } 
    // Handle ISO string or Date object
    else {
      date = new Date(dateValue);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '₹0.00';
    }
    return `₹${Number(amount).toFixed(2)}`;
  };

  return (
    <div className="bill-preview-container">
      {/* Screen-only controls */}
      <div className="bill-preview-controls no-print">
        <button onClick={handlePrint} className="btn-print" disabled={isPrinting}>
          {isPrinting ? 'Preparing...' : '🖨️ Print Bill'}
        </button>
        {onClose && (
          <button onClick={onClose} className="btn-close">
            ✕ Close
          </button>
        )}
      </div>

      {/* Debug info */}
      <div className="no-print" style={{ background: '#f0f0f0', padding: '10px', marginBottom: '10px', fontSize: '11px' }}>
        <strong>Debug:</strong> Bill Number: {bill.billNumber}, Items: {bill.lineItems?.length || 0}
      </div>

      {/* Print-ready invoice */}
      <div className="bill-invoice">
        {/* Header */}
        <div className="bill-header">
          <div className="bill-business-info">
            <h1 className="business-name">{bill.seller.businessName}</h1>
            <p className="business-address">{bill.seller.storeAddress}</p>
            <p className="business-contact">
              Phone: {bill.seller.phone} | Email: {bill.seller.email}
            </p>
            <p className="business-gstin">
              <strong>GSTIN:</strong> {bill.seller.gstin} | <strong>State Code:</strong> {bill.seller.stateCode}
            </p>
          </div>
          
          <div className="bill-meta">
            <h2 className="invoice-title">TAX INVOICE</h2>
            <p><strong>Bill No:</strong> {bill.billNumber}</p>
            <p><strong>Date:</strong> {formatDate(bill.billDate)}</p>
            <p><strong>Order Type:</strong> {bill.orderType.toUpperCase()}</p>
            {bill.exhibitionId && (
              <p><strong>Exhibition ID:</strong> {bill.exhibitionId}</p>
            )}
            <p><strong>Employee:</strong> {bill.employeeName}</p>
          </div>
        </div>

        <div className="bill-divider"></div>

        {/* Customer Section */}
        <div className="bill-customer">
          <h3>Bill To:</h3>
          <p className="customer-name"><strong>{bill.customer.name}</strong></p>
          <p className="customer-phone">Phone: {bill.customer.phone}</p>
          {bill.customer.address && (
            <p className="customer-address">Address: {bill.customer.address}</p>
          )}
        </div>

        <div className="bill-divider"></div>

        {/* Items Table */}
        <div className="bill-items">
          <table className="items-table">
            <thead>
              <tr>
                <th className="col-sno">S.No</th>
                <th className="col-product">Product Name</th>
                <th className="col-sku">SKU</th>
                <th className="col-qty">Qty</th>
                <th className="col-rate">Rate</th>
                <th className="col-discount">Discount</th>
                <th className="col-taxable">Taxable Value</th>
                <th className="col-cgst">CGST</th>
                <th className="col-sgst">SGST</th>
                <th className="col-total">Total</th>
              </tr>
            </thead>
            <tbody>
              {bill.lineItems.map((item, index) => (
                <tr key={index}>
                  <td className="col-sno">{index + 1}</td>
                  <td className="col-product">
                    {item.productName}
                    <span className="item-category">({item.category})</span>
                  </td>
                  <td className="col-sku">{item.sku}</td>
                  <td className="col-qty">{item.quantity}</td>
                  <td className="col-rate">{formatCurrency(item.unitPrice)}</td>
                  <td className="col-discount">
                    {item.discountApplied > 0 ? formatCurrency(item.discountApplied) : '-'}
                  </td>
                  <td className="col-taxable">{formatCurrency(item.taxableValue)}</td>
                  <td className="col-cgst">
                    {item.cgstRate}%<br />
                    {formatCurrency(item.cgstAmount)}
                  </td>
                  <td className="col-sgst">
                    {item.sgstRate}%<br />
                    {formatCurrency(item.sgstAmount)}
                  </td>
                  <td className="col-total">{formatCurrency(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bill-divider"></div>

        {/* GST Summary */}
        {gstSummary.length > 0 && (
          <div className="bill-gst-summary">
            <h4>GST Summary:</h4>
            <table className="gst-summary-table">
              <thead>
                <tr>
                  <th>GST Rate</th>
                  <th>Taxable Value</th>
                  <th>CGST</th>
                  <th>SGST</th>
                  <th>Total Tax</th>
                </tr>
              </thead>
              <tbody>
                {gstSummary.map((group, index) => (
                  <tr key={index}>
                    <td>{group.gstRate}%</td>
                    <td>{formatCurrency(group.taxableValue)}</td>
                    <td>{group.cgstRate}% - {formatCurrency(group.cgstAmount)}</td>
                    <td>{group.sgstRate}% - {formatCurrency(group.sgstAmount)}</td>
                    <td>{formatCurrency(group.totalTax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals Section */}
        <div className="bill-totals">
          <div className="totals-grid">
            <div className="total-row">
              <span className="total-label">Total Quantity:</span>
              <span className="total-value">{bill.totals.totalQuantity} items</span>
            </div>
            <div className="total-row">
              <span className="total-label">Subtotal:</span>
              <span className="total-value">{formatCurrency(bill.totals.subtotal)}</span>
            </div>
            {bill.totals.totalDiscount > 0 && (
              <div className="total-row discount-row">
                <span className="total-label">Total Discount:</span>
                <span className="total-value">- {formatCurrency(bill.totals.totalDiscount)}</span>
              </div>
            )}
            <div className="total-row">
              <span className="total-label">CGST:</span>
              <span className="total-value">{formatCurrency(bill.totals.totalCGST)}</span>
            </div>
            <div className="total-row">
              <span className="total-label">SGST:</span>
              <span className="total-value">{formatCurrency(bill.totals.totalSGST)}</span>
            </div>
            <div className="total-row tax-row">
              <span className="total-label">Total Tax:</span>
              <span className="total-value">{formatCurrency(bill.totals.totalTax)}</span>
            </div>
            <div className="total-row grand-total-row">
              <span className="total-label">Grand Total:</span>
              <span className="total-value">{formatCurrency(bill.totals.grandTotal)}</span>
            </div>
            {bill.totals.roundedOffAmount !== 0 && (
              <div className="total-row rounding-row">
                <span className="total-label">Rounding Adjustment:</span>
                <span className="total-value">
                  {bill.totals.roundedOffAmount > 0 ? '+' : ''}
                  {formatCurrency(Math.abs(bill.totals.roundedOffAmount))}
                </span>
              </div>
            )}
            <div className="total-row payable-row">
              <span className="total-label">PAYABLE AMOUNT:</span>
              <span className="total-value">{formatCurrency(bill.totals.payableAmount)}</span>
            </div>
          </div>
        </div>

        <div className="bill-divider"></div>

        {/* Footer */}
        <div className="bill-footer">
          <div className="footer-info">
            <p><strong>Payment Mode:</strong> {bill.footer.paymentMode}</p>
            {bill.footer.notes && (
              <p><strong>Notes:</strong> {bill.footer.notes}</p>
            )}
          </div>
          
          <div className="footer-declaration">
            <p className="declaration-text">
              This is a system-generated GST invoice and does not require a signature.
            </p>
            <p className="thank-you">Thank you for your business!</p>
          </div>
          
          <div className="footer-meta">
            <p className="generated-at">Generated: {formatDate(bill.generatedAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillPreview;
