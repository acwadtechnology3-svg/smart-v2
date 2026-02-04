export type RootStackParamList = {
    SplashScreen: undefined;
    RoleSelection: undefined;
    PhoneInput: { role: 'customer' | 'driver' };
    Password: { phone: string; role: 'customer' | 'driver' };
    Signup: { phone: string; role: 'customer' | 'driver' };
    CustomerHome: undefined;
    DriverHome: undefined;
    DriverSignup: { phone: string };
    DriverVehicle: { phone: string; name: string; nationalId: string; city: string };
    DriverProfilePhoto: { phone: string; name: string; nationalId: string; city: string; vehicleType: string; vehicleModel: string; vehiclePlate: string };
    DriverDocuments: { phone: string; name: string; nationalId: string; city: string; vehicleType: string; vehicleModel: string; vehiclePlate: string; profilePhoto: string };
    DriverWaiting: undefined;
    OTPVerification: { phone: string; role: 'customer' | 'driver'; purpose?: 'signup' | 'reset-password' };
    ResetPassword: { phone: string };
    SearchLocation: {
        selectedAddress?: string;
        selectedCoordinates?: { latitude: number; longitude: number };
        field?: 'pickup' | 'destination';
    } | undefined;
    LocationPicker: { field: 'pickup' | 'destination' };
    TripOptions: { pickup: string; destination: string; destinationCoordinates?: [number, number] };
    SearchingDriver: { tripId: string };
    DriverFound: { tripId: string; driver?: any };
    OnTrip: { tripId: string };
    TripComplete: { tripId: string };
    Wallet: undefined;
    MyTrips: undefined;
    Discounts: undefined;
    Help: undefined;
    Messages: undefined;
    Chat: { driverName: string; tripId?: string; role?: 'customer' | 'driver' };
    Safety: { tripId?: string };
    Settings: undefined;
    PersonalInformation: undefined;
    InviteFriends: undefined;
    Scan: undefined;

    // Driver Routes
    DriverHistory: undefined;
    DriverEarnings: undefined;
    DriverMyVehicle: undefined;
    DriverSupport: undefined;
    DriverActiveTrip: { tripId: string };
    DriverWallet: undefined;
    DriverChangeVehicle: undefined;
    SupportChat: { ticketId?: string; subject?: string };
    DriverDestinations: undefined;
};
