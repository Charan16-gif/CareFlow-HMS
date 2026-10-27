import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import pharmacistService from '../../services/pharmacistService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  ShoppingCart,
  Receipt,
  Pill,
  Plus,
  Minus,
  Trash2,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  CreditCard,
  Building,
  Banknote,
  QrCode,
  ClipboardCheck,
  Check,
  RotateCcw,
  Boxes,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const DOSAGE_FORMS = [
  { value: 'ALL', label: 'All Forms' },
  { value: 'TABLET', label: 'Tablets' },
  { value: 'CAPSULE', label: 'Capsules' },
  { value: 'SYRUP', label: 'Syrups' },
  { value: 'INJECTION', label: 'Injections' },
  { value: 'OINTMENT', label: 'Ointments' },
  { value: 'DROPS', label: 'Drops' },
  { value: 'INHALER', label: 'Inhalers' },
  { value: 'OTHER', label: 'Other' },
];

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

const PharmacistBuyingPaymentPage = () => {
  const location = useLocation();

  // Primary active tab: 'shop' | 'prescriptions' | 'cart' | 'history'
  const [activeTab, setActiveTab] = useState('shop');

  // Core Data
  const [medicines, setMedicines] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [shopSearch, setShopSearch] = useState('');
  const [shopDosageFilter, setShopDosageFilter] = useState('ALL');
  const [rxSearch, setRxSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  // Cart State: Array of items
  // { medicine_id, name, medicine_code, dosage_form, strength, unit_price, quantity, stock_available, prescription_id, rx_code, patient_name, remaining_rx_qty }
  const [cart, setCart] = useState([]);

  // Counter Checkout State
  const [isWalkIn, setIsWalkIn] = useState(true);
  const [walkInName, setWalkInName] = useState('Walk-in Customer');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Load all pharmacy datasets concurrently
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [medsData, rxData, payData, patData] = await Promise.all([
        pharmacistService.getMedicines({ is_active: true }),
        pharmacistService.getPrescriptions(),
        pharmacistService.getPayments(),
        pharmacistService.getPatients(),
      ]);

      setMedicines(Array.isArray(medsData) ? medsData : medsData?.results || []);
      setPrescriptions(Array.isArray(rxData) ? rxData : rxData?.results || []);
      setPayments(Array.isArray(payData) ? payData : payData?.results || []);
      setPatients(Array.isArray(patData) ? patData : patData?.results || []);
    } catch (err) {
      let msg = 'Failed to load pharmacy operational records. Please check backend connection.';
      if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Medicines Buying & Payment — CareFlow Pharmacist';
    loadAllData();
  }, [loadAllData]);

  // Handle URL tabs / actions (?tab=prescriptions, ?tab=history, ?tab=shop, ?tab=cart)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['shop', 'prescriptions', 'cart', 'history'].includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (location.pathname.endsWith('/dispense')) {
      setActiveTab('prescriptions');
    } else if (location.pathname.endsWith('/history') || location.pathname.endsWith('/sales')) {
      setActiveTab('history');
    }
  }, [location.search, location.pathname]);

  // Filtered Shop Medicines
  const filteredShopMedicines = useMemo(() => {
    return medicines.filter((med) => {
      if (med.is_active === false) return false;
      const matchesSearch =
        !shopSearch.trim() ||
        med.name?.toLowerCase().includes(shopSearch.toLowerCase()) ||
        med.generic_name?.toLowerCase().includes(shopSearch.toLowerCase()) ||
        med.brand_name?.toLowerCase().includes(shopSearch.toLowerCase()) ||
        med.medicine_code?.toLowerCase().includes(shopSearch.toLowerCase());

      const matchesDosage =
        shopDosageFilter === 'ALL' || med.dosage_form === shopDosageFilter;

      return matchesSearch && matchesDosage;
    });
  }, [medicines, shopSearch, shopDosageFilter]);

  // Extracted doctor-prescribed medicine lines with pending quantities
  const prescribedLines = useMemo(() => {
    const list = [];
    const pendingPrescriptions = prescriptions.filter(
      (rx) => rx.status === 'PENDING' || rx.status === 'PARTIALLY_DISPENSED' || rx.status === 'COMPLETED'
    );

    pendingPrescriptions.forEach((rx) => {
      (rx.items || []).forEach((item) => {
        const remainingQty = item.quantity_prescribed - (item.quantity_dispensed || 0);
        if (remainingQty > 0) {
          const medRecord = medicines.find((m) => m.id === item.medicine);
          const isArchived = !medRecord || medRecord.is_active === false;
          const currentStock = medRecord ? parseInt(medRecord.stock_quantity, 10) : 0;
          const unitPrice = medRecord ? parseFloat(medRecord.unit_price) : parseFloat(item.medicine_unit_price || 0);

          list.push({
            rx_id: rx.id,
            prescription_code: rx.prescription_id,
            patient_id: rx.patient,
            patient_name: rx.patient_name || 'Patient',
            doctor_name: rx.doctor_name || 'Doctor',
            diagnosis: rx.diagnosis,
            item_id: item.id,
            medicine_id: item.medicine,
            medicine_name: item.medicine_name || medRecord?.name || 'Medicine',
            strength: item.strength || medRecord?.strength || '',
            dosage_form: item.dosage_form || medRecord?.dosage_form || 'TABLET',
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            quantity_prescribed: item.quantity_prescribed,
            quantity_dispensed: item.quantity_dispensed || 0,
            remaining_quantity: remainingQty,
            current_stock: currentStock,
            unit_price: unitPrice,
            is_in_stock: !isArchived && currentStock >= remainingQty,
            is_archived: isArchived,
            med_obj: medRecord,
          });
        }
      });
    });

    if (!rxSearch.trim()) return list;
    const q = rxSearch.toLowerCase();
    return list.filter(
      (line) =>
        line.patient_name.toLowerCase().includes(q) ||
        line.prescription_code.toLowerCase().includes(q) ||
        line.doctor_name.toLowerCase().includes(q) ||
        line.medicine_name.toLowerCase().includes(q) ||
        line.diagnosis?.toLowerCase().includes(q)
    );
  }, [prescriptions, medicines, rxSearch]);

  // Filtered Payments History
  const filteredPayments = useMemo(() => {
    if (!historySearch.trim()) return payments;
    const q = historySearch.toLowerCase();
    return payments.filter(
      (p) =>
        p.receipt_number?.toLowerCase().includes(q) ||
        p.bill_number?.toLowerCase().includes(q) ||
        p.patient_name?.toLowerCase().includes(q) ||
        p.payment_method?.toLowerCase().includes(q) ||
        p.transaction_reference?.toLowerCase().includes(q)
    );
  }, [payments, historySearch]);

  // Filtered Patients for counter selector
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients.slice(0, 10);
    const q = patientSearch.toLowerCase();
    return patients.filter(
      (p) =>
        p.first_name?.toLowerCase().includes(q) ||
        p.last_name?.toLowerCase().includes(q) ||
        p.phone_number?.includes(q) ||
        p.patient_id?.toLowerCase().includes(q)
    ).slice(0, 15);
  }, [patients, patientSearch]);

  // Cart Calculations
  const cartTotals = useMemo(() => {
    let totalItems = cart.length;
    let totalUnits = 0;
    let totalAmount = 0;

    cart.forEach((item) => {
      totalUnits += item.quantity;
      totalAmount += item.quantity * item.unit_price;
    });

    return {
      totalItems,
      totalUnits,
      totalAmount,
    };
  }, [cart]);

  // ─── CART ACTIONS ──────────────────────────────────────────────
  const addToCart = (med, prescriptionItem = null, requestedQty = 1) => {
    const medId = med.id;
    const stockAvail = parseInt(med.stock_quantity, 10);

    if (stockAvail <= 0) {
      toast.warning(`${med.name} is currently out of stock. Cannot add to cart.`, 'Out of Stock');
      return;
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (ci) => ci.medicine_id === medId && (prescriptionItem ? ci.prescription_id === prescriptionItem.rx_id : !ci.prescription_id)
      );

      if (existingIdx >= 0) {
        const item = prev[existingIdx];
        const newQty = item.quantity + requestedQty;

        let maxAllowed = stockAvail;
        if (item.remaining_rx_qty) {
          maxAllowed = Math.min(stockAvail, item.remaining_rx_qty);
        }

        if (newQty > maxAllowed) {
          toast.warning(
            `Cannot add more. Limit is ${maxAllowed} units (${item.remaining_rx_qty ? 'Prescription Remaining' : 'In Stock'}).`,
            'Limit Reached'
          );
          return prev;
        }

        const updated = [...prev];
        updated[existingIdx] = { ...item, quantity: newQty };
        toast.success(`Updated ${med.name} quantity to ${newQty}.`, 'Cart Updated');
        return updated;
      }

      // Add new cart line
      let maxAllowed = stockAvail;
      if (prescriptionItem) {
        maxAllowed = Math.min(stockAvail, prescriptionItem.remaining_quantity);
      }

      const clampedQty = Math.min(requestedQty, maxAllowed);
      if (clampedQty <= 0) {
        toast.warning(`Prescribed limit already reached for ${med.name}.`, 'Limit Reached');
        return prev;
      }

      // If prescription item has patient, auto-select patient in cart
      if (prescriptionItem?.patient_id) {
        setIsWalkIn(false);
        setSelectedPatientId(prescriptionItem.patient_id);
      }

      const newLine = {
        medicine_id: med.id,
        name: med.name,
        medicine_code: med.medicine_code,
        dosage_form: med.dosage_form || 'TABLET',
        strength: med.strength || '',
        unit_price: parseFloat(med.unit_price) || 0,
        quantity: clampedQty,
        stock_available: stockAvail,
        prescription_id: prescriptionItem?.rx_id || null,
        prescription_item_id: prescriptionItem?.item_id || null,
        rx_code: prescriptionItem?.prescription_code || null,
        patient_name: prescriptionItem?.patient_name || null,
        remaining_rx_qty: prescriptionItem?.remaining_quantity || null,
      };

      toast.success(`Added ${clampedQty}x ${med.name} to cart.`, 'Item Added');
      return [...prev, newLine];
    });
  };

  const updateCartQuantity = (index, delta) => {
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (!item) return prev;

      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        updated.splice(index, 1);
        toast.info(`Removed ${item.name} from cart.`, 'Item Removed');
        return updated;
      }

      let maxAllowed = item.stock_available;
      if (item.remaining_rx_qty) {
        maxAllowed = Math.min(item.stock_available, item.remaining_rx_qty);
      }

      if (newQty > maxAllowed) {
        toast.warning(`Cannot exceed available limit of ${maxAllowed} units.`, 'Limit Reached');
        return prev;
      }

      updated[index] = { ...item, quantity: newQty };
      return updated;
    });
  };

  const removeCartItem = (index) => {
    setCart((prev) => {
      const updated = [...prev];
      const removed = updated.splice(index, 1);
      if (removed[0]) {
        toast.info(`Removed ${removed[0].name} from cart.`, 'Item Removed');
      }
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    toast.info('Cart cleared.', 'Cart Reset');
  };

  // ─── COUNTER CHECKOUT SUBMISSION ────────────────────────────────
  const handleProceedCheckout = async () => {
    if (cart.length === 0) {
      toast.warning('Cart is empty. Please add medicines before checkout.', 'Empty Cart');
      return;
    }

    if (!isWalkIn && !selectedPatientId) {
      toast.warning('Please select a registered patient or switch to Walk-in customer.', 'Select Patient');
      return;
    }

    setIsSubmittingCheckout(true);
    setCheckoutError('');

    try {
      const payload = {
        patient_id: isWalkIn ? undefined : selectedPatientId,
        walk_in_name: isWalkIn ? (walkInName.trim() || 'Walk-in Customer') : undefined,
        items: cart.map((item) => ({
          medicine_id: item.medicine_id,
          quantity: item.quantity,
          prescription_id: item.prescription_id || undefined,
        })),
        payment_method: paymentMethod,
        notes: checkoutNotes.trim() || (isWalkIn ? `Counter Sale - ${walkInName || 'Walk-in'}` : `Pharmacy Counter Sale`),
      };

      const res = await pharmacistService.checkoutPurchase(payload);

      if (res.success && res.receipt) {
        toast.success(
          `Payment of ₹${parseFloat(res.receipt.amount).toFixed(2)} recorded. Receipt #${res.receipt.receipt_number} generated!`,
          'Checkout Complete'
        );
        setActiveReceipt(res.receipt);
        setIsReceiptModalOpen(true);
        setCart([]);
        setCheckoutNotes('');
        loadAllData(); // Refresh PostgreSQL inventory & history
      } else {
        throw new Error(res.error || 'Failed to complete checkout.');
      }
    } catch (err) {
      let msg = 'Checkout failed. Please verify medicine inventory and try again.';
      if (err.response?.data?.error) {
        msg = err.response.data.error;
      } else if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      } else if (err.message) {
        msg = err.message;
      }
      setCheckoutError(msg);
      toast.error(msg, 'Checkout Rejected');
    } finally {
      setIsSubmittingCheckout(false);
    }
  };

  // ─── BUY AGAIN WORKFLOW ─────────────────────────────────────────
  const handleBuyAgain = async (payment) => {
    try {
      let itemsToRebuy = payment.bill_items || [];

      // If bill_items not nested in payment, fetch bill details
      if (!itemsToRebuy || itemsToRebuy.length === 0) {
        if (payment.bill) {
          const billData = await pharmacistService.getBillDetails(payment.bill);
          itemsToRebuy = billData.items || [];
        }
      }

      if (!itemsToRebuy || itemsToRebuy.length === 0) {
        toast.warning('No medicine line items found on this previous invoice.', 'Cannot Rebuy');
        return;
      }

      let addedCount = 0;
      let outOfStockWarnings = [];

      itemsToRebuy.forEach((line) => {
        // Find corresponding medicine in current live database catalogue
        const matchedMed = medicines.find(
          (m) =>
            m.medicine_code === line.reference_id ||
            m.name.toLowerCase() === line.description?.toLowerCase() ||
            line.description?.toLowerCase().includes(m.name.toLowerCase())
        );

        if (!matchedMed) {
          outOfStockWarnings.push(`"${line.description}" was not found in current catalogue.`);
          return;
        }

        const liveStock = parseInt(matchedMed.stock_quantity, 10);
        if (liveStock <= 0) {
          outOfStockWarnings.push(`"${matchedMed.name}" is currently out of stock.`);
          return;
        }

        const qtyToAdd = Math.min(line.quantity || 1, liveStock);
        addToCart(matchedMed, null, qtyToAdd);
        addedCount += 1;
      });

      // Match patient if present
      if (payment.patient) {
        setIsWalkIn(false);
        setSelectedPatientId(payment.patient);
      } else if (payment.patient_name && payment.patient_name !== 'Walk-in Customer') {
        const foundPat = patients.find(
          (p) => `${p.first_name} ${p.last_name || ''}`.trim().toLowerCase() === payment.patient_name.toLowerCase()
        );
        if (foundPat) {
          setIsWalkIn(false);
          setSelectedPatientId(foundPat.id);
        } else {
          setIsWalkIn(true);
          setWalkInName(payment.patient_name);
        }
      }

      if (addedCount > 0) {
        setActiveTab('cart');
        toast.info(
          `Loaded ${addedCount} medicine item(s) from previous receipt #${payment.receipt_number} into cart. Please review and complete checkout.`,
          'Buy Again Active'
        );
      }

      if (outOfStockWarnings.length > 0) {
        toast.warning(outOfStockWarnings.join(' '), 'Some Items Unavailable');
      }
    } catch (err) {
      toast.error('Failed to load previous order items for Buy Again.', 'Buy Again Error');
    }
  };

  const handleOpenReceiptModal = (payment) => {
    setActiveReceipt(payment);
    setIsReceiptModalOpen(true);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Medicines Buying & Counter Payment</h1>
          <p className="admin-page-subtitle">
            Prescription suggestions, shop inventory catalogue, unified cart, counter checkout, and receipt generation
          </p>
        </div>
        <div className="admin-page-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            className={`admin-btn ${cart.length > 0 ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
            onClick={() => setActiveTab('cart')}
            style={{ position: 'relative' }}
          >
            <ShoppingCart size={16} />
            <span>Counter Cart</span>
            {cartTotals.totalItems > 0 && (
              <span
                style={{
                  background: '#f43f5e',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '999px',
                  padding: '2px 7px',
                  marginLeft: '4px',
                }}
              >
                {cartTotals.totalUnits}
              </span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} className="admin-alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Pharmacist Tabs */}
      <div className="admin-tabs" style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'shop' ? 'admin-tab-btn-active' : ''}`}
          onClick={() => setActiveTab('shop')}
        >
          <Boxes size={16} />
          <span>Shop Inventory Catalogue</span>
          <span className="admin-tab-count">{medicines.length}</span>
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'prescriptions' ? 'admin-tab-btn-active' : ''}`}
          onClick={() => setActiveTab('prescriptions')}
        >
          <ClipboardCheck size={16} />
          <span>Doctor-Prescribed Suggestions</span>
          <span className="admin-tab-count">{prescribedLines.length}</span>
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'cart' ? 'admin-tab-btn-active' : ''}`}
          onClick={() => setActiveTab('cart')}
        >
          <ShoppingCart size={16} />
          <span>Cart & Counter Checkout</span>
          {cartTotals.totalItems > 0 && (
            <span
              className="admin-tab-count"
              style={{ background: 'var(--primary-teal, #10b981)', color: '#ffffff' }}
            >
              {cartTotals.totalItems}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'history' ? 'admin-tab-btn-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Receipt size={16} />
          <span>Sales & Payment History</span>
          <span className="admin-tab-count">{payments.length}</span>
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="admin-loading-container" style={{ minHeight: '40vh' }}>
          <Loader2 size={36} className="admin-spinner" />
          <p className="admin-loading-text">Synchronizing pharmacy inventory and billing records...</p>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: SHOP INVENTORY CATALOGUE
         ───────────────────────────────────────────────────────────── */}
      {!loading && activeTab === 'shop' && (
        <section className="admin-card">
          <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Boxes size={18} style={{ color: '#06b6d4' }} />
              <h2 className="admin-card-title">Pharmacy Shop Catalogue</h2>
              <span className="admin-badge admin-badge-info">
                {filteredShopMedicines.length} Available
              </span>
            </div>

            {/* Search and Dosage Filter Controls */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
              <div className="admin-search-box" style={{ minWidth: '260px' }}>
                <Search size={16} className="admin-search-icon" />
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Search medicine name, code, brand..."
                  value={shopSearch}
                  onChange={(e) => setShopSearch(e.target.value)}
                />
                {shopSearch && (
                  <button
                    type="button"
                    className="admin-search-clear"
                    onClick={() => setShopSearch('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <select
                className="admin-select"
                style={{ width: '160px' }}
                value={shopDosageFilter}
                onChange={(e) => setShopDosageFilter(e.target.value)}
              >
                {DOSAGE_FORMS.map((df) => (
                  <option key={df.value} value={df.value}>
                    {df.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="admin-card-body" style={{ padding: 0 }}>
            {filteredShopMedicines.length === 0 ? (
              <div className="admin-empty-state" style={{ padding: '3rem' }}>
                <Pill size={44} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '0.75rem' }} />
                <p>No medicines matched your query.</p>
                <button
                  type="button"
                  className="admin-btn admin-btn-outline admin-btn-sm"
                  onClick={() => {
                    setShopSearch('');
                    setShopDosageFilter('ALL');
                  }}
                  style={{ marginTop: '0.75rem' }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Form & Strength</th>
                      <th>Batch & Expiry</th>
                      <th>Stock Level</th>
                      <th>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Counter Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShopMedicines.map((med) => {
                      const qty = parseInt(med.stock_quantity, 10) || 0;
                      const isOut = qty <= 0;
                      const isLow = qty > 0 && (med.is_low_stock || qty <= (med.reorder_level || 10));
                      const cartItem = cart.find((c) => c.medicine_id === med.id && !c.prescription_id);

                      return (
                        <tr key={med.id}>
                          <td>
                            <strong style={{ color: 'var(--text-primary, #f1f5f9)', fontSize: '0.95rem' }}>
                              {med.name}
                            </strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                              Code: <code>{med.medicine_code}</code>
                              {med.generic_name && ` • Generic: ${med.generic_name}`}
                            </div>
                          </td>
                          <td>
                            <span className="admin-badge admin-badge-info" style={{ marginRight: '0.35rem' }}>
                              {med.dosage_form}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #cbd5e1)' }}>
                              {med.strength || 'Standard'}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.85rem' }}>
                              {med.batch_number || 'Standard Batch'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                              Exp: {med.expiry_date || 'Not specified'}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: '0.95rem',
                                  color: isOut ? '#f43f5e' : isLow ? '#f59e0b' : '#10b981',
                                }}
                              >
                                {qty} units
                              </span>
                              {isOut ? (
                                <span className="admin-badge admin-badge-danger">Out of Stock</span>
                              ) : isLow ? (
                                <span className="admin-badge admin-badge-warning">Low</span>
                              ) : (
                                <span className="admin-badge admin-badge-success">Available</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <strong style={{ color: '#10b981', fontSize: '1rem' }}>
                              ₹{parseFloat(med.unit_price).toFixed(2)}
                            </strong>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isOut ? (
                              <button
                                type="button"
                                className="admin-btn admin-btn-sm admin-btn-outline"
                                disabled
                                style={{ opacity: 0.5 }}
                              >
                                Out of Stock
                              </button>
                            ) : cartItem ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                <button
                                  type="button"
                                  className="admin-btn admin-btn-sm admin-btn-secondary"
                                  onClick={() => addToCart(med, null, 1)}
                                  disabled={cartItem.quantity >= qty}
                                  title="Add one more"
                                >
                                  <Plus size={14} />
                                </button>
                                <span
                                  className="admin-badge admin-badge-primary"
                                  style={{ padding: '0.3rem 0.6rem' }}
                                >
                                  {cartItem.quantity} in cart
                                </span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="admin-btn admin-btn-sm admin-btn-primary"
                                onClick={() => addToCart(med, null, 1)}
                              >
                                <ShoppingCart size={14} />
                                <span>Add to Cart</span>
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
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: DOCTOR-PRESCRIBED SUGGESTIONS
         ───────────────────────────────────────────────────────────── */}
      {!loading && activeTab === 'prescriptions' && (
        <section className="admin-card">
          <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardCheck size={18} style={{ color: '#8b5cf6' }} />
              <h2 className="admin-card-title">Doctor-Prescribed Medicine Lines</h2>
              <span className="admin-badge admin-badge-info">
                {prescribedLines.length} Pending Allowance
              </span>
            </div>

            <div className="admin-search-box" style={{ minWidth: '300px', marginLeft: 'auto' }}>
              <Search size={16} className="admin-search-icon" />
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search patient, prescription ID, doctor, medicine..."
                value={rxSearch}
                onChange={(e) => setRxSearch(e.target.value)}
              />
              {rxSearch && (
                <button
                  type="button"
                  className="admin-search-clear"
                  onClick={() => setRxSearch('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="admin-card-body" style={{ padding: 0 }}>
            {prescribedLines.length === 0 ? (
              <div className="admin-empty-state" style={{ padding: '3rem' }}>
                <CheckCircle2 size={44} style={{ color: '#10b981', marginBottom: '0.75rem' }} />
                <p>No pending prescribed medicines requiring dispensing!</p>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary admin-btn-sm"
                  onClick={() => setActiveTab('shop')}
                  style={{ marginTop: '0.75rem' }}
                >
                  Browse Shop Inventory
                </button>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Patient & Prescription</th>
                      <th>Prescribing Doctor</th>
                      <th>Medicine & Regimen</th>
                      <th>Prescribed / Left</th>
                      <th>Inventory Stock</th>
                      <th>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Prescription Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescribedLines.map((line) => {
                      const isStockSufficient = line.current_stock >= line.remaining_quantity;
                      const isOutOfStock = line.current_stock <= 0;
                      const inCart = cart.find(
                        (c) => c.medicine_id === line.medicine_id && c.prescription_id === line.rx_id
                      );

                      return (
                        <tr key={`${line.rx_id}-${line.item_id}`}>
                          <td>
                            <strong style={{ color: 'var(--text-primary, #f1f5f9)', fontSize: '0.95rem' }}>
                              {line.patient_name}
                            </strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                              Rx: <code>{line.prescription_code}</code>
                              {line.diagnosis && ` • Dx: ${line.diagnosis}`}
                            </div>
                          </td>
                          <td>
                            <span>{line.doctor_name}</span>
                          </td>
                          <td>
                            <strong style={{ color: 'var(--primary-cyan, #06b6d4)' }}>
                              {line.medicine_name} {line.strength}
                            </strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #cbd5e1)' }}>
                              {line.dosage} • {line.frequency} ({line.duration})
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{line.remaining_quantity} units</span>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>
                              (Dispensed: {line.quantity_dispensed}/{line.quantity_prescribed})
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                fontWeight: 700,
                                color: isOutOfStock ? '#f43f5e' : !isStockSufficient ? '#f59e0b' : '#10b981',
                              }}
                            >
                              {line.current_stock} in stock
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: '#10b981' }}>
                              ₹{parseFloat(line.unit_price).toFixed(2)}
                            </strong>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {line.is_archived ? (
                              <button
                                type="button"
                                className="admin-btn admin-btn-sm admin-btn-outline"
                                disabled
                                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                title="Medicine is archived and unavailable for dispensation"
                              >
                                Archived / Unavailable
                              </button>
                            ) : isOutOfStock ? (
                              <button
                                type="button"
                                className="admin-btn admin-btn-sm admin-btn-outline"
                                disabled
                                style={{ opacity: 0.5 }}
                              >
                                Out of Stock
                              </button>
                            ) : inCart ? (
                              <span className="admin-badge admin-badge-success">
                                <Check size={12} />
                                <span>In Cart ({inCart.quantity})</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="admin-btn admin-btn-sm admin-btn-primary"
                                onClick={() => {
                                  const medObj = medicines.find((m) => m.id === line.medicine_id);
                                  if (medObj) {
                                    addToCart(medObj, line, line.remaining_quantity);
                                  }
                                }}
                              >
                                <Plus size={14} />
                                <span>Add Prescribed Qty</span>
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
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: CART & COUNTER CHECKOUT
         ───────────────────────────────────────────────────────────── */}
      {!loading && activeTab === 'cart' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {/* Left Column: Cart Items Table */}
          <section className="admin-card" style={{ gridColumn: 'span 2' }}>
            <div className="admin-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart size={18} style={{ color: '#10b981' }} />
                <h2 className="admin-card-title">Counter Cart Line Items</h2>
                <span className="admin-badge admin-badge-info">
                  {cartTotals.totalItems} Items ({cartTotals.totalUnits} Units)
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  className="admin-btn admin-btn-outline admin-btn-sm"
                  onClick={clearCart}
                >
                  <Trash2 size={14} />
                  <span>Clear Cart</span>
                </button>
              )}
            </div>

            <div className="admin-card-body" style={{ padding: 0 }}>
              {cart.length === 0 ? (
                <div className="admin-empty-state" style={{ padding: '3.5rem' }}>
                  <ShoppingCart size={44} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '0.75rem' }} />
                  <p>Your pharmacy counter cart is currently empty.</p>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary admin-btn-sm"
                      onClick={() => setActiveTab('shop')}
                    >
                      <Boxes size={14} />
                      <span>Browse Shop Catalogue</span>
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary admin-btn-sm"
                      onClick={() => setActiveTab('prescriptions')}
                    >
                      <ClipboardCheck size={14} />
                      <span>View Prescriptions</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Type / Source</th>
                        <th>Unit Price</th>
                        <th style={{ textAlign: 'center' }}>Quantity</th>
                        <th>Subtotal</th>
                        <th style={{ textAlign: 'right' }}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, idx) => {
                        const subtotal = item.quantity * item.unit_price;
                        return (
                          <tr key={`${item.medicine_id}-${item.prescription_id || 'otc'}`}>
                            <td>
                              <strong style={{ color: 'var(--text-primary, #f1f5f9)' }}>
                                {item.name}
                              </strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                                {item.dosage_form} • {item.strength || 'Standard'}
                              </div>
                            </td>
                            <td>
                              {item.prescription_id ? (
                                <div>
                                  <span className="admin-badge admin-badge-info">Prescribed Rx</span>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>
                                    {item.rx_code} ({item.patient_name})
                                  </div>
                                </div>
                              ) : (
                                <span className="admin-badge admin-badge-secondary">Counter / OTC</span>
                              )}
                            </td>
                            <td>
                              <span className="admin-font-mono">₹{item.unit_price.toFixed(2)}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  borderRadius: '6px',
                                  padding: '2px 6px',
                                }}
                              >
                                <button
                                  type="button"
                                  className="admin-btn admin-btn-sm admin-btn-outline"
                                  style={{ padding: '2px 6px', minWidth: '24px', height: '24px' }}
                                  onClick={() => updateCartQuantity(idx, -1)}
                                  title="Decrease quantity"
                                >
                                  <Minus size={12} />
                                </button>
                                <span
                                  className="admin-font-mono"
                                  style={{ fontWeight: 700, minWidth: '24px', textAlign: 'center' }}
                                >
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  className="admin-btn admin-btn-sm admin-btn-outline"
                                  style={{ padding: '2px 6px', minWidth: '24px', height: '24px' }}
                                  onClick={() => updateCartQuantity(idx, 1)}
                                  title="Increase quantity"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </td>
                            <td>
                              <strong style={{ color: '#10b981' }} className="admin-font-mono">
                                ₹{subtotal.toFixed(2)}
                              </strong>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="admin-btn admin-btn-sm admin-btn-danger"
                                style={{ padding: '4px 8px' }}
                                onClick={() => removeCartItem(idx)}
                                title="Remove item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Right Column: Checkout & Billing Panel */}
          <section className="admin-card">
            <div className="admin-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Receipt size={18} style={{ color: '#06b6d4' }} />
                <h2 className="admin-card-title">Counter Billing & Settlement</h2>
              </div>
            </div>

            <div className="admin-card-body">
              {checkoutError && (
                <div className="admin-alert admin-alert-danger" style={{ marginBottom: '1rem' }}>
                  <AlertCircle size={16} className="admin-alert-icon" />
                  <span style={{ fontSize: '0.85rem' }}>{checkoutError}</span>
                </div>
              )}

              {/* Patient Selector */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Patient Classification
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    className={`admin-btn admin-btn-sm ${isWalkIn ? 'admin-btn-primary' : 'admin-btn-outline'}`}
                    onClick={() => {
                      setIsWalkIn(true);
                      setSelectedPatientId('');
                    }}
                    style={{ flex: 1 }}
                  >
                    Walk-in Customer
                  </button>
                  <button
                    type="button"
                    className={`admin-btn admin-btn-sm ${!isWalkIn ? 'admin-btn-primary' : 'admin-btn-outline'}`}
                    onClick={() => setIsWalkIn(false)}
                    style={{ flex: 1 }}
                  >
                    Registered Patient
                  </button>
                </div>

                {isWalkIn ? (
                  <div>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Walk-in Customer Name"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                    />
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Type patient name, UHID, or phone..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      style={{ marginBottom: '0.5rem' }}
                    />
                    <select
                      className="form-input"
                      value={selectedPatientId}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                    >
                      <option value="">-- Choose Registered Patient --</option>
                      {filteredPatients.map((pat) => (
                        <option key={pat.id} value={pat.id}>
                          {pat.first_name} {pat.last_name || ''} ({pat.patient_id} • {pat.phone_number})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Payment Mode Selector */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Payment Method
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.5rem',
                  }}
                >
                  {[
                    { mode: 'CASH', label: 'Cash Payment', icon: Banknote },
                    { mode: 'UPI', label: 'UPI / QR Code', icon: QrCode },
                    { mode: 'CARD', label: 'Debit / Credit Card', icon: CreditCard },
                    { mode: 'NET_BANKING', label: 'Net Banking', icon: Building },
                  ].map((pm) => {
                    const Icon = pm.icon;
                    const isSelected = paymentMethod === pm.mode;
                    return (
                      <button
                        key={pm.mode}
                        type="button"
                        className={`admin-btn admin-btn-sm ${isSelected ? 'admin-btn-primary' : 'admin-btn-outline'}`}
                        onClick={() => setPaymentMethod(pm.mode)}
                        style={{ justifyContent: 'flex-start', padding: '0.55rem 0.75rem' }}
                      >
                        <Icon size={15} />
                        <span>{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Counter Remarks */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Notes / Instructions</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Counter dispense directions, billing remark"
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                />
              </div>

              {/* Financial Breakdown */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Total Medicine Items:</span>
                  <span className="admin-font-mono" style={{ fontWeight: 600 }}>{cartTotals.totalItems}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Total Dosage Units:</span>
                  <span className="admin-font-mono" style={{ fontWeight: 600 }}>{cartTotals.totalUnits}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Applicable GST:</span>
                  <span className="admin-font-mono" style={{ color: '#10b981' }}>Included (5%)</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    paddingTop: '0.75rem',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>Total Payable:</span>
                  <span
                    className="admin-font-mono"
                    style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981' }}
                  >
                    ₹{cartTotals.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Checkout Action Button */}
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 700 }}
                onClick={handleProceedCheckout}
                disabled={isSubmittingCheckout || cart.length === 0}
              >
                {isSubmittingCheckout ? (
                  <>
                    <Loader2 size={18} className="admin-spinner" />
                    <span>Processing Counter Checkout...</span>
                  </>
                ) : (
                  <>
                    <Receipt size={18} />
                    <span>Record Payment & Issue Receipt</span>
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: SALES & PAYMENT HISTORY (WITH BUY AGAIN)
         ───────────────────────────────────────────────────────────── */}
      {!loading && activeTab === 'history' && (
        <section className="admin-card">
          <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Receipt size={18} style={{ color: '#10b981' }} />
              <h2 className="admin-card-title">Pharmacy Sales & Counter Receipts History</h2>
              <span className="admin-badge admin-badge-info">
                {filteredPayments.length} Completed Transactions
              </span>
            </div>

            <div className="admin-search-box" style={{ minWidth: '320px', marginLeft: 'auto' }}>
              <Search size={16} className="admin-search-icon" />
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search receipt #, bill #, patient name, payment mode..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
              {historySearch && (
                <button
                  type="button"
                  className="admin-search-clear"
                  onClick={() => setHistorySearch('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="admin-card-body" style={{ padding: 0 }}>
            {filteredPayments.length === 0 ? (
              <div className="admin-empty-state" style={{ padding: '3.5rem' }}>
                <Receipt size={44} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '0.75rem' }} />
                <p>No transaction receipts matched your search.</p>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Receipt Voucher</th>
                      <th>Patient Name</th>
                      <th>Invoice Ref</th>
                      <th>Payment Mode</th>
                      <th>Amount Paid</th>
                      <th>Transaction Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((pay) => (
                      <tr key={pay.id}>
                        <td>
                          <strong style={{ color: 'var(--primary-cyan, #06b6d4)' }} className="admin-font-mono">
                            {pay.receipt_number}
                          </strong>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{pay.patient_name || 'Walk-in Customer'}</span>
                        </td>
                        <td>
                          <code style={{ fontSize: '0.85rem' }}>{pay.bill_number}</code>
                        </td>
                        <td>
                          <span className="admin-badge admin-badge-info">
                            {pay.payment_method}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: '#10b981' }} className="admin-font-mono">
                            ₹{parseFloat(pay.amount).toFixed(2)}
                          </strong>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)' }}>
                          {pay.payment_date ? new Date(pay.payment_date).toLocaleString() : '—'}
                        </td>
                        <td>
                          <span className="admin-badge admin-badge-success">Paid</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-secondary"
                              onClick={() => handleOpenReceiptModal(pay)}
                              title="View & Print Official Receipt"
                            >
                              <Printer size={13} />
                              <span>Receipt</span>
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-sm admin-btn-primary"
                              onClick={() => handleBuyAgain(pay)}
                              title="Reorder these medicines for counter checkout"
                            >
                              <RotateCcw size={13} />
                              <span>Buy Again</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          OFFICIAL PRINTABLE RECEIPT MODAL
         ───────────────────────────────────────────────────────────── */}
      {isReceiptModalOpen && activeReceipt && (
        <ModalPortal>
          <div className="admin-modal-backdrop" onClick={() => setIsReceiptModalOpen(false)}>
            <div
              className="admin-modal-container receipt-modal-card"
              style={{ maxWidth: '750px', width: '92%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-modal-header no-print">
                <div className="admin-modal-title-box">
                  <div
                    className="admin-stat-icon-wrapper"
                    style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#10b981' }}
                  >
                    <Receipt size={20} />
                  </div>
                  <div>
                    <h3 className="admin-modal-title">Official Pharmacy Counter Receipt</h3>
                    <p className="admin-modal-subtitle">
                      Voucher #{activeReceipt.receipt_number} • Authenticated Transaction
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setIsReceiptModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Printable Receipt Area */}
              <div className="admin-modal-body printable-receipt-area" id="printable-receipt">
                <div className="receipt-paper-surface careflow-receipt-wrapper">
                  {/* Hospital Header Banner */}
                  <div className="receipt-header-banner">
                    <div className="receipt-brand-mark">
                      <div className="receipt-cross-emblem">+</div>
                      <div>
                        <div className="receipt-hospital-title">CAREFLOW HOSPITAL & RESEARCH CENTRE</div>
                        <div className="receipt-hospital-subtitle">Department of Clinical Pharmacy & Pharmaceuticals</div>
                        <div className="receipt-hospital-address">
                          Plot 14, Health City, Sector 62 • Pharmacy Counter 02 • Ph: +91 800 227 3356
                        </div>
                      </div>
                    </div>
                    <div className="receipt-badge-col">
                      <div className="receipt-official-pill">OFFICIAL COUNTER RECEIPT</div>
                      <div className="receipt-gstin-tag">GSTIN: 29AAAAA0000A1Z5</div>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="receipt-meta-box">
                    <div>
                      <div className="receipt-meta-field">
                        <span className="receipt-meta-label">Receipt Voucher:</span>
                        <span className="receipt-meta-val admin-font-mono" style={{ color: '#06b6d4', fontWeight: 700 }}>
                          {activeReceipt.receipt_number}
                        </span>
                      </div>
                      <div className="receipt-meta-field">
                        <span className="receipt-meta-label">Invoice Reference:</span>
                        <span className="receipt-meta-val admin-font-mono">
                          {activeReceipt.bill_number || 'CF-INV-COUNTER'}
                        </span>
                      </div>
                      <div className="receipt-meta-field">
                        <span className="receipt-meta-label">Date & Time:</span>
                        <span className="receipt-meta-val">
                          {activeReceipt.payment_date?.replace('T', ' ').slice(0, 19) || new Date().toLocaleString()}
                        </span>
                      </div>
                      <div className="receipt-meta-field">
                        <span className="receipt-meta-label">Dispensing Desk:</span>
                        <span className="receipt-meta-val">Pharmacy Counter 02</span>
                      </div>
                    </div>

                    <div>
                      <div className="receipt-meta-field">
                        <span className="receipt-meta-label">Patient / Customer:</span>
                        <span className="receipt-meta-val" style={{ fontWeight: 600 }}>
                          {activeReceipt.patient_name || 'Walk-in Customer'}
                        </span>
                      </div>
                      <div className="receipt-meta-field">
                        <span className="receipt-meta-label">Payment Mode:</span>
                        <span className="receipt-meta-val" style={{ textTransform: 'uppercase', fontWeight: 600 }}>
                          {activeReceipt.payment_method || 'CASH'}
                        </span>
                      </div>
                      <div className="receipt-meta-field">
                        <span className="receipt-meta-label">Cashier / Staff:</span>
                        <span className="receipt-meta-val">
                          {activeReceipt.received_by_name || 'Authorized Pharmacist'}
                        </span>
                      </div>
                      <div className="receipt-meta-field">
                        <span className="receipt-meta-label">Transaction Ref:</span>
                        <span className="receipt-meta-val admin-font-mono" style={{ fontSize: '0.8rem' }}>
                          {activeReceipt.transaction_reference || 'COUNTER-CASH'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Purchased Items Table */}
                  <div className="receipt-table-container">
                    <table className="receipt-items-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>#</th>
                          <th>Medicine Formulation & Description</th>
                          <th style={{ width: '80px', textAlign: 'center' }}>Qty</th>
                          <th style={{ width: '110px', textAlign: 'right' }}>Unit Price</th>
                          <th style={{ width: '120px', textAlign: 'right' }}>Subtotal (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(activeReceipt.bill_items) && activeReceipt.bill_items.length > 0 ? (
                          activeReceipt.bill_items.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td style={{ color: 'var(--text-muted, #94a3b8)' }}>{idx + 1}</td>
                              <td>
                                <strong>{item.description}</strong>
                                {item.reference_id && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>
                                    Item Code: {item.reference_id}
                                  </span>
                                )}
                              </td>
                              <td className="admin-font-mono" style={{ textAlign: 'center' }}>
                                {item.quantity}
                              </td>
                              <td className="admin-font-mono" style={{ textAlign: 'right' }}>
                                ₹{parseFloat(item.unit_price).toFixed(2)}
                              </td>
                              <td className="admin-font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                                ₹{parseFloat(item.subtotal).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td style={{ color: 'var(--text-muted, #94a3b8)' }}>1</td>
                            <td>
                              <strong>{activeReceipt.notes || 'Medication Dispensation & Pharmacy Services'}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', display: 'block' }}>
                                Voucher Ref: {activeReceipt.receipt_number}
                              </span>
                            </td>
                            <td className="admin-font-mono" style={{ textAlign: 'center' }}>1</td>
                            <td className="admin-font-mono" style={{ textAlign: 'right' }}>
                              ₹{parseFloat(activeReceipt.amount).toFixed(2)}
                            </td>
                            <td className="admin-font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                              ₹{parseFloat(activeReceipt.amount).toFixed(2)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals & Words Panel */}
                  <div className="receipt-totals-panel">
                    <div className="receipt-words-block">
                      <span className="receipt-words-label">Amount in Words:</span>
                      <span className="receipt-words-val">
                        {numberToWordsRupees(activeReceipt.amount)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: '0.35rem' }}>
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

                  {/* Legal notice & Seal */}
                  <div className="receipt-footer-auth">
                    <div className="receipt-terms">
                      <strong>Important Terms & Guidelines:</strong>
                      <div>1. Dispensed pharmaceuticals are non-returnable as per Drugs and Cosmetics Act.</div>
                      <div>2. Verify tablet seal, expiry date, and dosage instructions before consumption.</div>
                      <div>3. Retain this verified receipt for insurance claims and tax compliance.</div>
                    </div>
                    <div className="receipt-auth-signature">
                      <div className="receipt-seal-badge">
                        CAREFLOW PHARMACY<br />VERIFIED & DISPENSED
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>
                        System-Generated Official Receipt<br />
                        Valid without physical signature
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
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
                  <span>Print Official Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default PharmacistBuyingPaymentPage;
