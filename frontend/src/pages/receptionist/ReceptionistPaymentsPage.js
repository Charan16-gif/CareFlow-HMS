import React, { useState, useEffect, useMemo, useCallback } from 'react';
import receptionistService from '../../services/receptionistService';
import ModalPortal from '../../components/common/ModalPortal';
import {
  CreditCard,
  Search,
  Eye,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  FileText,
  DollarSign,
  Printer,
  Plus,
  Trash2,
  Receipt,
  Check,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

const ReceptionistPaymentsPage = () => {
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  // Filtering
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedBill, setSelectedBill] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCreateBillModalOpen, setIsCreateBillModalOpen] = useState(false);

  // Record Payment form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Create Bill form state
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [billDiscount, setBillDiscount] = useState('0');
  const [billNotes, setBillNotes] = useState('');
  const [billItems, setBillItems] = useState([
    { item_type: 'CONSULTATION', description: 'Doctor Outpatient Consultation Fee', quantity: 1, unit_price: '500.00' },
  ]);
  const [patientSearch, setPatientSearch] = useState('');
  const [submittingBill, setSubmittingBill] = useState(false);

  const fetchBillsAndLookups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [billsData, ptsData, apptsData, rxData] = await Promise.all([
        receptionistService.getBills(),
        receptionistService.getPatients({ page_size: 100 }),
        receptionistService.getAppointments({ page_size: 100 }),
        typeof receptionistService.getPrescriptions === 'function'
          ? receptionistService.getPrescriptions({ page_size: 100 }).catch(() => [])
          : Promise.resolve([]),
      ]);
      setBills(Array.isArray(billsData) ? billsData : (billsData.results || []));
      setPatients(Array.isArray(ptsData) ? ptsData : (ptsData.results || []));
      setAppointments(Array.isArray(apptsData) ? apptsData : (apptsData.results || []));
      setPrescriptions(Array.isArray(rxData) ? rxData : (rxData?.results || []));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load billing records from hospital database.');
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Billing & Payments — CareFlow HMS Receptionist';
    fetchBillsAndLookups();
  }, [fetchBillsAndLookups]);

  // Lock body scroll when modal is open
  useEffect(() => {
    const isAnyModalOpen = isReceiptModalOpen || isPaymentModalOpen || isCreateBillModalOpen;
    document.body.style.overflow = isAnyModalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isReceiptModalOpen, isPaymentModalOpen, isCreateBillModalOpen]);

  // Financial summary
  const summary = useMemo(() => {
    let totalInvoiced = 0;
    let totalCollected = 0;
    let outstanding = 0;
    let paidCount = 0;

    bills.forEach((b) => {
      const net = parseFloat(b.net_amount || b.total_amount || 0);
      const paid = parseFloat(b.paid_amount || 0);
      const due = parseFloat(b.balance_due || (net - paid) || 0);
      totalInvoiced += net;
      totalCollected += paid;
      outstanding += due;
      if (b.status === 'PAID') paidCount++;
    });

    return {
      totalInvoiced,
      totalCollected,
      outstanding,
      paidCount,
      totalCount: bills.length,
    };
  }, [bills]);

  // Filtered bills
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (b.items && b.items.some((it) => it.item_type === 'MEDICINE')) {
        return false;
      }
      if (activeTab !== 'ALL' && b.status !== activeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const billNum = (b.bill_number || '').toLowerCase();
        const patName = (b.patient_name || '').toLowerCase();
        const idStr = String(b.id || '');
        const apptStr = String(b.appointment || '');
        if (!billNum.includes(q) && !patName.includes(q) && !idStr.includes(q) && !apptStr.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [bills, activeTab, searchQuery]);

  // Filter eligible patients who have BOTH booked an appointment AND have a prescription created,
  // AND have not already had a bill created for all their prescriptions (bill can only be generated once).
  const eligiblePatients = useMemo(() => {
    const aptPatientIds = new Set(
      appointments
        .filter((a) => a.status !== 'CANCELLED')
        .map((a) => a.patient_details?.id || a.patient)
        .filter(Boolean)
        .map(String)
    );

    const billedApptIds = new Set(
      bills
        .filter((b) => b.status !== 'CANCELLED' && b.appointment)
        .map((b) => String(b.appointment))
    );

    const patientHasUnbilledRx = new Set();
    prescriptions
      .filter((rx) => rx.status !== 'CANCELLED')
      .forEach((rx) => {
        const pid = String(rx.patient_details?.id || rx.patient);
        if (!pid) return;
        const apptId = rx.appointment ? String(rx.appointment) : null;
        if (apptId && billedApptIds.has(apptId)) {
          return;
        }
        const rxTime = rx.created_at ? new Date(rx.created_at).getTime() : 0;
        const hasBillAfter = bills.some((b) => {
          if (b.status === 'CANCELLED') return false;
          if (b.items && b.items.some((it) => it.item_type === 'MEDICINE')) return false;
          const bPid = String(b.patient_details?.id || b.patient);
          if (bPid !== pid) return false;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime >= rxTime;
        });
        if (!hasBillAfter) {
          patientHasUnbilledRx.add(pid);
        }
      });

    return patients.filter((p) => {
      const pid = String(p.id);
      if (p.can_generate_bill !== undefined) {
        return p.can_generate_bill;
      }
      const hasAppt = p.has_booked_appointment !== undefined ? p.has_booked_appointment : aptPatientIds.has(pid);
      return hasAppt && patientHasUnbilledRx.has(pid);
    });
  }, [patients, appointments, prescriptions, bills]);

  // Filtered patients for Create Bill modal dropdown
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return eligiblePatients.slice(0, 20);
    const q = patientSearch.toLowerCase();
    return eligiblePatients.filter((p) => {
      const name = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
      const phone = (p.phone_number || '').toLowerCase();
      const id = String(p.id);
      return name.includes(q) || phone.includes(q) || id.includes(q);
    }).slice(0, 25);
  }, [eligiblePatients, patientSearch]);

  // Appointments for currently selected patient (only unbilled appointments with a doctor-created prescription)
  const patientAppointments = useMemo(() => {
    if (!selectedPatientId) return [];
    const billedApptIds = new Set(
      bills
        .filter((b) => b.status !== 'CANCELLED' && b.appointment)
        .map((b) => String(b.appointment))
    );
    const apptIdsWithRx = new Set(
      prescriptions
        .filter((rx) => rx.status !== 'CANCELLED' && rx.appointment)
        .map((rx) => String(rx.appointment))
    );
    return appointments.filter(
      (a) =>
        String(a.patient_details?.id || a.patient) === String(selectedPatientId) &&
        a.status !== 'CANCELLED' &&
        !billedApptIds.has(String(a.id)) &&
        apptIdsWithRx.has(String(a.id))
    );
  }, [appointments, selectedPatientId, bills, prescriptions]);

  // Auto-select appointment when patient has an eligible unbilled appointment
  useEffect(() => {
    if (selectedPatientId && patientAppointments.length > 0 && !selectedAppointmentId) {
      setSelectedAppointmentId(String(patientAppointments[0].id));
    }
  }, [selectedPatientId, patientAppointments, selectedAppointmentId]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <span className="dash-badge badge-success">Fully Paid</span>;
      case 'PARTIALLY_PAID':
        return <span className="dash-badge badge-warning">Partial</span>;
      case 'UNPAID':
        return <span className="dash-badge badge-danger">Unpaid</span>;
      case 'CANCELLED':
        return <span className="dash-badge badge-neutral">Cancelled</span>;
      default:
        return <span className="dash-badge badge-neutral">{status}</span>;
    }
  };

  // Open Receipt Modal
  const handleOpenReceipt = (bill) => {
    setSelectedBill(bill);
    setIsReceiptModalOpen(true);
  };

  // Open Record Payment Modal
  const handleOpenPayment = (bill) => {
    if (bill.items && bill.items.some((it) => it.item_type === 'MEDICINE')) {
      toast.error('Receptionists are not permitted to collect payments for pharmacy/medicine bills.', 'Restricted Action');
      return;
    }
    setSelectedBill(bill);
    const due = parseFloat(bill.balance_due || 0);
    setPaymentAmount(due > 0 ? due.toFixed(2) : '0.00');
    setPaymentMethod('CASH');
    setTransactionRef('');
    setPaymentNotes('');
    setActionErrorMsg('');
    setIsPaymentModalOpen(true);
  };

  // Submit Payment
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setActionErrorMsg('');
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setActionErrorMsg('Please enter a valid payment amount greater than zero.');
      return;
    }
    const due = parseFloat(selectedBill.balance_due || 0);
    if (amt > due) {
      setActionErrorMsg(`Payment amount cannot exceed the balance due of ₹${due.toFixed(2)}.`);
      return;
    }

    try {
      setSubmittingPayment(true);
      await receptionistService.recordPayment({
        bill: selectedBill.id,
        amount: amt,
        payment_method: paymentMethod,
        transaction_reference: transactionRef.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      });

      setIsPaymentModalOpen(false);
      const succ = `Payment of ₹${amt.toFixed(2)} recorded for Invoice ${selectedBill.bill_number}!`;
      toast.success(succ, 'Payment Recorded');
      fetchBillsAndLookups();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.amount?.[0] || 'Failed to record payment.';
      const errStr = typeof msg === 'string' ? msg : JSON.stringify(msg);
      setActionErrorMsg(errStr);
      toast.error(errStr, 'Payment Failed');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Open Create Bill Modal
  const handleOpenCreateBill = () => {
    setSelectedPatientId('');
    setSelectedAppointmentId('');
    setBillDiscount('0');
    setBillNotes('');
    setPatientSearch('');
    setBillItems([
      { item_type: 'CONSULTATION', description: 'Doctor Outpatient Consultation Fee', quantity: 1, unit_price: '500.00' },
    ]);
    setActionErrorMsg('');
    setIsCreateBillModalOpen(true);
  };

  // Line item helpers
  const handleAddItem = () => {
    setBillItems([
      ...billItems,
      { item_type: 'LAB_TEST', description: 'Laboratory Diagnostic Test Fee', quantity: 1, unit_price: '300.00' },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (billItems.length <= 1) return;
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...billItems];
    updated[index][field] = value;
    setBillItems(updated);
  };

  // Calculated total for new bill
  const calculatedGrossTotal = useMemo(() => {
    return billItems.reduce((acc, item) => {
      const qty = parseInt(item.quantity, 10) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return acc + (qty * price);
    }, 0);
  }, [billItems]);

  const calculatedNetTotal = useMemo(() => {
    const disc = parseFloat(billDiscount) || 0;
    return Math.max(0, calculatedGrossTotal - disc);
  }, [calculatedGrossTotal, billDiscount]);

  // Submit Create Bill
  const handleCreateBillSubmit = async (e) => {
    e.preventDefault();
    setActionErrorMsg('');
    if (!selectedPatientId) {
      setActionErrorMsg('Please select a patient for this invoice.');
      return;
    }
    if (billItems.length === 0) {
      setActionErrorMsg('Please include at least one billable hospital service.');
      return;
    }

    try {
      setSubmittingBill(true);
      await receptionistService.createBill({
        patient: selectedPatientId,
        appointment: selectedAppointmentId ? parseInt(selectedAppointmentId, 10) : undefined,
        discount_amount: parseFloat(billDiscount) || 0,
        notes: billNotes.trim() || undefined,
        bill_items: billItems.map((item) => ({
          item_type: item.item_type,
          description: item.description,
          quantity: parseInt(item.quantity, 10) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
        })),
      });

      setIsCreateBillModalOpen(false);
      const succ = 'New hospital billing invoice generated successfully!';
      toast.success(succ, 'Invoice Created');
      fetchBillsAndLookups();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.non_field_errors?.[0] || 'Failed to generate invoice.';
      const errStr = typeof msg === 'string' ? msg : JSON.stringify(msg);
      setActionErrorMsg(errStr);
      toast.error(errStr, 'Billing Error');
    } finally {
      setSubmittingBill(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receptionist-page">
      {/* Page Header */}
      <div className="dash-header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dash-title" style={{ margin: 0 }}>Billing & Payment Management</h1>
          <p className="dash-subtitle" style={{ margin: '0.25rem 0 0' }}>
            Generate outpatient invoices, record incoming patient payments, track balances, and issue verified hospital receipts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="dash-btn dash-btn-primary"
            onClick={handleOpenCreateBill}
            id="receptionist-generate-bill-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            <span>Generate New Bill</span>
          </button>
        </div>
      </div>



      {/* Financial Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="dash-stat-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase' }}>Total Invoiced</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 700, marginTop: '0.25rem' }}>
                ₹{summary.totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              <FileText size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.65, marginTop: '0.5rem' }}>{summary.totalCount} total bills issued</div>
        </div>

        <div className="dash-stat-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase' }}>Amount Collected</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 700, marginTop: '0.25rem', color: '#10b981' }}>
                ₹{summary.totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.65, marginTop: '0.5rem' }}>Received & cleared</div>
        </div>

        <div className="dash-stat-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase' }}>Outstanding Due</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 700, marginTop: '0.25rem', color: '#ef4444' }}>
                ₹{summary.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              <DollarSign size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.65, marginTop: '0.5rem' }}>Pending patient payments</div>
        </div>

        <div className="dash-stat-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase' }}>Settled Invoices</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 700, marginTop: '0.25rem' }}>{summary.paidCount}</div>
            </div>
            <div style={{ padding: '0.65rem', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
              <CreditCard size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.65, marginTop: '0.5rem' }}>Fully paid accounts</div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="dash-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              className={`dash-btn ${activeTab === 'ALL' ? 'dash-btn-primary' : 'dash-btn-secondary'}`}
              onClick={() => setActiveTab('ALL')}
              style={{ fontSize: '0.85rem' }}
            >
              All Invoices ({bills.length})
            </button>
            <button
              className={`dash-btn ${activeTab === 'UNPAID' ? 'dash-btn-primary' : 'dash-btn-secondary'}`}
              onClick={() => setActiveTab('UNPAID')}
              style={{ fontSize: '0.85rem' }}
            >
              Unpaid
            </button>
            <button
              className={`dash-btn ${activeTab === 'PARTIALLY_PAID' ? 'dash-btn-primary' : 'dash-btn-secondary'}`}
              onClick={() => setActiveTab('PARTIALLY_PAID')}
              style={{ fontSize: '0.85rem' }}
            >
              Partially Paid
            </button>
            <button
              className={`dash-btn ${activeTab === 'PAID' ? 'dash-btn-primary' : 'dash-btn-secondary'}`}
              onClick={() => setActiveTab('PAID')}
              style={{ fontSize: '0.85rem' }}
            >
              Fully Paid ({summary.paidCount})
            </button>
          </div>

          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input
              type="text"
              className="dash-input"
              placeholder="Search invoice #, patient, appt ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%', fontSize: '0.9rem' }}
            />
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.7 }}>
            <Loader2 size={32} className="spin-icon" style={{ margin: '0 auto 0.75rem' }} />
            <p>Loading hospital billing ledger...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 0.75rem' }} />
            <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
          </div>
        ) : filteredBills.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', opacity: 0.7 }}>
            <FileText size={42} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>No Billing Records Found</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {searchQuery ? 'No invoices match your search query.' : 'No invoices in the selected status.'}
            </p>
          </div>
        ) : (
          <div className="dash-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="dash-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Invoice #</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Patient Name</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>Appt Ref</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Total (₹)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Paid (₹)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Balance Due (₹)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill) => {
                  const net = parseFloat(bill.net_amount || bill.total_amount || 0);
                  const paid = parseFloat(bill.paid_amount || 0);
                  const due = parseFloat(bill.balance_due || 0);
                  const canCollectPayment = due > 0 && bill.status !== 'CANCELLED';

                  return (
                    <tr key={bill.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                        <div style={{ color: '#0ea5e9' }}>{bill.bill_number}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                          {bill.created_at ? new Date(bill.created_at).toLocaleDateString() : '—'}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600 }}>{bill.patient_name || 'Patient'}</div>
                        <div style={{ fontSize: '0.78rem', opacity: 0.65 }}>
                          {bill.patient_id_code ? `ID: ${bill.patient_id_code}` : 'Registered Patient'}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {bill.appointment ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span className="dash-badge badge-neutral" style={{ fontSize: '0.8rem' }}>
                              {bill.appointment_code || 'Consultation'}
                            </span>
                            {bill.doctor_name && (
                              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                {bill.doctor_name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Direct Service</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 600 }}>
                        ₹{net.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                        ₹{paid.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: due > 0 ? '#ef4444' : 'inherit', fontWeight: 600 }}>
                        ₹{due.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {getStatusBadge(bill.status)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          {canCollectPayment && (
                            <button
                              className="dash-btn dash-btn-success"
                              onClick={() => handleOpenPayment(bill)}
                              title="Collect Payment from Patient"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <DollarSign size={14} />
                              <span>Collect</span>
                            </button>
                          )}
                          <button
                            className="dash-btn dash-btn-secondary"
                            onClick={() => handleOpenReceipt(bill)}
                            title="View Invoice & Receipt Breakdown"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <Eye size={14} />
                            <span>Receipt</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODAL: COLLECT / RECORD PAYMENT ─── */}
      {isPaymentModalOpen && selectedBill && (
        <ModalPortal>
          <div className="dash-modal-overlay" onClick={() => !submittingPayment && setIsPaymentModalOpen(false)}>
            <div className="dash-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '92%' }}>
              <div className="dash-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Receipt size={20} style={{ color: '#10b981' }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Collect Patient Payment</h3>
                    <div style={{ fontSize: '0.78rem', opacity: 0.65 }}>Invoice: {selectedBill.bill_number}</div>
                  </div>
                </div>
                <button className="dash-btn-icon" onClick={() => !submittingPayment && setIsPaymentModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
                <div className="dash-modal-body" style={{ padding: '1.5rem', overflowY: 'auto', flex: '1 1 auto', minHeight: 0, maxHeight: 'calc(100vh - 12rem)' }}>
                  {actionErrorMsg && (
                    <div className="dash-alert dash-alert-danger" style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                      {actionErrorMsg}
                    </div>
                  )}

                  {/* Bill Summary Banner */}
                  <div className="dash-card" style={{ padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ opacity: 0.7 }}>Patient:</span>
                      <strong>{selectedBill.patient_name || 'Patient'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ opacity: 0.7 }}>Total Invoiced:</span>
                      <span>₹{parseFloat(selectedBill.net_amount || selectedBill.total_amount || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ opacity: 0.7 }}>Already Paid:</span>
                      <span style={{ color: '#10b981' }}>₹{parseFloat(selectedBill.paid_amount || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.35rem', fontWeight: 700 }}>
                      <span style={{ color: '#ef4444' }}>Outstanding Balance:</span>
                      <span style={{ color: '#ef4444' }}>₹{parseFloat(selectedBill.balance_due || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Amount to Collect */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label className="dash-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Amount to Collect (₹) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={parseFloat(selectedBill.balance_due || 0)}
                      className="dash-input"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      required
                    />
                    <div style={{ fontSize: '0.78rem', opacity: 0.65, marginTop: '0.25rem' }}>
                      Default is full balance. Partial amounts are supported.
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label className="dash-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Payment Method <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      className="dash-input"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      required
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                      <option value="CARD">Credit / Debit Card</option>
                      <option value="NET_BANKING">Net Banking</option>
                      <option value="INSURANCE">Health Insurance</option>
                    </select>
                  </div>

                  {/* Transaction Reference */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label className="dash-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Transaction Reference / UTR {paymentMethod !== 'CASH' && <span style={{ opacity: 0.7 }}>(Recommended)</span>}
                    </label>
                    <input
                      type="text"
                      className="dash-input"
                      placeholder="e.g., UPI-Ref / Card Auth Code / Bank UTR"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                    />
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label className="dash-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Payment Notes
                    </label>
                    <input
                      type="text"
                      className="dash-input"
                      placeholder="e.g., Collected at front desk reception"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="dash-modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="dash-btn dash-btn-secondary"
                    onClick={() => setIsPaymentModalOpen(false)}
                    disabled={submittingPayment}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="dash-btn dash-btn-success"
                    disabled={submittingPayment || !paymentAmount}
                  >
                    {submittingPayment ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Loader2 size={16} className="spin-icon" />
                        <span>Recording...</span>
                      </span>
                    ) : (
                      'Confirm & Collect Payment'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ─── MODAL: GENERATE NEW BILL ─── */}
      {isCreateBillModalOpen && (
        <ModalPortal>
          <div className="dash-modal-overlay" onClick={() => !submittingBill && setIsCreateBillModalOpen(false)}>
            <div className="dash-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', width: '92%' }}>
              <div className="dash-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Plus size={20} style={{ color: '#0ea5e9' }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Generate New Hospital Bill</h3>
                    <div style={{ fontSize: '0.78rem', opacity: 0.65 }}>Create invoice for outpatient consultation or hospital services</div>
                  </div>
                </div>
                <button className="dash-btn-icon" onClick={() => !submittingBill && setIsCreateBillModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateBillSubmit} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
                <div className="dash-modal-body" style={{ padding: '1.5rem', overflowY: 'auto', flex: '1 1 auto', minHeight: 0, maxHeight: 'calc(100vh - 12rem)' }}>
                  {actionErrorMsg && (
                    <div className="dash-alert dash-alert-danger" style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                      {actionErrorMsg}
                    </div>
                  )}

                {/* Patient Search & Select */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="dash-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Select Patient <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  {eligiblePatients.length === 0 ? (
                    <div
                      className="dash-alert dash-alert-warning"
                      style={{
                        fontSize: '0.85rem',
                        padding: '0.85rem 1rem',
                        marginBottom: '0.85rem',
                        backgroundColor: '#fffbeb',
                        border: '1px solid #f59e0b',
                        color: '#78350f',
                        fontWeight: 600,
                        borderRadius: '8px',
                        lineHeight: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                      }}
                    >
                      <span style={{ fontSize: '1.15rem' }}>⚠️</span>
                      <span>No patients currently have unbilled prescriptions. Bills can only be generated after a prescription is created by a doctor, and only once per prescription.</span>
                    </div>
                  ) : null}
                  <input
                    type="text"
                    className="dash-input"
                    placeholder="Search eligible patient name, phone, or ID..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}
                  />
                  <select
                    className="dash-input"
                    value={selectedPatientId}
                    onChange={(e) => {
                      setSelectedPatientId(e.target.value);
                      setSelectedAppointmentId('');
                    }}
                    required
                  >
                    <option value="">-- Choose Patient --</option>
                    {filteredPatients.map((p) => {
                      const name = p.full_name || `${p.first_name} ${p.last_name}`.trim();
                      const identifier = p.patient_id ? `${p.patient_id} • ` : '';
                      const phone = p.phone_number || 'No phone';
                      return (
                        <option key={p.id} value={p.id}>
                          {name} ({identifier}{phone})
                        </option>
                      );
                    })}
                  </select>
                  <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.4rem', fontWeight: 500 }}>
                    Showing only patients who have booked an appointment and a doctor-created prescription that has not yet been billed (bills are generated only once).
                  </div>
                </div>

                {/* Appointment Ref (Optional) */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="dash-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Associated Appointment (Optional)
                  </label>
                  <select
                    className="dash-input"
                    value={selectedAppointmentId}
                    onChange={(e) => setSelectedAppointmentId(e.target.value)}
                  >
                    <option value="">-- None (Direct Outpatient Service) --</option>
                    {(selectedPatientId
                      ? patientAppointments
                      : appointments
                          .filter((a) => a.status !== 'CANCELLED')
                          .filter((a) => !bills.some((b) => b.status !== 'CANCELLED' && String(b.appointment) === String(a.id)))
                    ).map((a) => {
                      const patientName = a.patient_name || (a.patient_details ? `${a.patient_details.first_name} ${a.patient_details.last_name}` : '');
                      const docName = a.doctor_name || (a.doctor_details?.full_name ? a.doctor_details.full_name : '');
                      return (
                        <option key={a.id} value={a.id}>
                          {a.appointment_id || 'Appt'}{patientName ? ` • ${patientName}` : ''}{docName ? ` with ${docName}` : ''} • {a.appointment_date} at {a.appointment_time} ({a.status})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Line Items Builder */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="dash-label" style={{ fontWeight: 600 }}>
                      Bill Items & Services <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      className="dash-btn dash-btn-secondary"
                      onClick={handleAddItem}
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Plus size={13} />
                      <span>Add Item</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {billItems.map((item, idx) => (
                      <div key={idx} className="dash-card" style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: '120px 1fr 60px 90px 32px', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          className="dash-input"
                          value={item.item_type}
                          onChange={(e) => handleItemChange(idx, 'item_type', e.target.value)}
                          style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                        >
                          <option value="CONSULTATION">Consultation</option>
                          <option value="LAB_TEST">Lab Test</option>
                        </select>

                        <input
                          type="text"
                          className="dash-input"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                          required
                        />

                        <input
                          type="number"
                          min="1"
                          className="dash-input"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          style={{ fontSize: '0.8rem', padding: '0.4rem', textAlign: 'center' }}
                          required
                        />

                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="dash-input"
                          placeholder="Price (₹)"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                          style={{ fontSize: '0.8rem', padding: '0.4rem', textAlign: 'right' }}
                          required
                        />

                        <button
                          type="button"
                          className="dash-btn-icon"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={billItems.length <= 1}
                          style={{ color: '#ef4444', padding: '0.2rem' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Discount & Totals */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label className="dash-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Discount Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="dash-input"
                      value={billDiscount}
                      onChange={(e) => setBillDiscount(e.target.value)}
                    />
                  </div>

                  <div className="dash-card" style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', opacity: 0.7 }}>
                      <span>Gross Amount:</span>
                      <span>₹{calculatedGrossTotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 700, marginTop: '0.35rem', color: '#0ea5e9' }}>
                      <span>Net Total:</span>
                      <span>₹{calculatedNetTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="dash-label" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Invoice Notes (Optional)
                  </label>
                  <textarea
                    className="dash-input"
                    rows={2}
                    placeholder="e.g., General outpatient registration and first-time consultation charge"
                    value={billNotes}
                    onChange={(e) => setBillNotes(e.target.value)}
                  />
                </div>
                </div>

                <div className="dash-modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="dash-btn dash-btn-secondary"
                    onClick={() => setIsCreateBillModalOpen(false)}
                    disabled={submittingBill}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="dash-btn dash-btn-primary"
                    disabled={submittingBill || !selectedPatientId}
                  >
                    {submittingBill ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Loader2 size={16} className="spin-icon" />
                        <span>Generating...</span>
                      </span>
                    ) : (
                      'Generate Invoice'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ─── MODAL: INVOICE & RECEIPT VIEW ─── */}
      {/* ─── MODAL: INVOICE & RECEIPT VIEW ─── */}
      {isReceiptModalOpen && selectedBill && (
        <ModalPortal>
          <div className="dash-modal-overlay" onClick={() => setIsReceiptModalOpen(false)}>
            <div className="dash-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', width: '92%' }}>
              {/* Header (Hidden in Print) */}
              <div className="dash-modal-header no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <FileText size={20} style={{ color: '#0ea5e9' }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Invoice & Payment Receipt</h3>
                    <div style={{ fontSize: '0.78rem', opacity: 0.65 }}>{selectedBill.bill_number}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button className="dash-btn dash-btn-primary" onClick={handlePrint} title="Print Official Receipt" style={{ padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                    <Printer size={15} />
                    <span>Print Receipt</span>
                  </button>
                  <button className="dash-btn-icon" onClick={() => setIsReceiptModalOpen(false)}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Receipt Body (Crisp Printable Document) */}
              <div
                className="dash-modal-body careflow-receipt-wrapper printable-receipt-area"
                id="printable-receipt"
                style={{ padding: '1.5rem', maxHeight: 'calc(100vh - 12rem)', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}
              >
                <div className="receipt-watermark no-print">CAREFLOW</div>
                <div className="receipt-content-body">
                  {/* Hospital Header Banner */}
                  <div className="receipt-hospital-masthead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '2px solid #0ea5e9', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="receipt-hospital-emblem" style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <Receipt size={22} />
                      </div>
                      <div>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0ea5e9', letterSpacing: '0.3px' }}>CareFlow Multi-Speciality Hospital</h2>
                        <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', opacity: 0.7 }}>
                          Front Desk Outpatient Billing Summary & Payment Ledger
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.75rem', opacity: 0.75, lineHeight: 1.4 }}>
                      <div>104 Healthway Blvd, Medical Enclave</div>
                      <div>Ph: +91 40 2345 6789 | Toll-Free: 1800-200-CARE</div>
                      <div>GSTIN: 36AAACH7890B1Z2</div>
                    </div>
                  </div>

                  {/* Document Title Bar */}
                  <div className="receipt-doc-title-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)', borderRadius: '6px', padding: '0.5rem 0.85rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem' }}>
                      <FileText size={15} style={{ color: '#0ea5e9' }} />
                      <span>TAX INVOICE & OFFICIAL PAYMENT RECEIPT</span>
                    </div>
                    <div>
                      {getStatusBadge(selectedBill.status)}
                    </div>
                  </div>

                  {/* Bill Meta */}
                  <div className="receipt-meta-box" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <div className="receipt-meta-label" style={{ opacity: 0.6, fontSize: '0.75rem', textTransform: 'uppercase' }}>Patient Name</div>
                      <div className="receipt-meta-val" style={{ fontWeight: 600, fontSize: '0.95rem' }}>{selectedBill.patient_name || 'Patient'}</div>
                      <div style={{ opacity: 0.7, fontSize: '0.8rem' }}>
                        {selectedBill.patient_id_code ? `ID: ${selectedBill.patient_id_code}` : 'Registered Patient'}
                      </div>
                    </div>
                    <div>
                      <div className="receipt-meta-label" style={{ opacity: 0.6, fontSize: '0.75rem', textTransform: 'uppercase' }}>Invoice Reference</div>
                      <div className="receipt-meta-val" style={{ fontWeight: 600, color: '#0ea5e9' }}>{selectedBill.bill_number}</div>
                      <div style={{ opacity: 0.7, fontSize: '0.8rem' }}>
                        Date: {selectedBill.created_at ? new Date(selectedBill.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                    {selectedBill.doctor_name && (
                      <div>
                        <div className="receipt-meta-label" style={{ opacity: 0.6, fontSize: '0.75rem', textTransform: 'uppercase' }}>Consulting Doctor</div>
                        <div className="receipt-meta-val" style={{ fontWeight: 600 }}>{selectedBill.doctor_name}</div>
                        <div style={{ opacity: 0.7, fontSize: '0.8rem' }}>Outpatient Consultation</div>
                      </div>
                    )}
                  </div>

                  {/* Line Items Table */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Billed Hospital Services</div>
                    <div className="receipt-table-container" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <table className="receipt-items-table" style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left' }}>Item / Service</th>
                            <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Qty</th>
                            <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Rate (₹)</th>
                            <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBill.items && selectedBill.items.length > 0 ? (
                            selectedBill.items.map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <td style={{ padding: '0.65rem 0.85rem' }}>
                                  <div style={{ fontWeight: 500 }}>{item.description}</div>
                                  <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{item.item_type}</div>
                                </td>
                                <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>{item.quantity}</td>
                                <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>₹{parseFloat(item.unit_price).toFixed(2)}</td>
                                <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 600 }}>₹{parseFloat(item.subtotal).toFixed(2)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" style={{ padding: '1rem', textAlign: 'center', opacity: 0.6 }}>
                                General Outpatient Service / Consultation Charge
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Amount Totals */}
                  <div className="receipt-totals-panel" style={{ marginLeft: 'auto', maxWidth: '300px', marginBottom: '1.25rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                      <span style={{ opacity: 0.7 }}>Gross Amount:</span>
                      <span>₹{parseFloat(selectedBill.total_amount || 0).toFixed(2)}</span>
                    </div>
                    {parseFloat(selectedBill.discount_amount || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#10b981' }}>
                        <span>Discount Applied:</span>
                        <span>-₹{parseFloat(selectedBill.discount_amount).toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderTop: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, fontSize: '0.95rem' }}>
                      <span>Net Total:</span>
                      <span style={{ color: '#0ea5e9' }}>₹{parseFloat(selectedBill.net_amount || selectedBill.total_amount || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#10b981' }}>
                      <span>Paid to Date:</span>
                      <span>₹{parseFloat(selectedBill.paid_amount || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderTop: '1px dashed rgba(255,255,255,0.1)', fontWeight: 600, color: parseFloat(selectedBill.balance_due || 0) > 0 ? '#ef4444' : '#10b981' }}>
                      <span>Balance Due:</span>
                      <span>₹{parseFloat(selectedBill.balance_due || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payments Recorded */}
                  {selectedBill.payments && selectedBill.payments.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Payment Transactions</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedBill.payments.map((p) => (
                          <div key={p.id} className="dash-card" style={{ padding: '0.65rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>Receipt #{p.receipt_number}</div>
                              <div style={{ opacity: 0.65 }}>
                                Method: {p.payment_method} {p.transaction_reference && `• Ref: ${p.transaction_reference}`}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 700, color: '#10b981' }}>₹{parseFloat(p.amount).toFixed(2)}</div>
                              <div style={{ opacity: 0.6, fontSize: '0.75rem' }}>
                                {new Date(p.payment_date).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="receipt-footer-auth" style={{ textAlign: 'center', fontSize: '0.75rem', opacity: 0.6, paddingTop: '0.75rem', borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
                    Official CareFlow HMS Computer-Generated Hospital Outpatient Receipt • Valid Without Physical Signature
                  </div>
                </div>
              </div>

              {/* Modal Footer (Hidden in Print) */}
              <div className="dash-modal-footer no-print" style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                {parseFloat(selectedBill.balance_due || 0) > 0 ? (
                  <button
                    className="dash-btn dash-btn-success"
                    onClick={() => {
                      setIsReceiptModalOpen(false);
                      handleOpenPayment(selectedBill);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <DollarSign size={15} />
                    <span>Collect Outstanding ₹{parseFloat(selectedBill.balance_due).toFixed(2)}</span>
                  </button>
                ) : (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                    <Check size={16} />
                    <span>Invoice Fully Settled</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="dash-btn dash-btn-primary"
                    onClick={handlePrint}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                  >
                    <Printer size={15} />
                    <span>Print Receipt</span>
                  </button>
                  <button className="dash-btn dash-btn-secondary" onClick={() => setIsReceiptModalOpen(false)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default ReceptionistPaymentsPage;
