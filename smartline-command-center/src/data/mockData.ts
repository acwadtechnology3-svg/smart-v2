// Mock data for SmartLine CRM

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicle: string;
  licensePlate: string;
  status: 'active' | 'pending' | 'inactive' | 'rejected';
  rating: number;
  totalTrips: number;
  earnings: number;
  joinedDate: string;
  avatar: string;
}

export interface Trip {
  id: string;
  driverId: string;
  driverName: string;
  customerId: string;
  customerName: string;
  pickupLocation: string;
  dropoffLocation: string;
  status: 'active' | 'completed' | 'cancelled';
  fare: number;
  distance: number;
  duration: number;
  startTime: string;
  endTime?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalTrips: number;
  totalSpent: number;
  walletBalance: number;
  status: 'active' | 'inactive';
  joinedDate: string;
  avatar: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  usageLimit: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  status: 'active' | 'expired' | 'inactive';
}

export interface SupportTicket {
  id: string;
  tripId?: string;
  customerId: string;
  customerName: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  type: 'trip_payment' | 'wallet_topup' | 'refund' | 'driver_payout';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
}

// Dashboard KPIs
export const dashboardStats = {
  totalTrips: 12847,
  tripsChange: 12.5,
  activeDrivers: 342,
  driversChange: 8.2,
  totalRevenue: 284750,
  revenueChange: 15.3,
  activeCustomers: 8934,
  customersChange: 6.7,
  onlineDrivers: 186,
  pendingApprovals: 23,
  openTickets: 15,
  completionRate: 94.2,
};

// Chart data
export const tripChartData = [
  { name: 'Mon', trips: 320, revenue: 4800 },
  { name: 'Tue', trips: 450, revenue: 6750 },
  { name: 'Wed', trips: 380, revenue: 5700 },
  { name: 'Thu', trips: 520, revenue: 7800 },
  { name: 'Fri', trips: 680, revenue: 10200 },
  { name: 'Sat', trips: 750, revenue: 11250 },
  { name: 'Sun', trips: 420, revenue: 6300 },
];

export const tripStatusData = [
  { name: 'Completed', value: 85, fill: 'hsl(var(--success))' },
  { name: 'Active', value: 10, fill: 'hsl(var(--primary))' },
  { name: 'Cancelled', value: 5, fill: 'hsl(var(--destructive))' },
];

// Mock Drivers
export const drivers: Driver[] = [
  {
    id: 'DRV001',
    name: 'Michael Chen',
    email: 'michael.chen@email.com',
    phone: '+1 555-0101',
    vehicle: 'Toyota Camry 2022',
    licensePlate: 'ABC 1234',
    status: 'active',
    rating: 4.9,
    totalTrips: 1247,
    earnings: 28450,
    joinedDate: '2024-01-15',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
  },
  {
    id: 'DRV002',
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '+1 555-0102',
    vehicle: 'Honda Accord 2023',
    licensePlate: 'XYZ 5678',
    status: 'active',
    rating: 4.8,
    totalTrips: 892,
    earnings: 21340,
    joinedDate: '2024-02-20',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  },
  {
    id: 'DRV003',
    name: 'David Kim',
    email: 'david.kim@email.com',
    phone: '+1 555-0103',
    vehicle: 'Tesla Model 3 2024',
    licensePlate: 'EV 9012',
    status: 'pending',
    rating: 0,
    totalTrips: 0,
    earnings: 0,
    joinedDate: '2025-01-28',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
  },
  {
    id: 'DRV004',
    name: 'Emily Rodriguez',
    email: 'emily.r@email.com',
    phone: '+1 555-0104',
    vehicle: 'Nissan Altima 2022',
    licensePlate: 'DEF 3456',
    status: 'active',
    rating: 4.7,
    totalTrips: 634,
    earnings: 15890,
    joinedDate: '2024-05-10',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
  },
  {
    id: 'DRV005',
    name: 'James Wilson',
    email: 'james.w@email.com',
    phone: '+1 555-0105',
    vehicle: 'Hyundai Sonata 2023',
    licensePlate: 'GHI 7890',
    status: 'inactive',
    rating: 4.5,
    totalTrips: 423,
    earnings: 10780,
    joinedDate: '2024-03-08',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
  },
  {
    id: 'DRV006',
    name: 'Lisa Park',
    email: 'lisa.park@email.com',
    phone: '+1 555-0106',
    vehicle: 'Kia K5 2024',
    licensePlate: 'JKL 1122',
    status: 'pending',
    rating: 0,
    totalTrips: 0,
    earnings: 0,
    joinedDate: '2025-01-30',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
  },
];

// Mock Trips
export const trips: Trip[] = [
  {
    id: 'TRP001',
    driverId: 'DRV001',
    driverName: 'Michael Chen',
    customerId: 'CUS001',
    customerName: 'Alice Brown',
    pickupLocation: '123 Main St, Downtown',
    dropoffLocation: '456 Oak Ave, Uptown',
    status: 'completed',
    fare: 24.50,
    distance: 8.2,
    duration: 18,
    startTime: '2025-01-31T10:30:00',
    endTime: '2025-01-31T10:48:00',
  },
  {
    id: 'TRP002',
    driverId: 'DRV002',
    driverName: 'Sarah Johnson',
    customerId: 'CUS002',
    customerName: 'Bob Smith',
    pickupLocation: '789 Pine Rd, Midtown',
    dropoffLocation: 'Airport Terminal 2',
    status: 'active',
    fare: 45.00,
    distance: 22.5,
    duration: 35,
    startTime: '2025-01-31T14:15:00',
  },
  {
    id: 'TRP003',
    driverId: 'DRV004',
    driverName: 'Emily Rodriguez',
    customerId: 'CUS003',
    customerName: 'Carol White',
    pickupLocation: '321 Elm St, Suburbs',
    dropoffLocation: '654 Maple Dr, Business District',
    status: 'completed',
    fare: 18.75,
    distance: 6.1,
    duration: 14,
    startTime: '2025-01-31T09:00:00',
    endTime: '2025-01-31T09:14:00',
  },
  {
    id: 'TRP004',
    driverId: 'DRV001',
    driverName: 'Michael Chen',
    customerId: 'CUS004',
    customerName: 'Dan Miller',
    pickupLocation: 'Central Station',
    dropoffLocation: '888 Tech Park Blvd',
    status: 'cancelled',
    fare: 0,
    distance: 0,
    duration: 0,
    startTime: '2025-01-31T11:45:00',
  },
  {
    id: 'TRP005',
    driverId: 'DRV002',
    driverName: 'Sarah Johnson',
    customerId: 'CUS005',
    customerName: 'Eva Green',
    pickupLocation: '555 Harbor View',
    dropoffLocation: 'City Mall',
    status: 'completed',
    fare: 15.25,
    distance: 4.8,
    duration: 12,
    startTime: '2025-01-31T08:30:00',
    endTime: '2025-01-31T08:42:00',
  },
];

// Mock Customers
export const customers: Customer[] = [
  {
    id: 'CUS001',
    name: 'Alice Brown',
    email: 'alice.brown@email.com',
    phone: '+1 555-1001',
    totalTrips: 45,
    totalSpent: 892.50,
    walletBalance: 50.00,
    status: 'active',
    joinedDate: '2024-06-12',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
  },
  {
    id: 'CUS002',
    name: 'Bob Smith',
    email: 'bob.smith@email.com',
    phone: '+1 555-1002',
    totalTrips: 128,
    totalSpent: 2456.80,
    walletBalance: 125.00,
    status: 'active',
    joinedDate: '2024-01-20',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
  },
  {
    id: 'CUS003',
    name: 'Carol White',
    email: 'carol.white@email.com',
    phone: '+1 555-1003',
    totalTrips: 23,
    totalSpent: 345.25,
    walletBalance: 0,
    status: 'active',
    joinedDate: '2024-09-05',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol',
  },
  {
    id: 'CUS004',
    name: 'Dan Miller',
    email: 'dan.miller@email.com',
    phone: '+1 555-1004',
    totalTrips: 8,
    totalSpent: 156.00,
    walletBalance: 20.00,
    status: 'inactive',
    joinedDate: '2024-11-18',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dan',
  },
  {
    id: 'CUS005',
    name: 'Eva Green',
    email: 'eva.green@email.com',
    phone: '+1 555-1005',
    totalTrips: 67,
    totalSpent: 1234.75,
    walletBalance: 75.50,
    status: 'active',
    joinedDate: '2024-04-02',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eva',
  },
];

// Mock Promo Codes
export const promoCodes: PromoCode[] = [
  {
    id: 'PROMO001',
    code: 'WELCOME20',
    discount: 20,
    discountType: 'percentage',
    usageLimit: 1000,
    usedCount: 456,
    validFrom: '2025-01-01',
    validUntil: '2025-03-31',
    status: 'active',
  },
  {
    id: 'PROMO002',
    code: 'RIDE5OFF',
    discount: 5,
    discountType: 'fixed',
    usageLimit: 500,
    usedCount: 500,
    validFrom: '2024-12-01',
    validUntil: '2025-01-31',
    status: 'expired',
  },
  {
    id: 'PROMO003',
    code: 'WEEKEND15',
    discount: 15,
    discountType: 'percentage',
    usageLimit: 2000,
    usedCount: 234,
    validFrom: '2025-01-15',
    validUntil: '2025-06-30',
    status: 'active',
  },
];

// Mock Support Tickets
export const supportTickets: SupportTicket[] = [
  {
    id: 'TKT001',
    tripId: 'TRP004',
    customerId: 'CUS004',
    customerName: 'Dan Miller',
    subject: 'Driver cancelled my trip',
    description: 'The driver cancelled my trip without any explanation. I had to wait 20 minutes for another ride.',
    priority: 'high',
    status: 'open',
    createdAt: '2025-01-31T12:00:00',
    updatedAt: '2025-01-31T12:00:00',
  },
  {
    id: 'TKT002',
    customerId: 'CUS002',
    customerName: 'Bob Smith',
    subject: 'Overcharged for my last trip',
    description: 'I was charged $45 for a trip that should have been around $30 based on the distance.',
    priority: 'medium',
    status: 'in-progress',
    createdAt: '2025-01-30T16:30:00',
    updatedAt: '2025-01-31T09:15:00',
  },
  {
    id: 'TKT003',
    customerId: 'CUS001',
    customerName: 'Alice Brown',
    subject: 'Lost item in vehicle',
    description: 'I left my phone in the vehicle. Trip ID: TRP001. Please help me contact the driver.',
    priority: 'urgent',
    status: 'open',
    createdAt: '2025-01-31T11:00:00',
    updatedAt: '2025-01-31T11:00:00',
  },
];

// Mock Transactions
export const transactions: Transaction[] = [
  {
    id: 'TXN001',
    userId: 'CUS001',
    userName: 'Alice Brown',
    type: 'trip_payment',
    amount: 24.50,
    status: 'completed',
    createdAt: '2025-01-31T10:48:00',
  },
  {
    id: 'TXN002',
    userId: 'CUS002',
    userName: 'Bob Smith',
    type: 'wallet_topup',
    amount: 100.00,
    status: 'completed',
    createdAt: '2025-01-31T14:00:00',
  },
  {
    id: 'TXN003',
    userId: 'DRV001',
    userName: 'Michael Chen',
    type: 'driver_payout',
    amount: 850.00,
    status: 'pending',
    createdAt: '2025-01-31T00:00:00',
  },
  {
    id: 'TXN004',
    userId: 'CUS003',
    userName: 'Carol White',
    type: 'trip_payment',
    amount: 18.75,
    status: 'completed',
    createdAt: '2025-01-31T09:14:00',
  },
  {
    id: 'TXN005',
    userId: 'CUS004',
    userName: 'Dan Miller',
    type: 'refund',
    amount: 15.00,
    status: 'completed',
    createdAt: '2025-01-31T12:30:00',
  },
];

// Recent Activity for Dashboard
export const recentActivity = [
  { id: 1, type: 'trip_completed', message: 'Trip #TRP001 completed successfully', time: '2 min ago' },
  { id: 2, type: 'driver_approved', message: 'Driver David Kim approved', time: '15 min ago' },
  { id: 3, type: 'ticket_created', message: 'New support ticket from Dan Miller', time: '32 min ago' },
  { id: 4, type: 'promo_used', message: 'WELCOME20 used 5 times today', time: '1 hour ago' },
  { id: 5, type: 'payment_received', message: 'Payment of $100 received from Bob Smith', time: '2 hours ago' },
];
