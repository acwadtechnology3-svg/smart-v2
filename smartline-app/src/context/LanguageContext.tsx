import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates';

type Language = 'en' | 'ar';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    isRTL: boolean;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
    language: 'ar',
    setLanguage: () => { },
    isRTL: true,
    t: (key) => key,
});

export const translations = {
    en: {
        // Sidebar & Menu
        wallet: 'Wallet',
        tripHistory: 'Trip History',
        earnings: 'Earnings',
        myVehicle: 'My Vehicle',
        support: 'Support',
        settings: 'Settings',
        signOut: 'Sign Out',
        viewProfile: 'View Profile',
        driver: 'Driver',
        language: 'Language',
        english: 'English',
        arabic: 'Arabic',
        switchLanguage: 'Switch Language',
        selectLanguage: 'Select Application Language',

        // Safety & Emergency
        safetyEmergency: 'Safety & Emergency',
        callEmergency: 'Call Emergency (122)',
        reportIncident: 'Report Incident',
        shareLocation: 'Share Live Location',
        cancel: 'Cancel',
        sendSOS: 'Send SOS Alert',
        sosSent: 'SOS Sent!',
        sosMessage: 'Help is on the way. Our emergency team has been notified of your location.',

        // Home Screen
        goOnline: 'GO ONLINE',
        goOffline: 'GO OFFLINE',
        findingTrips: 'Finding Trips...',
        accessBlocked: 'Access Blocked',
        balanceLow: 'Your wallet balance is below -100 EGP. Please deposit to continue receiving trips.',
        goToWallet: 'Go to Wallet',
        videoCall: 'Video Call',

        // Wallet
        currentBalance: 'Current Balance',
        deposit: 'Deposit',
        recentTransactions: 'Recent Transactions',
        noTransactions: 'No transactions yet',

        // History
        myTrips: 'My Trips',
        tripId: 'Trip ID',
        date: 'Date',
        price: 'Price',
        status: 'Status',
        completed: 'Completed',
        cancelled: 'Cancelled',

        // Common
        error: 'Error',
        success: 'Success',
        ok: 'OK',
        permissionDenied: 'Permission Denied',
        locationPermissionRequired: 'Location permission is required.',
        updateFailed: 'Failed to update settings',
        confirmLogout: 'Are you sure you want to log out?',
        account: 'Account',
        preferences: 'Preferences',

        // Trip Request
        newRequest: 'New Trip Request',
        accept: 'Accept',
        decline: 'Decline',
        bid: 'Bid',
        pickup: 'Pickup',
        dropoff: 'Dropoff',
        distance: 'Distance',
        estEarnings: 'Est. Earnings',

        // Earnings Screen
        totalBalance: 'Total Balance',
        availableWithdrawal: 'Available for withdrawal',
        today: 'Today',
        trips: 'Trips',
        hours: 'Hours',

        // My Vehicle Screen
        documentsStatus: 'Documents Status',
        driverLicense: 'Driver License',
        vehicleLicense: 'Vehicle License',
        nationalID: 'National ID',
        uploaded: 'Uploaded',
        missing: 'Missing',
        expires: 'Expires',
        uploadRequired: 'Upload Required',
        viewDocument: 'View Document',
        requestVehicleChange: 'Request Vehicle Change',
        vehicleChangePending: 'Vehicle Change Request Pending Approval',
        vehicleChangeRejected: 'Vehicle Change Rejected',
        loadingVehicleInfo: 'Loading vehicle info...',

        // Support Screen
        contactUs: 'Contact Us',
        callUs: 'Call Us',
        whatsapp: 'WhatsApp',
        myRequests: 'My Requests',
        newSupportRequest: 'New Request',
        startChat: 'Start Chat',
        whatIsYourIssue: 'What is your issue?',
        enterSubject: 'e.g. Payment Issue, App Bug...',
        noTickets: 'No support requests yet.',
        enterSubjectError: 'Please enter a subject',

        // Change Vehicle
        changeVehicle: 'Change Vehicle',
        vehicleType: 'Vehicle Type',
        vehicleModel: 'Vehicle Model',
        vehiclePlate: 'Vehicle Plate',
        licensePhotos: 'License Photos',
        vehiclePhotos: 'Vehicle Photos',
        licenseFront: 'License Front',
        licenseBack: 'License Back',
        front: 'Front',
        back: 'Back',
        rightSide: 'Right Side',
        leftSide: 'Left Side',
        submitRequest: 'Submit Request',
        fillVehicleInfo: 'Please fill in vehicle model and plate number.',
        uploadPending: 'Uploading...',
        car: 'Car',
        motorcycle: 'Motorcycle',
        taxi: 'Taxi',

        // Active Trip
        drivingToPickup: 'Driving to Pickup',
        atPickup: 'At Pickup Location',
        onTrip: 'On Trip',
        tripFinished: 'Trip Finished',
        tripCancelled: 'Trip Cancelled',
        passengerCancelled: 'The passenger has cancelled this trip.',
        arrivedAtPickup: 'ARRIVED AT PICKUP',
        startTrip: 'START TRIP',
        completeTrip: 'COMPLETE TRIP',
        refreshStatus: 'Refresh Status',
        payment: 'Payment',
        freeWaiting: 'Free Waiting Time',
        paidWaiting: 'Paid Waiting Time',
        // Role Selection
        welcomeTitle: 'Welcome to SmartLine',
        welcomeSubtitle: 'How would you like to use the app?',
        iNeedRide: 'I need a ride',
        bookRides: 'Book rides to your destination',
        iWantToDrive: 'I want to drive',
        earnMoney: 'Earn money on your schedule',
        changeRoleLater: 'You can change this later in settings',

        // Auth Flow
        enterPhoneNumber: 'Enter your phone number',
        weWillSendCode: "We'll send you a verification code",
        continue: 'Continue',
        verifyNumber: 'Verify your number',
        enterCodeSentTo: 'Enter the 4-digit code sent to',
        resendCode: 'Resend code',
        availableIn: 'Available in',
        verify: 'Verify',
        createAccount: 'Create your account',
        signUpAs: 'Sign up as a',
        fullName: 'Full Name',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        createAccountBtn: 'Create Account',
        enterPassword: 'Enter your password',
        welcomeBack: 'Welcome Back',
        login: 'Log In',
        pleaseFillAllFields: 'Please fill in all fields',
        passwordsDoNotMatch: 'Passwords do not match',
        signupFailed: 'Signup Failed. Please try again.',
        passenger: 'Passenger',
        enterPasswordFor: 'Enter password for',
        forgotPassword: 'Forgot password?',
        pleaseEnterPassword: 'Please enter your password',
        loginError: 'Login Error',
        loginFailed: 'Login Failed',
        accountNotDriver: 'This account is not registered as a Driver. Please sign up or login as Customer.',
        personalInfo: 'Personal Information',
        step: 'Step',
        of: 'of',
        nationalIdNumber: 'National ID Number',
        city: 'City',
        nextVehicleInfo: 'Next: Vehicle Info',
        nextProfilePhoto: 'Next: Profile Photo',
        nextDocuments: 'Next: Documents',
    },
    ar: {
        // Sidebar & Menu
        wallet: 'المحفظة',
        tripHistory: 'سجل الرحلات',
        earnings: 'الأرباح',
        myVehicle: 'عربيتي',
        support: 'المساعدة',
        settings: 'الإعدادات',
        signOut: 'خروج',
        viewProfile: 'الملف الشخصي',
        driver: 'سائق',
        language: 'اللغة',
        english: 'English',
        arabic: 'العربية',
        switchLanguage: 'تغيير اللغة',
        selectLanguage: 'اختر لغة التطبيق',

        // Safety & Emergency
        safetyEmergency: 'الطوارئ والأمان',
        callEmergency: 'اتصل بالطوارئ (122)',
        reportIncident: 'إبلاغ عن حادث',
        shareLocation: 'مشاركة الموقع المباشر',
        cancel: 'إلغاء',
        sendSOS: 'إرسال نداء استغاثة SOS',
        sosSent: 'تم إرسال الاستغاثة!',
        sosMessage: 'المساعدة في الطريق. تم إخطار فريق الطوارئ بموقعك.',

        // Home Screen
        goOnline: 'ابدأ العمل',
        goOffline: 'توقف عن العمل',
        findingTrips: 'جاري البحث عن رحلات...',
        accessBlocked: 'تم حظر الوصول',
        balanceLow: 'رصيد محفظتك أقل من -100 جنيه. يرجى الإيداع للمتابعة.',
        goToWallet: 'الذهاب للمحفظة',
        videoCall: 'مكالمة فيديو',

        // Wallet
        currentBalance: 'الرصيد الحالي',
        deposit: 'إيداع',
        recentTransactions: 'آخر المعاملات',
        noTransactions: 'لا يوجد معاملات حتى الآن',

        // History
        myTrips: 'رحلاتي',
        tripId: 'رقم الرحلة',
        date: 'التاريخ',
        price: 'السعر',
        status: 'الحالة',
        completed: 'مكتملة',
        cancelled: 'ملغاة',

        // Common
        error: 'خطأ',
        success: 'تم بنجاح',
        ok: 'حسناً',
        permissionDenied: 'تم رفض الإذن',
        locationPermissionRequired: 'مطلوب إذن الوصول للموقع.',
        updateFailed: 'فشل تحديث الإعدادات',
        confirmLogout: 'هل أنت متأكد من تسجيل الخروج؟',
        account: 'الحساب',
        preferences: 'التفضيلات',

        // Trip Request
        newRequest: 'طلب رحلة جديد',
        accept: 'قبول',
        decline: 'رفض',
        bid: 'عرض سعر',
        pickup: 'الاصطحاب',
        dropoff: 'الوجهة',
        distance: 'المسافة',
        estEarnings: 'الأرباح المتوقعة',

        // Earnings Screen
        totalBalance: 'الرصيد الكلي',
        availableWithdrawal: 'متاح للسحب',
        today: 'اليوم',
        trips: 'رحلات',
        hours: 'ساعات',
        // 'earnings' duplicate fixed

        // My Vehicle Screen
        // 'myVehicle' duplicate fixed
        documentsStatus: 'حالة المستندات',
        driverLicense: 'رخصة القيادة',
        vehicleLicense: 'رخصة السيارة',
        nationalID: 'الرقم القومي',
        uploaded: 'تم الرفع',
        missing: 'مفقود',
        expires: 'ينتهي في',
        uploadRequired: 'مطلوب الرفع',
        viewDocument: 'عرض المستند',
        requestVehicleChange: 'طلب تغيير السيارة',
        vehicleChangePending: 'طلب تغيير السيارة قيد المراجعة',
        vehicleChangeRejected: 'تم رفض طلب تغيير السيارة',
        loadingVehicleInfo: 'جاري تحميل بيانات السيارة...',

        // Support Screen
        contactUs: 'تواصل معنا',
        callUs: 'اتصل بنا',
        whatsapp: 'واتساب',
        myRequests: 'طلباتي',
        newSupportRequest: 'طلب جديد',
        startChat: 'بدء المحادثة',
        whatIsYourIssue: 'ما هي مشكلتك؟',
        enterSubject: 'مثال: مشكلة في الدفع، خطأ في التطبيق...',
        noTickets: 'لا يوجد طلبات مساعدة حتى الآن.',
        enterSubjectError: 'يرجى إدخال الموضوع',

        // Change Vehicle
        changeVehicle: 'تغيير السيارة',
        vehicleType: 'نوع السيارة',
        vehicleModel: 'موديل السيارة',
        vehiclePlate: 'رقم اللوحة',
        licensePhotos: 'صور الرخصة',
        vehiclePhotos: 'صور السيارة',
        licenseFront: 'الرخصة (أمام)',
        licenseBack: 'الرخصة (خلف)',
        front: 'أمام',
        back: 'خلف',
        rightSide: 'يمين',
        leftSide: 'يسار',
        submitRequest: 'إرسال الطلب',
        fillVehicleInfo: 'يرجى إدخال موديل السيارة ورقم اللوحة',
        uploadPending: 'جاري الرفع...',
        car: 'سيارة',
        motorcycle: 'دراجة نارية',
        taxi: 'تاكسي',

        // Active Trip
        drivingToPickup: 'في الطريق للراكب',
        atPickup: 'في نقطة الالتقاء',
        onTrip: 'في الرحلة',
        tripFinished: 'انتهت الرحلة',
        tripCancelled: 'تم إلغاء الرحلة',
        passengerCancelled: 'قام الراكب بإلغاء الرحلة.',
        arrivedAtPickup: 'وصلت لنقطة الالتقاء',
        startTrip: 'بدء الرحلة',
        completeTrip: 'إنهاء الرحلة',
        refreshStatus: 'تحديث الحالة',
        payment: 'الدفع',
        // Role Selection
        welcomeTitle: 'أهلاً بيك في سمارت لاين',
        welcomeSubtitle: 'تحب تستخدم التطبيق إزاي؟',
        iNeedRide: 'عايز عربية توصلني',
        bookRides: 'اطلب رحلة ووصل بالسلامة',
        iWantToDrive: 'معايا عربية وعايز اشتغل',
        earnMoney: 'زود دخلك واشتغل في الوقت اللي يناسبك',
        changeRoleLater: 'متقلقش، ممكن تغير اختيارك ده بعدين',

        // Auth Flow
        enterPhoneNumber: 'دخل رقم موبايلك',
        weWillSendCode: 'هبعتلك كود تأكيد في رسالة',
        continue: 'كمل',
        verifyNumber: 'تأكيد الرقم',
        enterCodeSentTo: 'دخل الكود اللي وصلك على',
        resendCode: 'إعادة إرسال الكود',
        availableIn: 'متاح خلال',
        verify: 'تأكيد',
        createAccount: 'إنشاء حساب جديد',
        signUpAs: 'تسجيل كـ',
        fullName: 'الاسم بالكامل',
        email: 'البريد الإلكتروني',
        password: 'كلمة السر',
        confirmPassword: 'تأكيد كلمة السر',
        createAccountBtn: 'إنشاء الحساب',
        enterPassword: 'دخل كلمة السر',
        welcomeBack: 'أهلاً بيك تاني',
        login: 'تسجيل الدخول',
        pleaseFillAllFields: 'من فضلك املأ كل البيانات',
        passwordsDoNotMatch: 'كلمة السر مش زي بعض',
        signupFailed: 'فشل إنشاء الحساب، حاول تاني',
        passenger: 'راكب',
        enterPasswordFor: 'دخل كلمة السر لرقم',
        forgotPassword: 'نسيت كلمة السر؟',
        pleaseEnterPassword: 'من فضلك دخل كلمة السر',
        loginError: 'خطأ في التسجيل',
        loginFailed: 'فشل تسجيل الدخول',
        accountNotDriver: 'الحساب ده مش متسجل كسائق. من فضلك سجل حساب جديد أو ادخل كعميل.',
        personalInfo: 'بيانات شخصية',
        step: 'خطوة',
        of: 'من',
        nationalIdNumber: 'رقم البطاقة (14 رقم)',
        city: 'المدينة',
        nextVehicleInfo: 'التالي: بيانات العربية',
        nextProfilePhoto: 'التالي: الصورة الشخصية',
        nextDocuments: 'التالي: المستندات',
    }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>('ar');

    useEffect(() => {
        loadLanguage();
    }, []);

    const loadLanguage = async () => {
        try {
            const storedLang = await AsyncStorage.getItem('appLanguage');
            if (storedLang === 'ar' || storedLang === 'en') {
                setLanguageState(storedLang);
            }
        } catch (e) {
            console.error("Failed to load language", e);
        }
    };

    const setLanguage = async (lang: Language) => {
        try {
            await AsyncStorage.setItem('appLanguage', lang);
            setLanguageState(lang);
            // Handle RTL logic here if needed beyond React Context
        } catch (e) {
            console.error("Failed to save language", e);
        }
    };

    const t = (key: string) => {
        const keys = key.split('.');
        let value: any = translations[language];
        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                return key; // Fallback to key if not found
            }
        }
        return value as string;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, isRTL: language === 'ar', t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
