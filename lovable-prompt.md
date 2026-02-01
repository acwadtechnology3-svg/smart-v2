# SmartLine - Lovable Build Prompt

## Prompt for Lovable (copy and paste this):

---

Build a ride-hailing mobile app called **SmartLine** using React Native (Expo) with TypeScript and Supabase as the backend. The currency is **EGP (Egyptian Pounds)**. The app supports two user roles: **Customer** and **Driver**. Use a clean, modern UI with a primary color of **#2563EB** (blue) and white backgrounds. Use the Inter font family. All screens should be mobile-first and RTL-compatible (Arabic support later).

## Authentication Flow

### Screen 1: Splash Screen
- App logo "SmartLine" centered on a blue (#2563EB) background with white text
- Auto-navigate to Role Select after 2 seconds

### Screen 2: Role Selection
- Two large cards side by side:
  - **Customer** card with a car icon
  - **Driver** card with a steering wheel icon
- Each card has the role name and a short description
- Tapping a card proceeds to Phone Input

### Screen 3: Phone Input
- Title: "Enter your phone number"
- Phone input field with Egypt country code (+20) prefix
- "Continue" button (blue, full-width)
- On submit: check if phone exists in `profiles` table
  - If exists → go to Password Screen
  - If not exists → go to Signup Screen

### Screen 4: Password Screen (existing users)
- Title: "Welcome back!"
- Show the user's name
- Password input field with show/hide toggle
- "Login" button
- "Forgot password?" link → Forgot Password Screen
- Uses Supabase Auth `signInWithPassword`

### Screen 5: Forgot Password Screen
- Title: "Reset your password"
- Shows the phone number
- "Send OTP" button → sends OTP via Supabase
- OTP input (6 digits, individual boxes)
- New password + confirm password fields
- "Reset Password" button

### Screen 6: Signup Screen
- Title: "Create your account"
- Fields: Full Name, Email, Password, Confirm Password
- "Create Account" button
- Creates user in Supabase Auth, then inserts into `profiles` table with the selected role
- If role is Driver → continue to Driver Signup Steps
- If role is Customer → go to Customer Home

### Screen 7: Driver Signup - Personal Data
- Title: "Personal Information"
- Fields: Full Name (prefilled), National ID Number, City (dropdown)
- "Next" button

### Screen 8: Driver Signup - Select Vehicle
- Title: "Select your vehicle type"
- Three selectable cards in a row:
  - **Car** (sedan icon)
  - **Motorcycle** (motorcycle icon)
  - **Taxi** (taxi icon)
- Vehicle Model text input
- Vehicle Plate Number text input
- "Next" button

### Screen 9: Driver Signup - Upload Documents
- Title: "Upload your documents"
- Four upload boxes in a 2x2 grid:
  - Driver's License
  - Personal Photo
  - Vehicle License
  - Declaration Form
- Each box shows a camera/upload icon, tapping opens image picker
- After upload, show thumbnail preview with an X to remove
- "Submit for Review" button
- Uploads to Supabase Storage bucket `driver-documents`
- Inserts record into `drivers` table with status `pending`

### Screen 10: Waiting for Approval
- Centered illustration of a clock/hourglass
- Title: "Your application is under review"
- Subtitle: "We'll notify you once approved"
- Polls `drivers.status` every 10 seconds
- When status changes to `approved` → navigate to Driver Home
- If `rejected` → show message with reason

---

## Customer Screens

### Customer Home Screen
- Full-screen Mapbox map showing user's current location with a blue dot
- Floating search bar at the top: "Where to?" with a search icon
- Bottom card showing:
  - "Good morning/afternoon/evening, [Name]!" greeting
  - Recent destinations (if any) as horizontal chips
- Hamburger menu icon (top-left) → opens Sidebar
- Tapping "Where to?" → Search Location Screen

### Search Location Screen
- Search input at top (autofocus)
- "Current Location" option with GPS icon
- Search results from Mapbox Geocoding API as a list
- Each result shows: place name (bold), full address (gray, smaller)
- Pin icon on the left of each result
- Selecting a result → Trip Options Screen

### Trip Options Screen
- Map at top (40% of screen) showing:
  - Pickup marker (green)
  - Destination marker (red)
  - Route line (blue) between them via Mapbox Directions
- Below the map:
  - **Pickup**: address with edit icon
  - **Destination**: address with edit icon
  - Divider line
  - **Ride Type** selector: horizontal scrollable cards
    - Economy (car icon, cheapest)
    - Comfort (nicer car icon, mid-price)
    - Motorcycle (motorcycle icon)
  - **Estimated Price**: "EGP XX.XX" in large text
  - **Payment Method**: toggle between "Cash" and "Wallet (EGP XX.XX balance)"
  - **Promo Code**: text input with "Apply" button. If valid, show discount: "−EGP X.XX"
  - **Final Price**: after discount, bold
  - **"Request SmartLine"** button (blue, large, full-width)
- On request: create trip in `trips` table with status `searching`

### Searching for Driver Screen
- Map showing pickup location
- Bottom sheet with:
  - Animated pulsing circle/radar animation
  - "Looking for nearby drivers..."
  - "Cancel" button (red text)
- Listens to `trips` table changes via Supabase Realtime
- When status becomes `driver_found` → Driver Found Screen

### Driver Found Screen
- Map showing:
  - Driver's real-time location (car icon marker)
  - Route from driver to pickup (dashed blue line)
  - Pickup location marker
- Bottom card:
  - Driver's photo (circle), name, rating (stars)
  - Vehicle: model + plate number
  - "Arriving in X min" ETA
  - Call button (phone icon)
  - Message button
  - "Cancel Ride" button
- Real-time updates: subscribes to trip's `driver_current_lat/lng`

### On Trip Screen
- Full map showing:
  - Current position (moving car icon)
  - Route from current position to destination
  - Destination marker
- Bottom bar:
  - "On the way to destination"
  - Distance remaining + ETA
  - Driver info (small)
  - "Share Trip" button

### Trip Complete Screen
- Checkmark animation at top
- "Trip Completed!"
- Trip summary card:
  - From → To
  - Distance, Duration
  - Price: EGP XX.XX
  - Payment method used
  - Discount applied (if any)
- Star rating (1-5, tappable stars, large)
- "Submit" button
- On submit: updates trip rating, navigates to Home

### Wallet Screen
- Balance card at top: "EGP XX.XX" in large text on a blue gradient card
- "Deposit" button
- Deposit modal: amount input + "Add Funds" button (simulated, just adds to balance)
- Transaction History list:
  - Each item: icon (green + for deposit, red − for payment), description, amount, date
  - "Deposit" / "Trip payment" / "Refund" labels

### My Trips Screen
- Tab bar: "Active" | "Past"
- Trip cards in a list:
  - Date/time
  - From → To (addresses)
  - Status badge (colored): Completed (green), Cancelled (red), Active (blue)
  - Price: EGP XX.XX
  - Driver name (if assigned)
- Tapping a past trip shows trip details

### Discounts Screen
- Title: "Promo Codes"
- Input field: "Enter promo code" + "Apply" button
- Active promotions list (from `promo_codes` table):
  - Code name
  - "X% off, up to EGP XX"
  - Valid until date
  - "Use" button that copies the code

### Sidebar Menu (Drawer)
- User avatar (circle) + name + phone number at top
- Menu items with icons:
  - 🏠 Home
  - 🚗 My Trips
  - 💳 Wallet
  - 🎟️ Discounts
  - ⚙️ Settings
  - 👥 Invite Friends
  - 🚪 Logout
- Tapping Logout → confirm dialog → sign out via Supabase

---

## Driver Screens

### Driver Home Screen
- Full-screen Mapbox map centered on driver's location
- Top bar: earnings today "EGP XX.XX"
- Large toggle button at bottom: "GO ONLINE" (green) / "GO OFFLINE" (red)
- When online:
  - Updates `drivers.current_lat/lng` and `is_online=true` every 5 seconds
  - Subscribes to new trips within 5km radius
  - Bottom shows "Waiting for rides..." with subtle pulse animation

### Trip Request Screen (Modal/Bottom Sheet)
- Appears as a bottom sheet over the map when a new trip is found
- Auto-dismiss after 30 seconds if not acted upon
- Content:
  - Pickup address + destination address
  - Distance: X.X km
  - Estimated price: EGP XX.XX
  - **Price Adjuster**: current price in center, "−" and "+" buttons on sides (adjusts by EGP 5 increments)
  - Two buttons:
    - "Accept" (green, large)
    - "Decline" (gray, smaller)
- Accept: updates trip `status='driver_found'`, sets `driver_id`, `driver_price_adjustment`

### Navigate to Pickup Screen
- Full map with route from driver to pickup location
- Turn-by-turn style: next instruction at top
- Bottom bar:
  - Customer name + photo
  - "X min away"
  - Call button
  - "Arrived" button (blue) — sets trip status to `arrived`

### On Trip Driver Screen
- Full map with route from current location to destination
- Top bar: destination address
- Bottom bar:
  - Trip info: distance remaining, ETA
  - "Complete Trip" button (appears when near destination) — sets status to `completed`, triggers payment

### Trip Complete Driver Screen
- "Trip Completed!" with checkmark
- Earnings: EGP XX.XX
- Payment method: Cash / Wallet
- "Done" button → back to Driver Home

---

## Admin Panel (Web App - React + Vite + Tailwind)

Build a separate web admin panel at `/admin` route or as a separate Lovable project.

### Admin Login
- Simple login form: email + password
- Authenticates via Supabase, checks `admin_users` table

### Dashboard
- Stats cards at top:
  - Total Trips (today / all time)
  - Active Drivers (online now)
  - Total Revenue (EGP)
  - Pending Driver Approvals
- Recent trips table: ID, Customer, Driver, Status, Price, Date
- Charts: trips per day (bar chart), revenue trend (line chart)

### Driver Approvals Page
- Table of pending drivers:
  - Name, Phone, City, Vehicle Type, Submitted Date
  - "View" button → opens modal with:
    - All driver info
    - Document images (license, photo, vehicle license, declaration)
    - "Approve" button (green)
    - "Reject" button (red) with reason text input

### Trips Page
- Filterable/searchable table of all trips
- Columns: ID, Customer, Driver, From, To, Status, Price, Payment, Date
- Status filter dropdown
- Date range picker

### Promo Codes Page
- Table of all promo codes
- "Create New" button → modal:
  - Code, Discount %, Max Discount (EGP), Valid From, Valid Until, Max Uses, Active toggle
- Edit/Deactivate existing codes

---

## Supabase Configuration

Connect to Supabase with these tables:
- `profiles` (id, phone, name, email, role, avatar_url, created_at)
- `drivers` (id, status, vehicle_type, vehicle_model, vehicle_plate, license_url, photo_url, vehicle_license_url, declaration_url, city, current_lat, current_lng, is_online, location)
- `wallets` (id, user_id, balance)
- `wallet_transactions` (id, wallet_id, amount, type, trip_id, created_at)
- `trips` (id, customer_id, driver_id, pickup_lat, pickup_lng, pickup_address, dest_lat, dest_lng, dest_address, status, base_price, final_price, driver_price_adjustment, payment_method, promo_code_id, discount_amount, distance_km, duration_min, driver_current_lat, driver_current_lng, rating, created_at, updated_at)
- `promo_codes` (id, code, discount_percent, discount_max, valid_from, valid_until, max_uses, current_uses, is_active)
- `admin_users` (id, created_at)

Enable **Realtime** on the `trips` table.

Use Supabase Storage bucket `driver-documents` for document uploads.

---

## Design System

- **Primary**: #2563EB (blue)
- **Success**: #16A34A (green)
- **Danger**: #DC2626 (red)
- **Warning**: #F59E0B (amber)
- **Background**: #FFFFFF
- **Surface**: #F8FAFC
- **Text Primary**: #1E293B
- **Text Secondary**: #64748B
- **Border**: #E2E8F0
- **Border Radius**: 12px for cards, 8px for inputs, 50% for avatars
- **Shadow**: 0 2px 8px rgba(0,0,0,0.08) for cards
- **Font**: Inter (or system default)
- **Spacing**: 8px base unit (8, 16, 24, 32, 48)

---
