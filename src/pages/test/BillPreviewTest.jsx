/**
 * BILL PREVIEW TEST PAGE
 * ======================
 * Demonstrates BillPreview component with sample data
 */

import { useState } from 'react';
import BillPreview from '../../components/billing/BillPreview';
import { generateBill } from '../../services/billingService';
import { calculateOrder } from '../../services/orderCalculationService';

const BillPreviewTest = () => {
  const [showBill, setShowBill] = useState(false);
  const [currentBill, setCurrentBill] = useState(null);

  // Sample bill scenarios
  const generateSampleBill = (scenario) => {
    let cart, metadata;

    switch (scenario) {
      case 'simple':
        cart = {
          items: [
            {
              productId: 'prod_001',
              name: 'Classic Cotton T-Shirt',
              sku: 'MEN-TSH-001',
              category: 'men',
              quantity: 2,
              basePrice: 999,
              salePrice: null,
              gstRate: 12,
              isTaxInclusive: false,
              isOnSale: false
            }
          ],
          employeeDiscount: 0
        };
        metadata = {
          orderId: 'ORD-001',
          orderType: 'store',
          employeeId: 'emp_001',
          employeeName: 'Ayush Navale',
          exhibitionId: null,
          customer: {
            name: 'Rajesh Kumar',
            phone: '+91-9876543210',
            address: 'Mumbai, Maharashtra'
          }
        };
        break;

      case 'multiple':
        cart = {
          items: [
            {
              productId: 'prod_002',
              name: 'Designer Saree',
              sku: 'WMN-SAR-001',
              category: 'women',
              quantity: 1,
              basePrice: 4999,
              salePrice: null,
              gstRate: 5,
              isTaxInclusive: false,
              isOnSale: false
            },
            {
              productId: 'prod_003',
              name: 'Casual Kurti',
              sku: 'WMN-KRT-001',
              category: 'women',
              quantity: 2,
              basePrice: 1499,
              salePrice: 1199,
              gstRate: 12,
              isTaxInclusive: false,
              isOnSale: true
            },
            {
              productId: 'prod_004',
              name: 'Kids Party Dress',
              sku: 'KID-DRS-001',
              category: 'kids',
              quantity: 1,
              basePrice: 1999,
              salePrice: 1599,
              gstRate: 12,
              isTaxInclusive: false,
              isOnSale: true
            }
          ],
          employeeDiscount: 0
        };
        metadata = {
          orderId: 'ORD-002',
          orderType: 'exhibition',
          employeeId: 'emp_001',
          employeeName: 'Ayush Navale',
          exhibitionId: 'EXH-001',
          customer: {
            name: 'Priya Sharma',
            phone: '+91-9876543211',
            address: 'Pune, Maharashtra'
          }
        };
        break;

      case 'discount':
        cart = {
          items: [
            {
              productId: 'prod_005',
              name: 'Slim Fit Jeans',
              sku: 'MEN-JNS-001',
              category: 'men',
              quantity: 3,
              basePrice: 2499,
              salePrice: null,
              gstRate: 12,
              isTaxInclusive: false,
              isOnSale: false
            }
          ],
          employeeDiscount: 10
        };
        metadata = {
          orderId: 'ORD-003',
          orderType: 'prebooking',
          employeeId: 'emp_002',
          employeeName: 'Kedar Patil',
          exhibitionId: null,
          customer: {
            name: 'Amit Verma',
            phone: '+91-9876543212',
            address: ''
          }
        };
        break;

      default:
        return null;
    }

    const orderCalculation = calculateOrder(cart);
    const bill = generateBill(orderCalculation, metadata);
    return bill;
  };

  const handleShowBill = (scenario) => {
    const bill = generateSampleBill(scenario);
    setCurrentBill(bill);
    setShowBill(true);
  };

  const handleCloseBill = () => {
    setShowBill(false);
    setCurrentBill(null);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Bill Preview Test Page</h1>
      <p>Click a button below to preview different bill scenarios:</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
        <button
          onClick={() => handleShowBill('simple')}
          style={{
            padding: '12px 20px',
            fontSize: '16px',
            background: '#0f172a',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          📄 Simple Store Sale (2 T-Shirts)
        </button>

        <button
          onClick={() => handleShowBill('multiple')}
          style={{
            padding: '12px 20px',
            fontSize: '16px',
            background: '#0f172a',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          📄 Exhibition Sale (Multiple Items, Mixed GST Rates)
        </button>

        <button
          onClick={() => handleShowBill('discount')}
          style={{
            padding: '12px 20px',
            fontSize: '16px',
            background: '#0f172a',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          📄 Pre-Booking (With Employee Discount)
        </button>
      </div>

      <div style={{ marginTop: '40px', padding: '20px', background: '#f1f5f9', borderRadius: '8px' }}>
        <h3>Features Demonstrated:</h3>
        <ul>
          <li>✅ GST-compliant invoice layout</li>
          <li>✅ Print-ready format (A4 + thermal)</li>
          <li>✅ Line item details with tax breakdown</li>
          <li>✅ GST summary grouped by rate</li>
          <li>✅ Rounding adjustment display</li>
          <li>✅ Customer and seller information</li>
          <li>✅ Order metadata (type, employee, exhibition)</li>
          <li>✅ Mobile-responsive preview</li>
        </ul>
      </div>

      {showBill && currentBill && (
        <BillPreview bill={currentBill} onClose={handleCloseBill} />
      )}
    </div>
  );
};

export default BillPreviewTest;
