import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import patientService from '../../services/patientService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  Pill,
  Search,
  ShoppingCart,
  Receipt,
  AlertCircle,
  Loader2,
  X,
  CreditCard,
  QrCode,
  Building,
  Banknote,
  Printer,
  FileText,
  ShieldCheck,
  ArrowRight,
  Check,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const PatientMedicinesPage = () => {
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('prescribed'); // 'prescribed' | 'catalogue' | 'receipts'
  const [medicines, setMedicines] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Purchase Modal State
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [selectedRx, setSelectedRx] = useState(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [purchaseStep, setPurchaseStep] = useState(1); // 1: Select Qty & Method, 2: Review Summary
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [medsRes, rxRes, rcptRes] = await Promise.all([
        patientService.getMedicines(searchQuery),
        patientService.getPrescriptions(),
        patientService.getReceipts(),
      ]);
      const rawMeds = Array.isArray(medsRes) ? medsRes : medsRes?.results || [];
      setMedicines(rawMeds.filter((m) => m.is_active !== false));
      setPrescriptions(Array.isArray(rxRes) ? rxRes : rxRes?.results || []);
      setReceipts(Array.isArray(rcptRes) ? rcptRes : rcptRes?.results || []);
    } catch (err) {
      let msg = 'Failed to load pharmacy inventory and prescription records.';
      if (err.response && err.response.data && err.response.data.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    document.title = 'Pharmacy & Medicines — CareFlow Patient Portal';
    fetchAllData();
  }, [fetchAllData]);

  // Handle URL parameters e.g. ?medicine=2&rx=3
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const medId = params.get('medicine');
    const rxId = params.get('rx');

    if (medId && medicines.length > 0) {
      const targetMed = medicines.find((m) => String(m.id) === String(medId));
      if (targetMed) {
        let linkedRx = null;
        if (rxId && prescriptions.length > 0) {
          linkedRx = prescriptions.find((r) => String(r.id) === String(rxId));
        }
        handleInitiatePurchase(targetMed, linkedRx);
      }
    } else if (rxId && prescriptions.length > 0 && !medId) {
      setActiveTab('prescribed');
    }
  }, [location.search, medicines, prescriptions]);

  // Extract prescribed items list from active prescriptions
  const activePrescriptions = prescriptions.filter(
    (rx) => rx.status === 'PENDING' || rx.status === 'PARTIALLY_DISPENSED'
  );

  const prescribedItems = [];
  activePrescriptions.forEach((rx) => {
    (rx.items || []).forEach((item) => {
      const medInStock = medicines.find((m) => m.id === item.medicine);
      prescribedItems.push({
        ...item,
        rx_id: rx.id,
        prescription_id_code: rx.prescription_id,
        doctor_name: rx.doctor_name,
        doctor_specialization: rx.doctor_specialization,
        stock_quantity: medInStock?.stock_quantity ?? item.medicine_stock ?? 0,
        unit_price: medInStock?.unit_price ?? item.medicine_unit_price ?? '0.00',
        medicine_obj: medInStock,
        remaining_quantity: Math.max(0, item.quantity_prescribed - item.quantity_dispensed),
      });
    });
  });

  const handleInitiatePurchase = (medicine, prescription = null) => {
    setSelectedMedicine(medicine);
    setSelectedRx(prescription);
    setPurchaseQuantity(1);
    setPaymentMethod('UPI');
    setPurchaseStep(1);
    setPurchaseError('');
    setIsPurchaseModalOpen(true);
  };

  const handlePurchaseSubmit = async () => {
    if (!selectedMedicine) return;

    setIsSubmittingPurchase(true);
    setPurchaseError('');

    try {
      const payload = {
        medicine_id: selectedMedicine.id,
        quantity: parseInt(purchaseQuantity, 10),
        payment_method: paymentMethod,
        prescription_id: selectedRx?.id || selectedRx?.rx_id || undefined,
        notes: `Patient purchase of ${selectedMedicine.name} x${purchaseQuantity}`,
      };

      const res = await patientService.checkoutMedicine(payload);
      setIsPurchaseModalOpen(false);
      const receiptNo = res.receipt?.receipt_number || '';
      const successMessage = `Order confirmed! Receipt #${receiptNo} generated successfully.`;
      toast.success(successMessage, 'Purchase Successful');
      setActiveReceipt(res.receipt);
      setIsReceiptModalOpen(true);
      fetchAllData();
    } catch (err) {
      let msg = 'Failed to complete medicine purchase. Please try again.';
      if (err.response && err.response.data) {
        if (typeof err.response.data === 'string') {
          msg = err.response.data;
        } else if (err.response.data.error) {
          msg = err.response.data.error;
        } else if (err.response.data.detail) {
          msg = err.response.data.detail;
        }
      }
      toast.error(msg, 'Purchase Error');
      setPurchaseError(msg);
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  const numberToWordsRupees = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return 'Zero Rupees Only';

    const ones = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen',
    ];
    const tens = [
      '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
    ];

    const convertSection = (n) => {
      let str = '';
      if (n >= 100) {
        str += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        str += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      }
      if (n > 0) {
        str += ones[n] + ' ';
      }
      return str.trim();
    };

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    let result = '';
    const crore = Math.floor(rupees / 10000000);
    let rem = rupees % 10000000;
    const lakh = Math.floor(rem / 100000);
    rem %= 100000;
    const thousand = Math.floor(rem / 1000);
    rem %= 1000;
    const hundred = rem;

    if (crore > 0) result += convertSection(crore) + ' Crore ';
    if (lakh > 0) result += convertSection(lakh) + ' Lakh ';
    if (thousand > 0) result += convertSection(thousand) + ' Thousand ';
    if (hundred > 0) result += convertSection(hundred) + ' ';

    result = result.trim() || 'Zero';
    result += ' Rupees';

    if (paise > 0) {
      result += ' and ' + convertSection(paise) + ' Paise';
    }
    result += ' Only';

    return result;
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Pharmacy & Medicines</h2>
          <p className="admin-page-subtitle">
            Order your doctor-prescribed tablets, browse hospital pharmacy catalogue, and view verified payment receipts
          </p>
        </div>
      </div>

      {/* Navigation Tabs and Search */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="admin-tabs-list">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'prescribed' ? 'active' : ''}`}
            onClick={() => setActiveTab('prescribed')}
          >
            <FileText size={16} />
            <span>My Prescribed Medicines ({prescribedItems.length})</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'catalogue' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalogue')}
          >
            <Pill size={16} />
            <span>Pharmacy Catalogue ({medicines.length})</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'receipts' ? 'active' : ''}`}
            onClick={() => setActiveTab('receipts')}
          >
            <Receipt size={16} />
            <span>My Orders & Receipts ({receipts.length})</span>
          </button>
        </div>

        {activeTab === 'catalogue' && (
          <div className="admin-search-wrapper" style={{ minWidth: '260px', maxWidth: '360px' }}>
            <Search size={16} className="admin-search-icon" />
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search medicine or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="admin-search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="admin-loading-card" role="status">
          <Loader2 size={36} className="spinner-icon admin-spinner-teal" />
          <p>Connecting to hospital pharmacy dispensary & inventory...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="admin-error-card" role="alert">
          <AlertCircle size={32} className="admin-error-icon" />
          <div className="admin-error-content">
            <h3>Unable to Load Pharmacy Data</h3>
            <p>{error}</p>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={fetchAllData}
            >
              Retry Loading
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 1: PRESCRIBED MEDICINES ────────────────────────────── */}
      {!loading && !error && activeTab === 'prescribed' && (
        <>
          {prescribedItems.length === 0 ? (
            <div className="admin-table-empty">
              <div className="admin-empty-icon-box">
                <FileText size={32} />
              </div>
              <h4>No Active Prescribed Medicines</h4>
              <p>
                You currently have no active doctor prescriptions requiring medicine fulfillment.
                You can browse general over-the-counter medications in the Pharmacy Catalogue tab.
              </p>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => setActiveTab('catalogue')}
              >
                <Pill size={16} />
                <span>Browse Pharmacy Catalogue</span>
              </button>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Prescription Ref</th>
                    <th>Medicine Details</th>
                    <th>Dosage & Instructions</th>
                    <th>Prescribed vs Dispensed</th>
                    <th>Pharmacy Stock</th>
                    <th>Unit Price</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {prescribedItems.map((item, idx) => {
                    const isOutOfStock = (item.stock_quantity || 0) <= 0;

                    return (
                      <tr key={item.id || idx}>
                        <td className="admin-font-mono font-semibold" style={{ color: 'var(--primary-teal, #14b8a6)' }}>
                          <div>
                            <span>{item.prescription_id_code}</span>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                              Dr. {item.doctor_name || 'Specialist'}
                            </span>
                          </div>
                        </td>
                        <td className="font-semibold">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Pill size={16} color="var(--primary-cyan, #06b6d4)" />
                            <div>
                              <span>{item.medicine_name} {item.medicine_strength || ''}</span>
                              <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                                {item.medicine_dosage_form || 'Tablet'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <span style={{ fontWeight: 600 }}>{item.dosage} • {item.frequency}</span>
                            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                              {item.instructions || 'As directed'} ({item.duration || '5 days'})
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="admin-font-mono font-semibold">
                              {item.remaining_quantity} units remaining
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                              ({item.quantity_dispensed} of {item.quantity_prescribed} dispensed)
                            </span>
                          </div>
                        </td>
                        <td>
                          {isOutOfStock ? (
                            <span className="admin-badge admin-badge-danger">Out of Stock</span>
                          ) : item.stock_quantity <= 10 ? (
                            <span className="admin-badge admin-badge-warning">
                              Low Stock ({item.stock_quantity})
                            </span>
                          ) : (
                            <span className="admin-badge admin-badge-success">
                              Available ({item.stock_quantity})
                            </span>
                          )}
                        </td>
                        <td className="admin-font-mono font-semibold">
                          ₹{item.unit_price}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {item.remaining_quantity <= 0 ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                              Fully Dispensed
                            </span>
                          ) : isOutOfStock ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary admin-btn-xs"
                              disabled
                            >
                              Restocking
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="admin-btn admin-btn-primary admin-btn-xs"
                              onClick={() => {
                                const medObj = item.medicine_obj || {
                                  id: item.medicine,
                                  name: item.medicine_name,
                                  strength: item.medicine_strength,
                                  unit_price: item.unit_price,
                                  stock_quantity: item.stock_quantity,
                                };
                                handleInitiatePurchase(medObj, {
                                  id: item.rx_id,
                                  prescription_id: item.prescription_id_code,
                                  remaining_quantity: item.remaining_quantity,
                                });
                              }}
                            >
                              <ShoppingCart size={13} />
                              <span>Order ({item.remaining_quantity} left)</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ─── TAB 2: PHARMACY CATALOGUE ──────────────────────────────── */}
      {!loading && !error && activeTab === 'catalogue' && (
        <>
          {medicines.length === 0 ? (
            <div className="admin-table-empty">
              <div className="admin-empty-icon-box">
                <Pill size={32} />
              </div>
              <h4>No Medicines Found</h4>
              <p>No medicines matched your query in the hospital pharmacy catalogue.</p>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Medicine Name</th>
                    <th>Form & Strength</th>
                    <th>Manufacturer</th>
                    <th>Price</th>
                    <th>Stock Status</th>
                    <th style={{ textAlign: 'center' }}>Purchase Action</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((med) => {
                    const isOutOfStock = med.stock_quantity <= 0;
                    // Check if this medicine is on patient's active prescriptions
                    const linkedPrescriptionItem = prescribedItems.find((p) => p.medicine === med.id);

                    return (
                      <tr key={med.id}>
                        <td className="admin-font-mono font-semibold" style={{ color: 'var(--primary-cyan, #06b6d4)' }}>
                          {med.medicine_code}
                        </td>
                        <td className="font-semibold">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Pill size={16} color="var(--primary-teal, #14b8a6)" />
                            <div>
                              <span>{med.name}</span>
                              {med.generic_name && (
                                <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                                  ({med.generic_name})
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span>{med.dosage_form}</span>
                          {med.strength && (
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                              {med.strength}
                            </span>
                          )}
                        </td>
                        <td>{med.manufacturer || 'CareFlow Pharmacy'}</td>
                        <td className="admin-font-mono font-semibold">
                          ₹{med.unit_price}
                        </td>
                        <td>
                          {isOutOfStock ? (
                            <span className="admin-badge admin-badge-danger">Out of Stock</span>
                          ) : med.stock_quantity <= 10 ? (
                            <span className="admin-badge admin-badge-warning">
                              Low Stock ({med.stock_quantity})
                            </span>
                          ) : (
                            <span className="admin-badge admin-badge-success">
                              In Stock ({med.stock_quantity})
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isOutOfStock ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary admin-btn-xs"
                              disabled
                            >
                              Unavailable
                            </button>
                          ) : linkedPrescriptionItem ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn-primary admin-btn-xs"
                              onClick={() =>
                                handleInitiatePurchase(med, {
                                  id: linkedPrescriptionItem.rx_id,
                                  prescription_id: linkedPrescriptionItem.prescription_id_code,
                                  remaining_quantity: linkedPrescriptionItem.remaining_quantity,
                                })
                              }
                            >
                              <ShoppingCart size={13} />
                              <span>Order (Prescribed)</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="admin-btn admin-btn-outline admin-btn-xs"
                              onClick={() => handleInitiatePurchase(med, null)}
                            >
                              <ShoppingCart size={13} />
                              <span>Order Tablet</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ─── TAB 3: MY ORDERS & RECEIPTS ────────────────────────────── */}
      {!loading && !error && activeTab === 'receipts' && (
        <>
          {receipts.length === 0 ? (
            <div className="admin-table-empty">
              <div className="admin-empty-icon-box">
                <Receipt size={32} />
              </div>
              <h4>No Payment Receipts Yet</h4>
              <p>
                When you order medications or complete payments through the portal, verified receipts will be archived here.
              </p>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Receipt No.</th>
                    <th>Invoice No.</th>
                    <th>Date & Time</th>
                    <th>Amount Paid</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Receipt Action</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((rcpt) => (
                    <tr key={rcpt.id}>
                      <td className="admin-font-mono font-semibold" style={{ color: 'var(--primary-cyan, #06b6d4)' }}>
                        {rcpt.receipt_number}
                      </td>
                      <td className="admin-font-mono">
                        {rcpt.bill_number || `INV #${rcpt.bill}`}
                      </td>
                      <td>
                        {rcpt.payment_date?.replace('T', ' ').slice(0, 16)}
                      </td>
                      <td className="admin-font-mono font-semibold" style={{ color: 'var(--admin-success, #10b981)' }}>
                        ₹{rcpt.amount}
                      </td>
                      <td>
                        <span className="admin-badge admin-badge-teal">
                          {rcpt.payment_method}
                        </span>
                      </td>
                      <td>
                        <span className="admin-badge admin-badge-success">
                          {rcpt.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="admin-btn admin-btn-outline admin-btn-xs"
                          onClick={() => {
                            setActiveReceipt(rcpt);
                            setIsReceiptModalOpen(true);
                          }}
                        >
                          <Printer size={13} />
                          <span>View & Print</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PURCHASE / CHECKOUT MODAL (Centered via ModalPortal)
      ───────────────────────────────────────────────────────────── */}
      {isPurchaseModalOpen && selectedMedicine && (
        <ModalPortal isOpen={true}>
          <div
            className="admin-modal-backdrop"
            onClick={() => setIsPurchaseModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-modal-title"
          >
            <div
              className="admin-modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '560px' }}
            >
              <div className="admin-modal-header">
                <div className="admin-modal-title-box">
                  <h3 id="purchase-modal-title" className="admin-modal-title">
                    Purchase Medication
                  </h3>
                  <p className="admin-modal-subtitle">
                    CareFlow Hospital Pharmacy Dispensary
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="admin-modal-body">
                {purchaseError && (
                  <div className="admin-alert admin-alert-danger" role="alert">
                    <AlertCircle size={16} />
                    <span>{purchaseError}</span>
                  </div>
                )}

                {/* Medicine Information Summary */}
                <div
                  style={{
                    background: 'var(--admin-surface-secondary)',
                    border: '1px solid var(--admin-border)',
                    borderRadius: 'var(--admin-radius-sm)',
                    padding: '1rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.2rem', fontSize: '1.1rem', color: 'var(--admin-heading-color)' }}>
                        {selectedMedicine.name}
                      </h4>
                      <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                        {selectedMedicine.strength || ''} {selectedMedicine.dosage_form || 'Tablet'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="admin-font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-cyan, #06b6d4)' }}>
                        ₹{selectedMedicine.unit_price}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                        per unit
                      </span>
                    </div>
                  </div>

                  {selectedRx && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid var(--admin-border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                      }}
                    >
                      <span style={{ color: 'var(--admin-text-muted)' }}>
                        Prescription: <strong style={{ color: 'var(--primary-teal, #14b8a6)' }}>#{selectedRx.prescription_id}</strong>
                      </span>
                      {selectedRx.remaining_quantity && (
                        <span className="admin-badge admin-badge-teal">
                          {selectedRx.remaining_quantity} units remaining
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {purchaseStep === 1 ? (
                  <>
                    {/* Quantity Selector */}
                    <div className="admin-form-group">
                      <label className="admin-form-label" htmlFor="purchase-qty">
                        Quantity to Purchase *
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input
                          id="purchase-qty"
                          type="number"
                          min="1"
                          max={
                            selectedRx?.remaining_quantity
                              ? Math.min(selectedMedicine.stock_quantity, selectedRx.remaining_quantity)
                              : selectedMedicine.stock_quantity
                          }
                          className="admin-input"
                          style={{ maxWidth: '140px' }}
                          value={purchaseQuantity}
                          onChange={(e) => setPurchaseQuantity(e.target.value)}
                        />
                        <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                          Available in stock: <strong>{selectedMedicine.stock_quantity} units</strong>
                        </span>
                      </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="admin-form-group">
                      <label className="admin-form-label">
                        Select Payment Method *
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                        {[
                          { id: 'UPI', label: 'UPI / QR Code', icon: QrCode },
                          { id: 'CARD', label: 'Credit / Debit Card', icon: CreditCard },
                          { id: 'NET_BANKING', label: 'Net Banking', icon: Building },
                          { id: 'CASH', label: 'Cash on Counter', icon: Banknote },
                        ].map((method) => {
                          const Icon = method.icon;
                          const isSelected = paymentMethod === method.id;
                          return (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => setPaymentMethod(method.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.65rem',
                                padding: '0.85rem 1rem',
                                background: isSelected
                                  ? 'var(--admin-card-hover)'
                                  : 'var(--admin-surface-secondary)',
                                border: `1.5px solid ${
                                  isSelected ? 'var(--primary-cyan, #06b6d4)' : 'var(--admin-border)'
                                }`,
                                borderRadius: 'var(--admin-radius-sm)',
                                color: isSelected
                                  ? 'var(--admin-heading-color)'
                                  : 'var(--admin-text-main)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Icon size={18} color={isSelected ? 'var(--primary-cyan, #06b6d4)' : 'var(--admin-text-muted)'} />
                              <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 600 : 500 }}>
                                {method.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Total summary */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        background: 'var(--admin-card-bg)',
                        borderRadius: 'var(--admin-radius-sm)',
                        border: '1px solid var(--admin-border-subtle)',
                        marginTop: '1rem',
                      }}
                    >
                      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--admin-heading-color)' }}>
                        Calculated Bill Amount:
                      </span>
                      <span className="admin-font-mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-cyan, #06b6d4)' }}>
                        ₹{(parseFloat(selectedMedicine.unit_price) * (parseInt(purchaseQuantity, 10) || 1)).toFixed(2)}
                      </span>
                    </div>
                  </>
                ) : (
                  /* Step 2: Final Review */
                  <div>
                    <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--admin-heading-color)' }}>
                      Review Purchase Summary
                    </h4>
                    <div className="admin-details-grid">
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Medicine</span>
                        <span className="admin-detail-value font-semibold">
                          {selectedMedicine.name}
                        </span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Quantity</span>
                        <span className="admin-detail-value admin-font-mono font-semibold">
                          {purchaseQuantity} units
                        </span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Unit Price</span>
                        <span className="admin-detail-value admin-font-mono">
                          ₹{selectedMedicine.unit_price}
                        </span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Total Amount</span>
                        <span className="admin-detail-value admin-font-mono font-semibold" style={{ color: 'var(--primary-cyan, #06b6d4)' }}>
                          ₹{(parseFloat(selectedMedicine.unit_price) * (parseInt(purchaseQuantity, 10) || 1)).toFixed(2)}
                        </span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Payment Method</span>
                        <span className="admin-detail-value">
                          <span className="admin-badge admin-badge-teal">{paymentMethod}</span>
                        </span>
                      </div>
                      <div className="admin-detail-item">
                        <span className="admin-detail-label">Security</span>
                        <span className="admin-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#10b981' }}>
                          <ShieldCheck size={14} />
                          <span>HIPAA Validated</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsPurchaseModalOpen(false)}
                >
                  Cancel
                </button>
                {purchaseStep === 1 ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={() => {
                      const qty = parseInt(purchaseQuantity, 10);
                      if (!qty || qty <= 0) {
                        setPurchaseError('Please enter a valid quantity.');
                        return;
                      }
                      setPurchaseError('');
                      setPurchaseStep(2);
                    }}
                  >
                    <span>Proceed to Review</span>
                    <ArrowRight size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={handlePurchaseSubmit}
                    disabled={isSubmittingPurchase}
                  >
                    {isSubmittingPurchase ? (
                      <>
                        <Loader2 size={16} className="spinner-icon" />
                        <span>Processing Payment & Stock...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Confirm & Pay ₹{(parseFloat(selectedMedicine.unit_price) * (parseInt(purchaseQuantity, 10) || 1)).toFixed(2)}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          OFFICIAL VERIFIED RECEIPT MODAL (Centered via ModalPortal)
      ───────────────────────────────────────────────────────────── */}
      {isReceiptModalOpen && activeReceipt && (
        <ModalPortal isOpen={true}>
          <div
            className="admin-modal-backdrop"
            onClick={() => setIsReceiptModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-modal-title"
          >
            <div
              className="admin-modal-card admin-modal-card-lg receipt-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-modal-header no-print">
                <div className="admin-modal-title-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.25))',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--admin-success, #10b981)',
                      }}
                    >
                      <Receipt size={18} />
                    </div>
                    <div>
                      <h3 id="receipt-modal-title" className="admin-modal-title">
                        CareFlow Verified Payment Receipt
                      </h3>
                      <p className="admin-modal-subtitle">
                        Official hospital clinical pharmacy transaction document
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsReceiptModalOpen(false)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="admin-modal-body receipt-modal-body" id="printable-receipt">
                <div className="careflow-receipt-wrapper">
                  <div className="receipt-watermark">CAREFLOW</div>
                  <div className="receipt-content-body">
                    {/* Hospital Masthead Header */}
                    <div className="receipt-hospital-masthead">
                      <div className="receipt-hospital-brand">
                        <div className="receipt-hospital-emblem">
                          <Building size={26} />
                        </div>
                        <div className="receipt-hospital-info">
                          <h2>CareFlow Multi-Speciality Hospital</h2>
                          <p>Accredited Tertiary Healthcare • Central Clinical Pharmacy</p>
                        </div>
                      </div>
                      <div className="receipt-hospital-contact">
                        <div>104 Healthway Blvd, Medical Enclave</div>
                        <div>Hyderabad, Telangana - 500034</div>
                        <div>Ph: +91 40 2345 6789 | Toll-Free: 1800-200-CARE</div>
                        <div>GSTIN: 36AAACH7890B1Z2 | DL No: TS/HYD/2024/09871</div>
                      </div>
                    </div>

                    {/* Document Identification Title Bar */}
                    <div className="receipt-doc-title-bar">
                      <h3>
                        <FileText size={16} /> TAX INVOICE & OFFICIAL PAYMENT RECEIPT
                      </h3>
                      <span className="receipt-verified-stamp">
                        <ShieldCheck size={14} /> {activeReceipt.status || 'PAID & VERIFIED'}
                      </span>
                    </div>

                    {/* Metadata Box */}
                    <div className="receipt-meta-box">
                      <div>
                        <div className="receipt-meta-field">
                          <span className="receipt-meta-label">Receipt Voucher No:</span>
                          <span className="receipt-meta-val admin-font-mono" style={{ color: 'var(--primary-cyan, #06b6d4)' }}>
                            {activeReceipt.receipt_number}
                          </span>
                        </div>
                        <div className="receipt-meta-field">
                          <span className="receipt-meta-label">Invoice Reference:</span>
                          <span className="receipt-meta-val admin-font-mono">
                            {activeReceipt.bill_number || `INV #${activeReceipt.bill || '10001'}`}
                          </span>
                        </div>
                        <div className="receipt-meta-field">
                          <span className="receipt-meta-label">Payment Date & Time:</span>
                          <span className="receipt-meta-val">
                            {activeReceipt.payment_date?.replace('T', ' ').slice(0, 16) || 'Just now'}
                          </span>
                        </div>
                        <div className="receipt-meta-field">
                          <span className="receipt-meta-label">Dispensing Desk:</span>
                          <span className="receipt-meta-val">Pharmacy Counter 02</span>
                        </div>
                      </div>

                      <div>
                        <div className="receipt-meta-field">
                          <span className="receipt-meta-label">Patient Name:</span>
                          <span className="receipt-meta-val">
                            {activeReceipt.patient_name || 'Valued Patient'}
                          </span>
                        </div>
                        <div className="receipt-meta-field">
                          <span className="receipt-meta-label">Patient MRN / ID:</span>
                          <span className="receipt-meta-val admin-font-mono">
                            {activeReceipt.patient_id || 'CF-PAT-PORTAL'}
                          </span>
                        </div>
                        <div className="receipt-meta-field">
                          <span className="receipt-meta-label">Payment Mode:</span>
                          <span className="receipt-meta-val" style={{ textTransform: 'uppercase' }}>
                            {activeReceipt.payment_method || 'ONLINE'}
                          </span>
                        </div>
                        <div className="receipt-meta-field">
                          <span className="receipt-meta-label">Transaction Reference:</span>
                          <span className="receipt-meta-val admin-font-mono" style={{ fontSize: '0.8rem' }}>
                            {activeReceipt.transaction_reference || 'TXN-INTERNAL'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="receipt-scroll-hint no-print">
                      <span>Swipe table horizontally to view all item details →</span>
                    </div>
                    <div className="receipt-table-container">
                      <table className="receipt-items-table">
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}>#</th>
                            <th>Item Description / Formulation</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Qty</th>
                            <th style={{ width: '100px', textAlign: 'right' }}>Unit Price</th>
                            <th style={{ width: '110px', textAlign: 'right' }}>Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(activeReceipt.bill_items) && activeReceipt.bill_items.length > 0 ? (
                            activeReceipt.bill_items.map((item, idx) => (
                              <tr key={item.id || idx}>
                                <td style={{ color: 'var(--admin-text-muted)' }}>{idx + 1}</td>
                                <td>
                                  <strong>{item.description}</strong>
                                  {item.item_type && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', display: 'block' }}>
                                      Type: {item.item_type}
                                    </span>
                                  )}
                                </td>
                                <td className="admin-font-mono" style={{ textAlign: 'center' }}>{item.quantity}</td>
                                <td className="admin-font-mono" style={{ textAlign: 'right' }}>₹{parseFloat(item.unit_price).toFixed(2)}</td>
                                <td className="admin-font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                                  ₹{parseFloat(item.subtotal).toFixed(2)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td style={{ color: 'var(--admin-text-muted)' }}>1</td>
                              <td>
                                <strong>{activeReceipt.notes || 'Medication Dispensation & Clinical Pharmacy Services'}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', display: 'block' }}>
                                  Voucher Ref: {activeReceipt.receipt_number}
                                </span>
                              </td>
                              <td className="admin-font-mono" style={{ textAlign: 'center' }}>1</td>
                              <td className="admin-font-mono" style={{ textAlign: 'right' }}>₹{parseFloat(activeReceipt.amount).toFixed(2)}</td>
                              <td className="admin-font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                                ₹{parseFloat(activeReceipt.amount).toFixed(2)}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals & Amount in Words Panel */}
                    <div className="receipt-totals-panel">
                      <div className="receipt-words-block">
                        <span className="receipt-words-label">Amount in Words:</span>
                        <span className="receipt-words-val">
                          {numberToWordsRupees(activeReceipt.amount)}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '0.35rem' }}>
                          * Inclusive of all applicable CGST (2.5%) & SGST (2.5%) duties.
                        </span>
                      </div>
                      <div className="receipt-amount-block">
                        <span className="receipt-amount-label">Net Amount Paid</span>
                        <div className="receipt-amount-val">
                          ₹{parseFloat(activeReceipt.amount).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Authentication & Legal Notice */}
                    <div className="receipt-footer-auth">
                      <div className="receipt-terms">
                        <strong>Important Terms & Guidelines:</strong>
                        <div>1. Dispensed pharmaceuticals are non-returnable as per Drugs and Cosmetics Act.</div>
                        <div>2. Please verify tablet seal, expiry date, and dosage instructions before consumption.</div>
                        <div>3. Retain this verified receipt for insurance claims and tax compliance.</div>
                      </div>
                      <div className="receipt-auth-signature">
                        <div className="receipt-seal-badge">
                          CAREFLOW HOSPITAL<br />VERIFIED & DISPENSED
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>
                          System-Generated Official Receipt<br />
                          Valid without physical signature
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer no-print">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsReceiptModalOpen(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handlePrintReceipt}
                >
                  <Printer size={16} />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default PatientMedicinesPage;
