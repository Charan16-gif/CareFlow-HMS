import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import PharmacistHeader from './components/pharmacist/PharmacistHeader';
import PharmacistSidebar from './components/pharmacist/PharmacistSidebar';
import PharmacistRoute from './components/pharmacist/PharmacistRoute';
import PharmacistOverviewPage from './pages/pharmacist/PharmacistOverviewPage';
import PharmacistInventoryPage from './pages/pharmacist/PharmacistInventoryPage';
import PharmacistBuyingPaymentPage from './pages/pharmacist/PharmacistBuyingPaymentPage';
import authService from './services/authService';
import pharmacistService from './services/pharmacistService';

// Mock authService and pharmacistService
jest.mock('./services/authService', () => {
  const service = {
    isAuthenticated: jest.fn(),
    isPharmacist: jest.fn(),
    isAdmin: jest.fn(),
    getUserRole: jest.fn(),
    getUserProfile: jest.fn(),
    fetchProfile: jest.fn(),
    logout: jest.fn(),
  };
  return {
    __esModule: true,
    default: service,
    authService: service,
  };
});

jest.mock('./services/pharmacistService', () => {
  const service = {
    getStats: jest.fn(),
    getMedicines: jest.fn(),
    getMedicineDetails: jest.fn(),
    createMedicine: jest.fn(),
    updateMedicine: jest.fn(),
    deleteMedicine: jest.fn(),
    adjustStock: jest.fn(),
    getStockMovements: jest.fn(),
    getPrescriptions: jest.fn(),
    getPrescriptionDetails: jest.fn(),
    dispenseMedicines: jest.fn(),
    getDispensations: jest.fn(),
    getDispenseDetails: jest.fn(),
    getBills: jest.fn(),
    getBillDetails: jest.fn(),
    checkoutPurchase: jest.fn(),
    getPayments: jest.fn(),
    getPatients: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
  };
  return {
    __esModule: true,
    default: service,
    pharmacistService: service,
  };
});

const mockMedicines = [
  {
    id: 1,
    name: 'Paracetamol',
    medicine_code: 'MED-PARA-500',
    generic_name: 'Acetaminophen',
    dosage_form: 'TABLET',
    strength: '500mg',
    manufacturer: 'Cipla Ltd',
    unit_price: '5.00',
    stock_quantity: 120,
    reorder_level: 20,
    expiry_date: '2027-12-31',
  },
  {
    id: 2,
    name: 'Amoxicillin',
    medicine_code: 'MED-AMOX-250',
    generic_name: 'Amoxicillin Trihydrate',
    dosage_form: 'CAPSULE',
    strength: '250mg',
    manufacturer: 'Sun Pharma',
    unit_price: '12.00',
    stock_quantity: 8,
    reorder_level: 25,
    expiry_date: '2026-11-10',
  },
  {
    id: 3,
    name: 'Insulin Glargine',
    medicine_code: 'MED-INSU-100',
    generic_name: 'Insulin Glargine',
    dosage_form: 'INJECTION',
    strength: '100 IU/ml',
    manufacturer: 'Sanofi',
    unit_price: '450.00',
    stock_quantity: 0,
    reorder_level: 10,
    expiry_date: '2026-08-15',
  },
];

const mockPrescriptions = [
  {
    id: 501,
    prescription_id: 'CF-RX-2026-001',
    patient: 1,
    patient_name: 'Alice Smith',
    doctor: 2,
    doctor_name: 'Dr. Stephen Strange',
    status: 'PENDING',
    diagnosis: 'Upper Respiratory Infection',
    created_at: '2026-10-19T09:30:00Z',
    items: [
      {
        id: 701,
        medicine: 1,
        medicine_name: 'Paracetamol',
        dosage_form: 'TABLET',
        strength: '500mg',
        dosage: '1 tab',
        frequency: '1-0-1',
        duration: '5 days',
        quantity_prescribed: 10,
        quantity_dispensed: 0,
        medicine_unit_price: '5.00',
      },
    ],
  },
];

const mockPayments = [
  {
    id: 301,
    receipt_number: 'CF-RCP-2026-001',
    bill_number: 'CF-INV-2026-001',
    bill: 901,
    patient: 1,
    patient_name: 'Alice Smith',
    status: 'SUCCESS',
    amount: '50.00',
    payment_method: 'CASH',
    payment_date: '2026-10-19T10:05:00Z',
    transaction_reference: 'TXN-CASH-101',
    received_by_name: 'Rajesh Sharma',
    bill_items: [
      {
        id: 11,
        description: 'Paracetamol 500mg',
        reference_id: 'MED-PARA-500',
        item_type: 'MEDICINE',
        quantity: 10,
        unit_price: '5.00',
        subtotal: '50.00',
      },
    ],
  },
];

const setupDefaultMocks = () => {
  authService.isAuthenticated.mockReturnValue(true);
  authService.isPharmacist.mockReturnValue(true);
  authService.isAdmin.mockReturnValue(false);
  authService.getUserRole.mockReturnValue('PHARMACIST');
  authService.getUserProfile.mockReturnValue({
    id: 8,
    username: 'rajesh',
    first_name: 'Rajesh',
    last_name: 'Sharma',
    email: 'pharmacy@careflow.com',
    role: 'PHARMACIST',
  });
  authService.fetchProfile.mockResolvedValue({
    id: 8,
    username: 'rajesh',
    first_name: 'Rajesh',
    last_name: 'Sharma',
    email: 'pharmacy@careflow.com',
    role: 'PHARMACIST',
  });

  pharmacistService.getStats.mockResolvedValue({
    total_medicines: 3,
    total_units_in_stock: 128,
    total_inventory_value: '696.00',
    in_stock: 2,
    low_stock: 1,
    out_of_stock: 1,
    near_expiry: 1,
    expired: 1,
    today_sales: '75.00',
    today_dispensed: 1,
    attention_medicines: [mockMedicines[1], mockMedicines[2]],
    recent_dispensations: [],
    recent_sales: mockPayments,
  });

  pharmacistService.getMedicines.mockResolvedValue(mockMedicines);
  pharmacistService.getMedicineDetails.mockResolvedValue(mockMedicines[0]);
  pharmacistService.createMedicine.mockResolvedValue({ id: 4, name: 'Cetirizine' });
  pharmacistService.updateMedicine.mockResolvedValue({ id: 1, ...mockMedicines[0] });
  pharmacistService.deleteMedicine.mockResolvedValue({ success: true, deleted: true });
  pharmacistService.adjustStock.mockResolvedValue({ success: true, new_stock: 150 });
  pharmacistService.getStockMovements.mockResolvedValue([]);
  pharmacistService.getPrescriptions.mockResolvedValue(mockPrescriptions);
  pharmacistService.getPrescriptionDetails.mockResolvedValue(mockPrescriptions[0]);
  pharmacistService.dispenseMedicines.mockResolvedValue({ success: true });
  pharmacistService.getDispensations.mockResolvedValue([]);
  pharmacistService.getBills.mockResolvedValue([]);
  pharmacistService.getBillDetails.mockResolvedValue({ id: 901, items: mockPayments[0].bill_items });
  pharmacistService.checkoutPurchase.mockResolvedValue({
    success: true,
    receipt: mockPayments[0],
  });
  pharmacistService.getPayments.mockResolvedValue(mockPayments);
  pharmacistService.getPatients.mockResolvedValue([
    { id: 1, patient_id: 'CF-PAT-1001', first_name: 'Alice', last_name: 'Smith', phone_number: '555-1234' },
  ]);
  pharmacistService.getProfile.mockResolvedValue({
    id: 8,
    username: 'rajesh',
    first_name: 'Rajesh',
    last_name: 'Sharma',
    email: 'pharmacy@careflow.com',
  });
  pharmacistService.updateProfile.mockResolvedValue({ success: true });
  pharmacistService.changePassword.mockResolvedValue({ success: true });
};

describe('CareFlow HMS — Pharmacist Dashboard Redesign Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  // 1. Mandatory 3-Page Navigation Structure
  test('PharmacistSidebar renders EXACTLY three primary navigation pages and branding', () => {
    render(
      <BrowserRouter>
        <PharmacistSidebar
          isOpen={true}
          onClose={jest.fn()}
          onOpenLogoutModal={jest.fn()}
          onOpenProfile={jest.fn()}
          pharmacistUser={{ first_name: 'Rajesh', last_name: 'Sharma' }}
        />
      </BrowserRouter>
    );

    // CareFlow Pharmacy Brand
    expect(screen.getByText('CareFlow')).toBeInTheDocument();
    expect(screen.getByText('PHARMACY')).toBeInTheDocument();

    // Exactly 3 navigation links
    const navLinks = screen.getAllByRole('link').filter((l) => l.className.includes('admin-nav-link'));
    expect(navLinks).toHaveLength(3);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Medicines Stock')).toBeInTheDocument();
    expect(screen.getByText('Medicines Buying & Payment')).toBeInTheDocument();

    // Verify Sign Out button
    expect(screen.getByRole('button', { name: /Sign out from pharmacist portal/i })).toBeInTheDocument();
  });

  // 2. Header and Theme Selector
  test('PharmacistHeader renders title, role badge, user profile chip, and theme switcher', () => {
    const handleThemeChange = jest.fn();
    render(
      <BrowserRouter>
        <PharmacistHeader
          onToggleSidebar={jest.fn()}
          currentTheme="default"
          onThemeChange={handleThemeChange}
          onOpenProfile={jest.fn()}
          pharmacistUser={{ first_name: 'Rajesh', username: 'rajesh' }}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Pharmacist Portal')).toBeInTheDocument();
    expect(screen.getByText('Pharmacist')).toBeInTheDocument();
    expect(screen.getByText('Rajesh')).toBeInTheDocument();
    expect(screen.getByTitle(/Change landing page theme/i)).toBeInTheDocument();
  });

  // 3. Pharmacist Route Access Control
  test('PharmacistRoute permits PHARMACIST and blocks unauthorized roles', () => {
    authService.getUserRole.mockReturnValue('PHARMACIST');
    authService.isPharmacist.mockReturnValue(true);

    const { rerender } = render(
      <MemoryRouter>
        <PharmacistRoute>
          <div>Protected Pharmacy Content</div>
        </PharmacistRoute>
      </MemoryRouter>
    );
    expect(screen.getByText('Protected Pharmacy Content')).toBeInTheDocument();

    // Now test restricted role
    authService.getUserRole.mockReturnValue('PATIENT');
    authService.isPharmacist.mockReturnValue(false);

    rerender(
      <MemoryRouter>
        <PharmacistRoute>
          <div>Protected Pharmacy Content</div>
        </PharmacistRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText('Protected Pharmacy Content')).not.toBeInTheDocument();
    expect(screen.getByText(/Pharmacist Portal Restricted/i)).toBeInTheDocument();
  });

  // 4. Page 1: PharmacistOverviewPage
  test('PharmacistOverviewPage renders operations analytics, quick actions, and attention medicines', async () => {
    render(
      <BrowserRouter>
        <PharmacistOverviewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pharmacy Operations Overview')).toBeInTheDocument();
      expect(screen.getByText('Total Medicines')).toBeInTheDocument();
      expect(screen.getByText('Total Units in Stock')).toBeInTheDocument();
      expect(screen.getByText('Inventory Value')).toBeInTheDocument();
      expect(screen.getByText('Low Stock Alerts')).toBeInTheDocument();
      expect(screen.getAllByText('Out of Stock').length).toBeGreaterThan(0);
      expect(screen.getByText("Today's Pharmacy Sales")).toBeInTheDocument();
    });

    // Verify quick action shortcuts
    expect(screen.getByRole('button', { name: /Add New Medicine/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Counter Buying & Cart/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Prescribed Medicines/i })).toBeInTheDocument();
  });

  // 5. Page 2: PharmacistInventoryPage (Medicines Stock)
  test('PharmacistInventoryPage renders stock catalogue, search, and supports CRUD without inactive/deactivate features', async () => {
    render(
      <BrowserRouter>
        <PharmacistInventoryPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Medicines Stock Catalogue')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add New Medicine/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search by medicine name, code/i)).toBeInTheDocument();
      expect(screen.getByText('Paracetamol')).toBeInTheDocument();
      expect(screen.getByText('Amoxicillin')).toBeInTheDocument();
      expect(screen.getByText('Insulin Glargine')).toBeInTheDocument();
    });

    // Ensure NO deactivate/inactive controls exist
    expect(screen.queryByText(/Deactivate/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Inactive/i)).not.toBeInTheDocument();
  });

  // 6. Page 3: PharmacistBuyingPaymentPage (Shop, Prescriptions, Cart, History & Buy Again)
  test('PharmacistBuyingPaymentPage renders all 4 functional tabs, shop catalogue, prescriptions, cart checkout, and Buy Again', async () => {
    render(
      <BrowserRouter>
        <PharmacistBuyingPaymentPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Medicines Buying & Counter Payment')).toBeInTheDocument();
      expect(screen.getByText('Shop Inventory Catalogue')).toBeInTheDocument();
      expect(screen.getByText('Doctor-Prescribed Suggestions')).toBeInTheDocument();
      expect(screen.getByText('Cart & Counter Checkout')).toBeInTheDocument();
      expect(screen.getByText('Sales & Payment History')).toBeInTheDocument();
      expect(screen.getByText('Paracetamol')).toBeInTheDocument();
      expect(screen.getByText('MED-PARA-500')).toBeInTheDocument();
    });

    // Click on Doctor-Prescribed Suggestions tab
    fireEvent.click(screen.getByText('Doctor-Prescribed Suggestions'));
    await waitFor(() => {
      expect(screen.getByText('Doctor-Prescribed Medicine Lines')).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText(/CF-RX-2026-001/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Prescribed Qty/i })).toBeInTheDocument();
    });

    // Add prescribed item to cart
    fireEvent.click(screen.getByRole('button', { name: /Add Prescribed Qty/i }));

    // Click on Cart & Counter Checkout tab
    fireEvent.click(screen.getByText('Cart & Counter Checkout'));
    await waitFor(() => {
      expect(screen.getByText('Counter Cart Line Items')).toBeInTheDocument();
      expect(screen.getByText('Counter Billing & Settlement')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Record Payment & Issue Receipt/i })).toBeInTheDocument();
    });

    // Click on Sales & Payment History tab
    fireEvent.click(screen.getByText('Sales & Payment History'));
    await waitFor(() => {
      expect(screen.getByText('Pharmacy Sales & Counter Receipts History')).toBeInTheDocument();
      expect(screen.getByText('CF-RCP-2026-001')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Receipt/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Buy Again/i })).toBeInTheDocument();
    });

    // Trigger Buy Again on previous transaction
    fireEvent.click(screen.getByRole('button', { name: /Buy Again/i }));
    await waitFor(() => {
      expect(screen.getByText('Counter Cart Line Items')).toBeInTheDocument();
    });
  });

  // 7. Counter Checkout Submission & Instant Receipt Generation
  test('PharmacistBuyingPaymentPage counter checkout creates payment, deducts stock, and opens verified receipt', async () => {
    render(
      <BrowserRouter>
        <PharmacistBuyingPaymentPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Shop Inventory Catalogue')).toBeInTheDocument();
      expect(screen.getByText('Paracetamol')).toBeInTheDocument();
    });

    // Add Paracetamol to cart from shop
    const addToCartBtns = screen.getAllByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartBtns[0]);

    // Go to cart
    fireEvent.click(screen.getByText('Cart & Counter Checkout'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Record Payment & Issue Receipt/i })).toBeInTheDocument();
    });

    // Submit checkout
    fireEvent.click(screen.getByRole('button', { name: /Record Payment & Issue Receipt/i }));

    await waitFor(() => {
      expect(pharmacistService.checkoutPurchase).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Official Pharmacy Counter Receipt')).toBeInTheDocument();
      expect(screen.getAllByText(/CF-RCP-2026-001/i).length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /Print Official Receipt/i })).toBeInTheDocument();
    });
  });
});
