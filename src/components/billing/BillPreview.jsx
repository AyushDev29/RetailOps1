/**
 * BILL PREVIEW COMPONENT - STEP 4: PRESENTATION ONLY
 * ====================================================
 * 
 * Displays bill data from billingService in print-ready format.
 * NO calculations, NO mutations, NO business logic.
 */

import { useState, useEffect } from 'react';
import { getGSTSummary } from '../../services/billingService';
import { recordPayment, getPaymentSummary, PAYMENT_MODES, PAYMENT_STATUS } from '../../services/paymentService';
import { useAuth } from '../../hooks/useAuth';
import './BillPreview.css';

const BillPreview = ({ bill, onClose, onPaymentRecorded }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    mode: PAYMENT_MODES.CASH,
    amount: '',
    referenceId: ''
  });
  const [isRecording, setIsRecording] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const { user } = useAuth();

  // Calculate payment summary on mount and when bill changes
  useEffect(() => {
    if (bill && bill.id) {
      const summary = getPaymentSummary(bill);
      setPaymentSummary(summary);
      
      // Auto-fill due amount in payment form
      if (summary.dueAmount > 0) {
        setPaymentForm(prev => ({
          ...prev,
          amount: summary.dueAmount.toFixed(2)
        }));
      }
    }
  }, [bill]);

  if (!bill) {
    return (
      <div className="bill-preview-error">
        <p>No bill data available</p>
      </div>
    );
  }

  const gstSummary = getGSTSummary(bill);
  const isLocked = paymentSummary?.isLocked || false;

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setPaymentForm(prev => ({ ...prev, amount: value }));
    }
  };

  const handleRecordPayment = async () => {
    try {
      setIsRecording(true);
      setPaymentError('');

      // Validate amount
      const amount = parseFloat(paymentForm.amount);
      if (isNaN(amount) || amount <= 0) {
        setPaymentError('Please enter a valid amount');
        return;
      }

      // Record payment
      const updatedBill = await recordPayment(bill.id, {
        mode: paymentForm.mode,
        amount: amount,
        referenceId: null, // Not tracking reference IDs
        recordedBy: user?.uid || null
      });

      // Update payment summary
      const newSummary = getPaymentSummary(updatedBill);
      setPaymentSummary(newSummary);

      // Reset form
      setPaymentForm({
        mode: PAYMENT_MODES.CASH,
        amount: newSummary.dueAmount > 0 ? newSummary.dueAmount.toFixed(2) : '',
        referenceId: ''
      });

      // Hide form if fully paid
      if (newSummary.paymentStatus === PAYMENT_STATUS.PAID) {
        setShowPaymentForm(false);
      }

      // Notify parent component
      if (onPaymentRecorded) {
        onPaymentRecorded(updatedBill);
      }

      alert('Payment recorded successfully!');
    } catch (error) {
      console.error('Error recording payment:', error);
      setPaymentError(error.message || 'Failed to record payment');
    } finally {
      setIsRecording(false);
    }
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
    
    // Convert to IST manually (UTC + 5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffset);
    
    // Format: "11 Feb 2026, 11:06 am"
    const day = istDate.getUTCDate();
    const month = istDate.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' });
    const year = istDate.getUTCFullYear();
    
    let hours = istDate.getUTCHours();
    const minutes = istDate.getUTCMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
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

      {/* Payment Status & Recording (STEP 6) */}
      {bill.id && paymentSummary && (
        <div className="bill-payment-section no-print">
          <div className="payment-status-card">
            <h3>Payment Status</h3>
            <div className="payment-status-grid">
              <div className="payment-stat">
                <span className="payment-label">Status:</span>
                <span className={`payment-badge payment-badge-${paymentSummary.paymentStatus.toLowerCase()}`}>
                  {paymentSummary.paymentStatus}
                </span>
              </div>
              <div className="payment-stat">
                <span className="payment-label">Payable Amount:</span>
                <span className="payment-value">{formatCurrency(paymentSummary.payableAmount)}</span>
              </div>
              <div className="payment-stat">
                <span className="payment-label">Paid Amount:</span>
                <span className="payment-value payment-paid">{formatCurrency(paymentSummary.paidAmount)}</span>
              </div>
              <div className="payment-stat">
                <span className="payment-label">Due Amount:</span>
                <span className="payment-value payment-due">{formatCurrency(paymentSummary.dueAmount)}</span>
              </div>
            </div>

            {/* Payment History */}
            {paymentSummary.payments.length > 0 && (
              <div className="payment-history">
                <h4>Payment History ({paymentSummary.paymentsCount})</h4>
                <div className="payment-history-list">
                  {paymentSummary.payments.map((payment, index) => (
                    <div key={index} className="payment-history-item">
                      <span className="payment-mode-badge">{payment.mode}</span>
                      <span className="payment-amount">{formatCurrency(payment.amount)}</span>
                      <span className="payment-time">{formatDate(payment.paidAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Recording Form */}
            {!isLocked && paymentSummary.dueAmount > 0 && (
              <div className="payment-recording">
                {!showPaymentForm ? (
                  <button 
                    onClick={() => setShowPaymentForm(true)} 
                    className="btn-add-payment"
                  >
                    💳 Record Payment
                  </button>
                ) : (
                  <div className="payment-form">
                    <h4>Record Payment</h4>
                    
                    {paymentError && (
                      <div className="payment-error">{paymentError}</div>
                    )}

                    <div className="payment-form-grid">
                      <div className="form-group">
                        <label>Payment Mode</label>
                        <select 
                          value={paymentForm.mode} 
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, mode: e.target.value }))}
                          disabled={isRecording}
                        >
                          <option value={PAYMENT_MODES.CASH}>Cash</option>
                          <option value={PAYMENT_MODES.UPI}>UPI</option>
                          <option value={PAYMENT_MODES.CARD}>Card</option>
                          <option value={PAYMENT_MODES.BANK_TRANSFER}>Bank Transfer</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Amount (₹)</label>
                        <input 
                          type="text" 
                          value={paymentForm.amount}
                          onChange={handleAmountChange}
                          placeholder="0.00"
                          disabled={isRecording}
                        />
                        <small>Due: ₹{paymentSummary.dueAmount.toFixed(2)}</small>
                      </div>
                    </div>

                    <div className="payment-form-actions">
                      <button 
                        onClick={handleRecordPayment}
                        className="btn-record-payment"
                        disabled={isRecording}
                      >
                        {isRecording ? 'Recording...' : '✓ Record Payment'}
                      </button>
                      <button 
                        onClick={() => {
                          setShowPaymentForm(false);
                          setPaymentError('');
                        }}
                        className="btn-cancel-payment"
                        disabled={isRecording}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isLocked && (
              <div className="payment-locked-notice">
                🔒 Bill is fully paid and locked. No further changes allowed.
              </div>
            )}
          </div>
        </div>
      )}

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
            {bill.exhibitionLocation && (
              <p><strong>Exhibition:</strong> 📍 {bill.exhibitionLocation}</p>
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
                    {item.cgstRate !== undefined && !isNaN(item.cgstRate) ? `${item.cgstRate}%` : '2.5%'}<br />
                    {formatCurrency(item.cgstAmount)}
                  </td>
                  <td className="col-sgst">
                    {item.sgstRate !== undefined && !isNaN(item.sgstRate) ? `${item.sgstRate}%` : '2.5%'}<br />
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
                    <td>{group.gstRate !== undefined && !isNaN(group.gstRate) ? `${group.gstRate}%` : '5%'}</td>
                    <td>{formatCurrency(group.taxableValue)}</td>
                    <td>{group.cgstRate !== undefined && !isNaN(group.cgstRate) ? `${group.cgstRate}%` : '2.5%'} - {formatCurrency(group.cgstAmount)}</td>
                    <td>{group.sgstRate !== undefined && !isNaN(group.sgstRate) ? `${group.sgstRate}%` : '2.5%'} - {formatCurrency(group.sgstAmount)}</td>
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
