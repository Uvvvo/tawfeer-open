/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { Dashboard } from './screens/Dashboard';
import { CategoryItem } from './components/CategoryItem';
import { SavingsScreen } from './screens/SavingsScreen';
import { SettingsItem } from './components/SettingsItem';
import { 
  Home, 
  BarChart2, 
  PlusCircle, 
  Settings, 
  Bell, 
  TrendingUp, 
  TrendingDown,
  Utensils,
  Bus,
  School,
  Home as HomeIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  DollarSign,
  Car,
  LogOut,
  Diamond,
  Moon,
  Smartphone,
  CreditCard,
  ShoppingBag,
  Gamepad2,
  MoreHorizontal,
  History,
  Calendar,
  RefreshCcw,
  Clock,
  Trash2,
  Pencil,
  Plus,
  X,
  Maximize,
  Minimize,
  AlertTriangle,
  AlertCircle,
  Info,
  Target,
  Sparkles,
  Search,
  Download,
  ShieldCheck,
  Briefcase,
  Zap,
  Landmark,
  Shield,
  ShieldOff,
  EyeOff,
  Eye,
  Camera,
  Share2,
  FileSpreadsheet,
  LayoutDashboard,
  Brain,
  Globe,
  Lock,
  ArrowLeftRight,
  Plane,
  Laptop,
  Heart,
  Gift,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';
import { format, subDays, startOfMonth, startOfYear, isAfter, subMonths, addDays, addMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  FileUp, 
  FileText, 
  Upload,
  Cloud,
  CloudOff,
  User as UserIcon,
  CheckCircle,
  Receipt,
  Wallet,
  Building,
  ClipboardList,
  LineChart as LineChartIcon,
  Crosshair,
  Scale,
  Shapes,
  Tags,
  BadgePercent,
  Banknote,
  Repeat,
  HelpCircle,
  Cpu,
  Instagram,
  Mail,
  Send,
  Tag,
  Mic,
  Square
} from 'lucide-react';

// Firebase imports
import { 
  db, 
  auth, 
  googleProvider, 
  signInWithPopup, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword,
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy,
  doc,
  deleteDoc,
  getDocFromServer,
  User,
  updateDoc,
  signInWithRedirect,
  getRedirectResult,
  isFirebaseConfigured,
  handleFirestoreError
} from './lib/firebase';
import { 
  signOut
} from 'firebase/auth';
import { setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';

import { fetchIqdRate, MARKET_RATE_FALLBACK } from './services/currencyService';

const ICON_COMPONENTS: Record<string, any> = {
  Home, 
  BarChart2, 
  PlusCircle, 
  Settings, 
  Bell, 
  TrendingUp, 
  TrendingDown,
  Utensils,
  Bus,
  School,
  HomeIcon,
  ChevronLeft,
  DollarSign,
  Car,
  LogOut,
  Diamond,
  Moon,
  Smartphone,
  CreditCard,
  ShoppingBag,
  Gamepad2,
  MoreHorizontal,
  History,
  Calendar,
  RefreshCcw,
  Clock,
  Trash2,
  Pencil,
  Plus,
  X,
  Maximize,
  Minimize,
  AlertTriangle,
  Target,
  Sparkles,
  Search,
  Download,
  ShieldCheck,
  Briefcase,
  Zap,
  Landmark,
  Shield,
  ShieldOff,
  EyeOff,
  Eye,
  Camera,
  Share2,
  FileSpreadsheet,
  UserIcon,
  FileUp,
  FileText,
  Upload,
  Cloud,
  CloudOff,
  Plane,
  Laptop,
  Heart
};

export const IconRenderer = ({ icon, fallback: FallbackComp = MoreHorizontal, ...props }: { icon: any, fallback?: any, [key: string]: any }) => {
  if (!icon) return FallbackComp ? <FallbackComp {...props} /> : null;
  if (typeof icon === 'function') {
    const IconComp = icon;
    return <IconComp {...props} />;
  }
  const IconComp = ICON_COMPONENTS[icon as string] || FallbackComp;
  return <IconComp {...props} />;
};

// Utils
const sanitizeForFirestore = (data: any): any => {
  if (data === null || data === undefined) return null;
  
  // Handle basic types
  const type = typeof data;
  if (type === 'string' || type === 'number' || type === 'boolean') return data;
  
  // Explicitly handle symbols to avoid ID: 3029
  if (type === 'symbol') return data.toString();
  
  // Handle functions (React Components)
  if (type === 'function') {
    return data.displayName || data.name || 'Component';
  }
  
  // Handle Date
  if (data instanceof Date) return data;
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)).filter(item => item !== undefined);
  }
  
  // Handle objects
  if (type === 'object') {
    // Prevent React elements or complex objects from leaking
    if (data.$$typeof) return 'ReactComponent';
    
    // Check for Firestore FieldValue or Timestamp to avoid mangling them
    // These objects usually have a specific internal structure or constructor name
    const constructorName = data.constructor?.name;
    if (constructorName === 'FieldValue' || constructorName === 'Timestamp' || typeof data._methodName === 'string') {
      return data;
    }

    const sanitized: any = {};
    // Use Object.keys to only iterate over string properties and avoid inherited ones or symbols
    const keys = Object.keys(data);
    let hasData = false;
    
    for (const key of keys) {
      // Skip internal React/Private properties
      if (key.startsWith('$$') || key.startsWith('__')) continue;
      
      const value = data[key];
      if (value !== undefined) {
        const cleaned = sanitizeForFirestore(value);
        if (cleaned !== undefined) {
          sanitized[key] = cleaned;
          hasData = true;
        }
      }
    }
    return hasData ? sanitized : null;
  }
  
  return null;
};

const formatMoney = (amount: number, isPrivacyMode: boolean = false, displayCurrency: string = 'IQD', rate: number = 1310) => {
  if (isPrivacyMode) return '•••• ' + (displayCurrency === 'IQD' ? 'د.ع' : '$');
  
  // Base is IQD. If display is USD, convert IQD to USD.
  const convertedAmount = displayCurrency === 'USD' ? amount / rate : amount;
  const fractionDigits = displayCurrency === 'USD' ? 2 : 0;
  
  return `${convertedAmount.toLocaleString('en-US', { 
    minimumFractionDigits: fractionDigits, 
    maximumFractionDigits: fractionDigits 
  })} ${displayCurrency === 'IQD' ? 'د.ع' : '$'}`;
};

// Types
export type Tab = 'home' | 'expenses' | 'reports' | 'budgets' | 'accounts' | 'settings' | 'accountHistory';

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  date: Date;
  icon: any;
  color: string;
  isRecurring?: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  notes?: string;
  tags?: string[];
  iconUrl?: string;
  accountId?: string;
  toAccountId?: string;
}

interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'wallet' | 'card';
  cardNetwork?: 'visa' | 'mastercard' | 'zaincash' | 'qicard' | 'other';
  last4?: string;
  initialBalance?: number;
  balance: number;
  icon?: any;
  color: string;
  currency?: string;
}

interface Debt {
  id: string;
  personName: string;
  amount: number;
  paidAmount?: number;
  dueDate: Date;
  type: 'owe' | 'owed'; // owe = on me, owed = for me
  status: 'active' | 'paid';
  createdAt: Date;
  description?: string;
}

interface SavingChallenge {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  durationInWeeks: number;
  startDate: Date;
  status: 'active' | 'completed';
}

interface Category {
  id: string;
  label: string;
  icon: any;
  color: string;
  bgColor: string;
  iconUrl?: string;
}

interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  icon: any;
  color: string;
}

interface Budget {
  id: string;
  categoryId: string;
  limit: number;
  period: 'monthly';
  createdAt?: any;
}

interface Palette {
  id: string;
  name: string;
  primary: string;
  light: string;
}

interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: Date;
  type: 'info' | 'warning' | 'success';
  isRead: boolean;
  transactionId?: string;
}

// Note: Real data from Firebase replaces these arrays
const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', label: 'طعام ومشروبات', icon: 'Utensils', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  { id: '2', label: 'مواصلات', icon: 'Bus', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  { id: '3', label: 'سكن وفواتير', icon: 'HomeIcon', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  { id: '4', label: 'تسوق', icon: 'ShoppingBag', color: 'text-pink-400', bgColor: 'bg-pink-500/10' },
  { id: '5', label: 'صحة', icon: 'Heart', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  { id: '6', label: 'ترفيه', icon: 'Gamepad2', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10' },
  { id: '7', label: 'تعليم', icon: 'School', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  { id: '8', label: 'سفر', icon: 'Plane', color: 'text-sky-400', bgColor: 'bg-sky-500/10' },
  { id: '9', label: 'اشتراكات', icon: 'Laptop', color: 'text-rose-400', bgColor: 'bg-rose-500/10' },
  { id: '10', label: 'أخرى', icon: 'MoreHorizontal', color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
];

const PALETTES: Palette[] = [
  { id: 'indigo', name: 'نيلي ملكي', primary: '99 102 241', light: '168 85 247' },
  { id: 'emerald', name: 'زمردي حيوي', primary: '16 185 129', light: '59 130 246' },
  { id: 'rose', name: 'ورد عاطفي', primary: '244 63 94', light: '251 146 60' },
  { id: 'amber', name: 'عنبري دافئ', primary: '245 158 11', light: '239 68 68' },
];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  
  const [currentPalette, setCurrentPalette] = useState<Palette>(PALETTES[0]);

  const [isFullScreen, setIsFullScreen] = useState(false);

  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [autoCategories, setAutoCategories] = useState<Record<string, string>>({});

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [challenges, setChallenges] = useState<SavingChallenge[]>([]);
  const [isPrivacyMode, setIsPrivacyMode] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currency, setCurrency] = useState('IQD');
  const [exchangeRate, setExchangeRate] = useState(MARKET_RATE_FALLBACK);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isDataLoading, setIsDataLoading] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const getRate = async () => {
      const rate = await fetchIqdRate();
      setExchangeRate(rate);
    };
    getRate();
    // Refresh rate every 12 hours
    const interval = setInterval(getRate, 12 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.className = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);
  const [isSecurityEnabled, setIsSecurityEnabled] = useState(false);
  const [securityEmail, setSecurityEmail] = useState('');

  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  const [showCategorySettings, setShowCategorySettings] = useState(false);

  const [loginError, setLoginError] = useState('');
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [emailAuthInput, setEmailAuthInput] = useState({
    name: '',
    age: '',
    email: '',
    password: ''
  });
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const triggerSecurityAlert = (title: string, message: string) => {
    if (!isSecurityEnabled) return;

    // Send in-app notification
    const newNotif: AppNotification = {
      id: `sec-${Date.now()}`,
      title,
      message,
      date: new Date(),
      type: 'warning',
      isRead: false
    };
    setNotifications(prev => [newNotif, ...prev]);

    // Simulate sending email
    if (securityEmail) {
      console.log(`[SECURITY ALERT] Email sent to ${securityEmail}: ${title} - ${message}`);
    }
  };

  // Sync with Firebase
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setTransactions([]);
        setGoals([]);
        setBudgets([]);
        setAccounts([]);
        setDebts([]);
        setChallenges([]);
        setNotifications([]);
      }
    });

    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        setIsSecurityEnabled(true);
        if (result.user.email) setSecurityEmail(result.user.email);
        
        const newNotif: AppNotification = {
          id: `sec-${Date.now()}`,
          title: 'تنبيه تسجيل دخول',
          message: `تم تسجيل الدخول إلى حسابك بنجاح باستخدام ${result.user.email || 'ايميلك'} في ${new Date().toLocaleTimeString('ar-IQ')}`,
          date: new Date(),
          type: 'warning',
          isRead: false
        };
        setNotifications(prev => [newNotif, ...prev]);
      }
    }).catch((error) => {
      console.error("Redirect login failed:", error);
      setLoginError(error.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول عبر التوجيه');
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user || !db) {
      setIsDataLoading(false);
      return;
    }

    setIsDataLoading(true);

    // Profile Settings
    const profileRef = doc(db, `users/${user.uid}`);
    const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.isPremium !== undefined) {
          setIsPremium(data.isPremium);
        }
      }
    }, (error) => handleFirestoreError(error, 'get', `users/${user.uid}`));

    // Categories
    const qCat = query(collection(db, `users/${user.uid}/categories`));
    const unsubscribeCat = onSnapshot(qCat, (snapshot) => {
      if (snapshot.empty) {
        setCategories(DEFAULT_CATEGORIES);
      } else {
        const catList = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
        })) as Category[];
        setCategories(catList);
      }
    }, (error) => handleFirestoreError(error, 'list', 'categories'));
    
    // Auto Categories
    const qAuto = query(collection(db, `users/${user.uid}/autoCategories`));
    const unsubscribeAuto = onSnapshot(qAuto, (snapshot) => {
      const mapping: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        mapping[doc.id] = doc.data().categoryId;
      });
      setAutoCategories(mapping);
    }, (error) => handleFirestoreError(error, 'list', 'autoCategories'));

    // Sync Transactions
    const q = query(
      collection(db, `users/${user.uid}/transactions`),
      orderBy('date', 'desc')
    );
    
    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      setIsDataLoading(false);
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          date: data.date?.toDate() || new Date(),
        } as Transaction;
      });
      if (docs.length > 0) {
        setTransactions(docs);
      }
    }, (error) => handleFirestoreError(error, 'list', `users/${user.uid}/transactions`));

    // Sync Goals
    const goalsQ = query(collection(db, `users/${user.uid}/goals`));
    const unsubscribeGoals = onSnapshot(goalsQ, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      }) as Goal);
      if (docs.length > 0) {
        setGoals(docs);
      }
    }, (error) => handleFirestoreError(error, 'list', `users/${user.uid}/goals`));

    // Sync Budgets
    const budgetsQ = query(collection(db, `users/${user.uid}/budgets`));
    const unsubscribeBudgets = onSnapshot(budgetsQ, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      }) as Budget);
      setBudgets(docs);
    }, (error) => handleFirestoreError(error, 'list', `users/${user.uid}/budgets`));

    // Sync Accounts
    const accountsQ = query(collection(db, `users/${user.uid}/accounts`));
    const unsubscribeAccounts = onSnapshot(accountsQ, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      }) as Account);
      if (docs.length > 0) setAccounts(docs);
    }, (error) => handleFirestoreError(error, 'list', `users/${user.uid}/accounts`));

    // Sync Debts
    const debtsQ = query(collection(db, `users/${user.uid}/debts`), orderBy('createdAt', 'desc'));
    const unsubscribeDebts = onSnapshot(debtsQ, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        dueDate: doc.data().dueDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }) as Debt);
      setDebts(docs);
    }, (error) => handleFirestoreError(error, 'list', `users/${user.uid}/debts`));

    // Sync Challenges
    const challengesQ = query(collection(db, `users/${user.uid}/challenges`));
    const unsubscribeChallenges = onSnapshot(challengesQ, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        startDate: doc.data().startDate?.toDate() || new Date(),
      }) as SavingChallenge);
      setChallenges(docs);
    }, (error) => handleFirestoreError(error, 'list', `users/${user.uid}/challenges`));

    return () => {
      unsubscribeProfile();
      unsubscribeCat();
      unsubscribeAuto();
      unsubscribeTransactions();
      unsubscribeGoals();
      unsubscribeBudgets();
      unsubscribeAccounts();
      unsubscribeDebts();
      unsubscribeChallenges();
    };
  }, [user]);

  // Check redirect result on load for MFA or login errors
  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) return;
    // Critical: Test Firestore connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  const handleLogin = async () => {
    if (!isFirebaseConfigured || !auth) {
      setLoginError('يرجى تهيئة Firebase أولاً في الإعدادات');
      return;
    }
    setIsAuthLoading(true);
    try {
      setLoginError('');
      
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.matchMedia('(display-mode: standalone)').matches;
      
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        
        if (result.user) {
          setIsSecurityEnabled(true);
          if (result.user.email) setSecurityEmail(result.user.email);
          
          const newNotif: AppNotification = {
            id: `sec-${Date.now()}`,
            title: 'تنبيه تسجيل دخول',
            message: `تم تسجيل الدخول إلى حسابك بنجاح باستخدام ${result.user.email || 'ايميلك'} في ${new Date().toLocaleTimeString('ar-IQ')}`,
            date: new Date(),
            type: 'warning',
            isRead: false
          };
          setNotifications(prev => [newNotif, ...prev]);
          console.log(`تم إرسال إيميل تنبيه إلى: ${result.user.email || 'المستخدم'}`);
        }
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      setLoginError(error.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured || !auth) {
      setLoginError('يرجى تهيئة Firebase أولاً في الإعدادات');
      return;
    }
    
    if (!emailAuthInput.email || !emailAuthInput.password) {
      setLoginError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    if (loginMode === 'register' && (!emailAuthInput.name || !emailAuthInput.age)) {
       setLoginError('يرجى إدخال جميع البيانات المطلوبة');
       return;
    }

    setIsAuthLoading(true);
    setLoginError('');
    
    try {
      if (loginMode === 'login') {
        const result = await signInWithEmailAndPassword(auth, emailAuthInput.email, emailAuthInput.password);
        if (result.user) {
          setIsSecurityEnabled(true);
          if (result.user.email) setSecurityEmail(result.user.email);
          const newNotif: AppNotification = {
            id: `sec-${Date.now()}`,
            title: 'تنبيه تسجيل دخول',
            message: `تم تسجيل الدخول إلى حسابك بنجاح باستخدام ${result.user.email || 'ايميلك'} في ${new Date().toLocaleTimeString('ar-IQ')}`,
            date: new Date(),
            type: 'warning',
            isRead: false
          };
          setNotifications(prev => [newNotif, ...prev]);
        }
      } else {
        const result = await createUserWithEmailAndPassword(auth, emailAuthInput.email, emailAuthInput.password);
        if (result.user) {
          await updateProfile(result.user, {
             displayName: emailAuthInput.name
          });
          
          setIsSecurityEnabled(true);
          if (result.user.email) setSecurityEmail(result.user.email);
          const newNotif: AppNotification = {
            id: `sec-${Date.now()}`,
            title: 'مرحباً في توفير',
            message: `تم إنشاء حسابك بنجاح، أهلاً بك ${emailAuthInput.name}!`,
            date: new Date(),
            type: 'success',
            isRead: false
          };
          setNotifications(prev => [newNotif, ...prev]);
        }
      }
    } catch (error: any) {
      console.error("Email auth failed:", error);
      
      let errorMsg = 'حدث خطأ متعلق بتسجيل الدخول';
      if (error.code === 'auth/email-already-in-use') errorMsg = 'البريد الإلكتروني هذا مستخدم بالفعل.';
      else if (error.code === 'auth/invalid-email') errorMsg = 'البريد الإلكتروني غير صالح.';
      else if (error.code === 'auth/weak-password') errorMsg = 'كلمة المرور ضعيفة. يرجى اختيار كلمة مرور أقوى.';
      else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') errorMsg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';

      setLoginError(errorMsg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setTransactions([]);
      setGoals([]);
      setBudgets([]);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

const syncAddTransaction = async (t: Transaction) => {
    if (user && db) {
      try {
        const amountInIqd = currency === 'USD' ? t.amount * exchangeRate : t.amount;
        const { id, ...data } = t;
        const sanitizedData = sanitizeForFirestore(data);
        if (sanitizedData) {
          const batch = writeBatch(db);
          
          // 1. Add transaction
          const txRef = doc(collection(db, `users/${user.uid}/transactions`));
          batch.set(txRef, {
            ...sanitizedData,
            amount: amountInIqd,
            createdAt: serverTimestamp()
          });

          // 2. Update account balance
          if (t.accountId) {
            const accRef = doc(db, `users/${user.uid}/accounts`, t.accountId);
            const balanceChange = t.type === 'income' ? amountInIqd : -amountInIqd;
            const account = accounts.find(a => a.id === t.accountId);
            if (account) {
              batch.update(accRef, { balance: account.balance + balanceChange });
            }
          }
          
          // 3. Handle transfers (second account)
          if (t.type === 'transfer' && t.toAccountId) {
            const toAccRef = doc(db, `users/${user.uid}/accounts`, t.toAccountId);
            const toAccount = accounts.find(a => a.id === t.toAccountId);
            if (toAccount) {
              batch.update(toAccRef, { balance: toAccount.balance + amountInIqd });
            }
          }

          await batch.commit();
          setNotifications(prev => [{ id: Date.now().toString(), type: 'success', title: 'تمت الإضافة', message: 'تم إضافة المعاملة بنجاح.', date: new Date(), isRead: false }, ...prev]);
        }
      } catch (error) {
        handleFirestoreError(error, 'create', `users/${user.uid}/transactions`);
      }
    } else {
      const amountInIqd = currency === 'USD' ? t.amount * exchangeRate : t.amount;
      const updatedTx = { ...t, amount: amountInIqd };
      setTransactions(prev => [updatedTx, ...prev]);
      
      // Update local account balance
      if (t.accountId) {
        setAccounts(prev => prev.map(a => {
          if (a.id === t.accountId) {
            const balanceChange = t.type === 'income' ? amountInIqd : -amountInIqd;
            return { ...a, balance: a.balance + balanceChange };
          }
          return a;
        }));
      }
      if (t.type === 'transfer' && t.toAccountId) {
        setAccounts(prev => prev.map(a => {
          if (a.id === t.toAccountId) {
            return { ...a, balance: a.balance + amountInIqd };
          }
          return a;
        }));
      }
      setNotifications(prev => [{ id: Date.now().toString(), type: 'success', title: 'تمت الإضافة', message: 'تم إضافة المعاملة محلياً.', date: new Date(), isRead: false }, ...prev]);
    }
  };

  const syncAddGoal = async (g: Goal) => {
    if (user && db) {
      try {
        const { id, ...data } = g;
        const sanitizedData = sanitizeForFirestore(data);
        if (sanitizedData) {
          await addDoc(collection(db, `users/${user.uid}/goals`), {
            ...sanitizedData,
            createdAt: serverTimestamp()
          });
        }
      } catch (error) {
        handleFirestoreError(error, 'create', `users/${user.uid}/goals`);
      }
    } else {
      setGoals(prev => [g, ...prev]);
    }
  };

  const syncAddBudget = async (b: Omit<Budget, 'id'>) => {
    if (user && db) {
      try {
        const sanitizedData = sanitizeForFirestore(b);
        if (sanitizedData) {
          await addDoc(collection(db, `users/${user.uid}/budgets`), {
            ...sanitizedData,
            createdAt: serverTimestamp()
          });
        }
      } catch (error) {
        handleFirestoreError(error, 'create', `users/${user.uid}/budgets`);
      }
    } else {
      const newBudget = { ...b, id: Date.now().toString() };
      setBudgets(prev => [...prev, newBudget]);
    }
  };

  const syncDeleteBudget = async (id: string) => {
    if (user && db) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/budgets`, id));
      } catch (error) {
        handleFirestoreError(error, 'delete', `users/${user.uid}/budgets/${id}`);
      }
    } else {
      setBudgets(prev => prev.filter(b => b.id !== id));
    }
  };

  const syncAddAccount = async (account: Omit<Account, 'id'>) => {
    if (user && db) {
      try {
        const sanitizedData = sanitizeForFirestore(account);
        if (sanitizedData) {
          await addDoc(collection(db, `users/${user.uid}/accounts`), sanitizedData);
        }
      } catch (error) {
        handleFirestoreError(error, 'create', `users/${user.uid}/accounts`);
      }
    } else {
      const newAccount = { ...account, id: Date.now().toString() };
      setAccounts(prev => [...prev, newAccount]);
    }
  };

  const syncUpdateAccount = async (id: string, updates: Partial<Account>) => {
    if (user && db) {
      try {
        const sanitizedUpdates = sanitizeForFirestore(updates);
        if (sanitizedUpdates) {
          await updateDoc(doc(db, `users/${user.uid}/accounts`, id), sanitizedUpdates);
        }
      } catch (error) {
        handleFirestoreError(error, 'update', `users/${user.uid}/accounts/${id}`);
      }
    } else {
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    }
  };

  const syncDeleteAccount = async (id: string) => {
    if (user && db) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/accounts`, id));
      } catch (error) {
        handleFirestoreError(error, 'delete', `users/${user.uid}/accounts/${id}`);
      }
    } else {
      setAccounts(prev => prev.filter(a => a.id !== id));
    }
  };

  const syncDeleteTransaction = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    if (user && db) {
      try {
        const batch = writeBatch(db);
        
        // 1. Delete transaction
        batch.delete(doc(db, `users/${user.uid}/transactions`, id));

        // 2. Reverse account balance update
        if (tx.accountId) {
          const accRef = doc(db, `users/${user.uid}/accounts`, tx.accountId);
          const balanceChange = tx.type === 'income' ? -tx.amount : tx.amount;
          const account = accounts.find(a => a.id === tx.accountId);
          if (account) {
            batch.update(accRef, { balance: account.balance + balanceChange });
          }
        }
        
        // 3. Handle transfers (reverse second account)
        if (tx.type === 'transfer' && tx.toAccountId) {
          const toAccRef = doc(db, `users/${user.uid}/accounts`, tx.toAccountId);
          const toAccount = accounts.find(a => a.id === tx.toAccountId);
          if (toAccount) {
            batch.update(toAccRef, { balance: toAccount.balance - tx.amount });
          }
        }

        await batch.commit();
        setNotifications(prev => [{ id: Date.now().toString(), type: 'success', title: 'تم الحذف', message: 'تم حذف المعاملة بنجاح.', date: new Date(), isRead: false }, ...prev]);
      } catch (error) {
        handleFirestoreError(error, 'delete', `users/${user.uid}/transactions/${id}`);
      }
    } else {
      setTransactions(prev => prev.filter(t => t.id !== id));
      
      // Update local account balance
      if (tx.accountId) {
        setAccounts(prev => prev.map(a => {
          if (a.id === tx.accountId) {
            const balanceChange = tx.type === 'income' ? -tx.amount : tx.amount;
            return { ...a, balance: a.balance + balanceChange };
          }
          return a;
        }));
      }
      if (tx.type === 'transfer' && tx.toAccountId) {
        setAccounts(prev => prev.map(a => {
          if (a.id === tx.toAccountId) {
            return { ...a, balance: a.balance - tx.amount };
          }
          return a;
        }));
      }
      setNotifications(prev => [{ id: Date.now().toString(), type: 'success', title: 'تم الحذف', message: 'تم حذف المعاملة محلياً.', date: new Date(), isRead: false }, ...prev]);
    }
  };

  const syncDeleteGoal = async (id: string) => {
    if (user && db) {
      await deleteDoc(doc(db, `users/${user.uid}/goals`, id));
    } else {
      setGoals(prev => prev.filter(g => g.id !== id));
    }
  };

  const syncAddCategory = async (newCat: any) => {
    if (user && db) {
      try {
        const sanitized = sanitizeForFirestore(newCat);
        if (sanitized) {
          await addDoc(collection(db, `users/${user.uid}/categories`), sanitized);
        }
      } catch (error) {
        handleFirestoreError(error, 'create', 'categories');
      }
    } else {
      setCategories(prev => [...prev, { ...newCat, id: Date.now().toString() }]);
    }
  };

  const syncDeleteCategory = async (id: string) => {
    if (user && db) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/categories`, id));
      } catch (error) {
        handleFirestoreError(error, 'delete', 'categories');
      }
    } else {
      setCategories(prev => prev.filter(c => c.id !== id));
    }
  };

  const syncAddDebt = async (debt: Omit<Debt, 'id'>) => {
    if (user && db) {
      try {
        const sanitizedData = sanitizeForFirestore(debt);
        if (sanitizedData) {
          await addDoc(collection(db, `users/${user.uid}/debts`), {
            ...sanitizedData,
            createdAt: serverTimestamp()
          });
        }
      } catch (error) {
        handleFirestoreError(error, 'create', `users/${user.uid}/debts`);
      }
    } else {
      const newDebt = { ...debt, id: Date.now().toString(), createdAt: new Date() } as Debt;
      setDebts(prev => [newDebt, ...prev]);
    }
  };

  const syncUpdateDebt = async (id: string, updates: Partial<Debt>) => {
    setDebts(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    
    if (user && db) {
      try {
        const sanitizedUpdates = sanitizeForFirestore(updates);
        if (sanitizedUpdates) {
          await updateDoc(doc(db, `users/${user.uid}/debts`, id), sanitizedUpdates);
        }
      } catch (error) {
        handleFirestoreError(error, 'update', `users/${user.uid}/debts/${id}`);
      }
    }
  };

  const syncAddChallenge = async (challenge: Omit<SavingChallenge, 'id'>) => {
    if (user && db) {
      try {
        const sanitizedData = sanitizeForFirestore(challenge);
        if (sanitizedData) {
          await addDoc(collection(db, `users/${user.uid}/challenges`), {
            ...sanitizedData,
            createdAt: serverTimestamp()
          });
        }
      } catch (error) {
        handleFirestoreError(error, 'create', `users/${user.uid}/challenges`);
      }
    } else {
      const newChallenge = { ...challenge, id: Date.now().toString() } as SavingChallenge;
      setChallenges(prev => [...prev, newChallenge]);
    }
  };

  useEffect(() => {
    // Generate reminders for recurring transactions
    const checkRecurring = () => {
      const now = new Date();
      const recurringExpenses = transactions.filter(t => t.isRecurring && t.type === 'expense');
      
      const newNotifs: AppNotification[] = [];
      
      recurringExpenses.forEach(t => {
        // Check if we already notified for this transaction this month
        const alreadyNotified = notifications.find(n => 
          n.transactionId === t.id && 
          n.date.getMonth() === now.getMonth() && 
          n.date.getFullYear() === now.getFullYear()
        );

        if (!alreadyNotified) {
          newNotifs.push({
            id: `rec-${t.id}-${now.getTime()}`,
            title: 'معاملة دورية قادمة',
            message: `تذكير: لديك "${t.title}" بمبلغ ${formatMoney(t.amount, isPrivacyMode, currency, exchangeRate)} قريباً.`,
            date: new Date(),
            type: 'info',
            isRead: false,
            transactionId: t.id
          });
        }
      });

      if (newNotifs.length > 0) {
        setNotifications(prev => [...newNotifs, ...prev]);
      }
    };

    // Check budget limits
    const checkBudgets = () => {
      const startOfCurrentMonth = startOfMonth(new Date());
      const currentMonthExpenses = transactions.filter(t => 
        t.type === 'expense' && isAfter(new Date(t.date), startOfCurrentMonth)
      );

      const newNotifs: AppNotification[] = [];

      budgets.forEach(budget => {
        const categoryLabel = categories.find(c => c.id === budget.categoryId)?.label || budget.categoryId;
        const categoryExpenses = currentMonthExpenses.filter(t => t.category === categoryLabel);
        const totalSpent = categoryExpenses.reduce((sum, t) => sum + t.amount, 0);

        // Exceeded
        if (totalSpent >= budget.limit) {
          const alreadyNotified = notifications.find(n => 
            n.id === `budget-exceeded-${budget.id}-${startOfCurrentMonth.getTime()}`
          );
          if (!alreadyNotified) {
            newNotifs.push({
              id: `budget-exceeded-${budget.id}-${startOfCurrentMonth.getTime()}`,
              title: 'تجاوز الميزانية!',
              message: `لقد تجاوزت ميزانية "${categoryLabel}". المبلغ المصروف: ${formatMoney(totalSpent, isPrivacyMode, currency, exchangeRate)} (الميزانية: ${formatMoney(budget.limit, isPrivacyMode, currency, exchangeRate)})`,
              date: new Date(),
              type: 'warning',
              isRead: false
            });
          }
        } 
        // Approaching (e.g., 90%)
        else if (totalSpent >= budget.limit * 0.9) {
          const alreadyNotified = notifications.find(n => 
            n.id === `budget-approaching-${budget.id}-${startOfCurrentMonth.getTime()}`
          );
          if (!alreadyNotified) {
            newNotifs.push({
              id: `budget-approaching-${budget.id}-${startOfCurrentMonth.getTime()}`,
              title: 'بدأت تقترب من الميزانية',
              message: `لقد صرفت 90% من ميزانية "${categoryLabel}". المتبقي: ${formatMoney(budget.limit - totalSpent, isPrivacyMode, currency, exchangeRate)}`,
              date: new Date(),
              type: 'info',
              isRead: false
            });
          }
        }
      });

      if (newNotifs.length > 0) {
        setNotifications(prev => [...newNotifs, ...prev]);
      }
    };

    // Run checks
    checkRecurring();
    checkBudgets();
  }, [transactions.length, budgets.length]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Stats
  const { totalBalance, todayIncome, todayExpenses, accountBalances } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Initialize account balances with their existing initialBalance
    const baseAccountBalances: Record<string, number> = {};
    let baseTotal = 0;
    accounts.forEach(acc => {
      const initial = acc.initialBalance || 0;
      baseAccountBalances[acc.id] = initial;
      baseTotal += initial;
    });

    return transactions.reduce((acc, current) => {
      const isToday = new Date(current.date).setHours(0, 0, 0, 0) === today.getTime();
      
      if (current.type === 'income') {
        acc.totalBalance += current.amount;
        if (isToday) acc.todayIncome += current.amount;
        if (current.accountId) acc.accountBalances[current.accountId] = (acc.accountBalances[current.accountId] || 0) + current.amount;
      } else if (current.type === 'expense') {
        acc.totalBalance -= current.amount;
        if (isToday) acc.todayExpenses += current.amount;
        if (current.accountId) acc.accountBalances[current.accountId] = (acc.accountBalances[current.accountId] || 0) - current.amount;
      } else if (current.type === 'transfer') {
        // totalBalance is unchanged
        // todayIncome/Expenses are unchanged
        if (current.accountId) acc.accountBalances[current.accountId] = (acc.accountBalances[current.accountId] || 0) - current.amount;
        if (current.toAccountId) acc.accountBalances[current.toAccountId] = (acc.accountBalances[current.toAccountId] || 0) + current.amount;
      }
      return acc;
    }, { totalBalance: baseTotal, todayIncome: 0, todayExpenses: 0, accountBalances: baseAccountBalances });
  }, [transactions, accounts]);

  const handleExportData = () => {
    // Generate CSV for transactions
    const header = ['النوع', 'المبلغ', 'الفئة', 'التاريخ', 'الحساب', 'ملاحظات'].join(',');
    const rows = transactions.map(t => {
      const isIncome = t.type === 'income' || t.type === 'income_salary' || t.type === 'income_other';
      const typeStr = t.type === 'transfer' ? 'تحويل' : (isIncome ? 'دخل' : 'مصروف');
      const cat = categories.find(c => c.id === t.categoryId)?.label || '';
      const acc = accounts.find(a => a.id === t.accountId)?.name || '';
      return [typeStr, t.amount, cat, t.date, acc, t.note || ''].join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'financial_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotifications(prev => [{ id: Date.now().toString(), type: 'success', title: 'تم التصدير', message: 'تم تصدير البيانات بنجاح', date: new Date(), isRead: false }, ...prev]);
  };

  const renderContent = () => {
    if (!isFirebaseConfigured) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary animate-pulse">
            <CloudOff size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black font-display">تنبيه: Firebase غير مهيأ</h2>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
              لاستخدام الميزات السحابية، يرجى إضافة مفاتيح Firebase في ملف <code className="bg-white/5 px-1 rounded">.env</code> أو استخدام أداة التهيئة.
            </p>
          </div>
          <button 
            onClick={() => window.open('https://console.firebase.google.com/', '_blank')}
            className="px-8 py-3 immersive-gradient text-on-primary rounded-xl font-bold text-xs shadow-xl active:scale-95 transition-all"
          >
            فتح لوحة تحكم Firebase
          </button>
          
          <div className="p-4 glass-card border-orange-500/20 bg-orange-500/5 text-right w-full">
            <p className="text-[10px] text-orange-400 font-bold mb-2 flex items-center gap-1">
              <TrendingUp size={10} />
              خطوات الإعداد:
            </p>
            <ol className="text-[9px] text-on-surface-variant space-y-1 list-decimal list-inside opacity-70">
              <li>أنشئ مشروعاً في Firebase Console.</li>
              <li>فعل تتبع Firestore والمصادقة (Google Login).</li>
              <li>أضف مفاتيح VITE_FIREBASE_* في إعدادات البيئة.</li>
            </ol>
          </div>
        </div>
      );
    }

    if (isDataLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-4">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-on-surface-variant animate-pulse">جاري تحميل البيانات...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'home':
        return <Dashboard 
          balance={totalBalance} 
          income={todayIncome} 
          expenses={todayExpenses} 
          transactions={transactions} 
          goals={goals}
          accounts={accounts}
          accountBalances={accountBalances}
          debts={debts}
          challenges={challenges}
          onDeleteTransaction={syncDeleteTransaction}
          onDeleteGoal={syncDeleteGoal}
          isPrivacyMode={isPrivacyMode}
          togglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}
          currency={currency}
          isPremium={isPremium}
          onNavigateToTab={setActiveTab}
          onViewAccount={(id) => {
            setSelectedAccountId(id);
            setActiveTab('accountHistory');
          }}
          formatMoney={(amt, priv) => formatMoney(amt, priv, currency, exchangeRate)}
        />;
      case 'expenses':
        return <ExpensesScreen
          transactions={transactions}
          categories={categories}
          accounts={accounts}
          onDeleteTransaction={syncDeleteTransaction}
          onAddTransaction={(t) => {
            syncAddTransaction({ ...t, accountId: t.accountId });
          }}
          isPrivacyMode={isPrivacyMode}
          currency={currency}
          exchangeRate={exchangeRate}
          formatMoney={(amt, priv) => formatMoney(amt, priv, currency, exchangeRate)}
        />;
      case 'reports':
        return <Reports 
          transactions={transactions} 
          categories={categories}
          isFullScreen={isFullScreen} 
          onToggleFullScreen={() => setIsFullScreen(!isFullScreen)} 
          isPremium={isPremium}
          isPrivacyMode={isPrivacyMode}
          formatMoney={(amt, priv) => formatMoney(amt, priv, currency, exchangeRate)}
          onRequirePremium={() => setShowPremiumModal(true)}
        />;
      case 'add':
        return <AddScreen 
          categories={categories}
          accounts={accounts}
          onAddTransaction={(t) => {
            syncAddTransaction({ ...t, accountId: t.accountId });
            setActiveTab('home');
          }} 
          onCancel={() => setActiveTab('home')} 
          currency={currency}
          exchangeRate={exchangeRate}
          autoCategories={autoCategories}
        />;
      case 'budgets':
        return <BudgetsScreen 
          budgets={budgets} 
          transactions={transactions} 
          categories={categories} 
          currency={currency}
          isPrivacyMode={isPrivacyMode}
          isPremium={isPremium}
          onAddBudget={syncAddBudget}
          onDeleteBudget={syncDeleteBudget}
          formatMoney={(amt, priv) => formatMoney(amt, priv, currency, exchangeRate)}
        />;
      case 'debts':
        return <DebtsScreen 
          debts={debts}
          onAddDebt={syncAddDebt}
          onUpdateDebt={syncUpdateDebt}
          currency={currency}
          isPrivacyMode={isPrivacyMode}
          formatMoney={(amt, priv) => formatMoney(amt, priv, currency, exchangeRate)}
        />;
      case 'savings':
        return <SavingsScreen
          goals={goals}
          challenges={challenges}
          transactions={transactions}
          onDeleteGoal={syncDeleteGoal}
          onAddGoal={syncAddGoal}
          onAddChallenge={syncAddChallenge}
          isPrivacyMode={isPrivacyMode}
          isPremium={isPremium}
          currency={currency}
          formatMoney={(amt, priv) => formatMoney(amt, priv, currency, exchangeRate)}
          onBack={() => setActiveTab('home')}
        />;
      case 'accounts':
        return <AccountsScreen
          accounts={accounts}
          accountBalances={accountBalances}
          onAddAccount={syncAddAccount}
          onDeleteAccount={syncDeleteAccount}
          onUpdateAccount={syncUpdateAccount}
          onViewHistory={(id) => {
            setSelectedAccountId(id);
            setActiveTab('accountHistory');
          }}
          currency={currency}
          isPrivacyMode={isPrivacyMode}
          isPremium={isPremium}
          formatMoney={(amt, priv) => formatMoney(amt, priv, currency, exchangeRate)}
        />;
      case 'accountHistory':
        const accForHistory = accounts.find(a => a.id === selectedAccountId);
        return <AccountHistoryScreen
          account={accForHistory ? { ...accForHistory, balance: accountBalances[accForHistory.id] || 0 } : undefined}
          transactions={transactions.filter(t => t.accountId === selectedAccountId || (t.type === 'transfer' && t.toAccountId === selectedAccountId))}
          onBack={() => setActiveTab('accounts')}
          onDeleteTransaction={syncDeleteTransaction}
          isPrivacyMode={isPrivacyMode}
          formatMoney={(amt, priv) => formatMoney(amt, priv, currency, exchangeRate)}
        />;
      case 'settings':
        return <SettingsScreen 
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
          loginError={loginError}
          currentPalette={currentPalette}
          onPaletteChange={setCurrentPalette}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          currency={currency}
          onCurrencyChange={setCurrency}
          isSecurityEnabled={isSecurityEnabled}
          onToggleSecurity={() => {
            const newState = !isSecurityEnabled;
            setIsSecurityEnabled(newState);
            if (newState) {
              triggerSecurityAlert('تفعيل نظام الأمان', 'تم تفعيل تنبيهات الأمان بنجاح. ستصلك الإشعارات هنا وعلى بريدك الإلكتروني.');
            }
          }}
          securityEmail={securityEmail}
          onSecurityEmailChange={setSecurityEmail}
          addNotification={(notif: any) => setNotifications(prev => [notif, ...prev])}
          categories={categories}
          onAddCategory={syncAddCategory}
          onDeleteCategory={syncDeleteCategory}
          isPremium={isPremium}
          onStartPremiumTrial={async () => {
            setIsPremium(true);
            if (user && db) {
              try {
                await setDoc(doc(db, `users/${user.uid}`), { isPremium: true }, { merge: true });
              } catch (error) {
                console.error("Failed to update premium status in Firestore", error);
              }
            }
            triggerSecurityAlert('تفعيل الاشتراك الشهري', 'تم خصم مبلغ $3.99 من بطاقتك بنجاح. يمكنك الآن الاستمتاع بجميع الخصائص المتقدمة.');
          }}
          onRequirePremium={() => setShowPremiumModal(true)}
          onExportData={handleExportData}
        />;
    }
  };

  if (showSplash) {
    return (
      <div 
        className={`min-h-screen bg-background font-sans overflow-hidden relative flex flex-col items-center justify-center ${isDarkMode ? 'dark' : 'light'}`}
        style={{
          // @ts-ignore
          '--theme-primary': currentPalette.primary,
          '--theme-primary-light': currentPalette.light,
          '--theme-font-sans': '"Tajawal", sans-serif',
          '--theme-font-display': '"Cairo", sans-serif',
          backgroundImage: isDarkMode ? "url('/bg-dark.png')" : "url('/bg-light.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
        dir="rtl"
      >
        <div className="absolute inset-0 bg-background/60 backdrop-blur-md -z-10 pointer-events-none"></div>
        
        <div className="z-10 w-full max-w-sm px-6 flex flex-col items-center justify-center h-full">
          <div className="text-center animate-in fade-in zoom-in duration-1000">
            <div className="flex justify-center mb-10 relative">
              <div className="absolute inset-0 bg-primary/40 blur-[60px] rounded-full scale-150 animate-pulse"></div>
              <img src="/logo.png" alt="Logo" className="w-56 h-56 object-contain drop-shadow-2xl relative z-10 hover:scale-110 transition-transform duration-700 animate-in spin-in-12 duration-1000" />
            </div>
            
            <h1 className="font-display font-black text-7xl pb-2 bg-gradient-to-l from-primary to-primary-light bg-clip-text text-transparent mb-6 tracking-tight drop-shadow-lg">
              توفير
            </h1>
            
            <h2 className="text-2xl font-bold text-on-surface mb-3 tracking-wide drop-shadow-sm">
              أهلاً بك
            </h2>
            <p className="text-on-surface-variant font-medium text-base mb-16 opacity-80 max-w-[280px] mx-auto leading-relaxed">
              الإدارة المالية المتقدمة
            </p>
            
            <div className="flex flex-col items-center mt-8">
              <div className="relative flex items-center justify-center w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full border-t-[3px] border-primary border-opacity-80 animate-spin" style={{ animationDuration: '1s' }}></div>
                <div className="absolute inset-1.5 rounded-full border-r-[3px] border-primary-light border-opacity-60 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
                <div className="absolute inset-3 rounded-full border-b-[3px] border-white/50 animate-spin" style={{ animationDuration: '2s' }}></div>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              </div>
              <span className="text-sm text-primary font-bold tracking-widest mt-2 bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 animate-pulse">جاري التحضير...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div 
        className={`min-h-screen bg-background font-sans overflow-x-hidden relative flex flex-col items-center justify-center ${isDarkMode ? 'dark' : 'light'}`}
        style={{
          // @ts-ignore
          '--theme-primary': currentPalette.primary,
          '--theme-primary-light': currentPalette.light,
          '--theme-font-sans': '"Tajawal", sans-serif',
          '--theme-font-display': '"Cairo", sans-serif',
          backgroundImage: isDarkMode ? "url('/bg-dark.png')" : "url('/bg-light.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
        dir="rtl"
      >
        <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] -z-10 pointer-events-none"></div>
        
        <div className="z-10 w-full max-w-sm px-6">
          <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="flex justify-center mb-6 relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
              <img src="/logo.png" alt="Logo" className="w-40 h-40 object-contain drop-shadow-2xl relative z-10 transition-transform duration-700 hover:scale-110 hover:rotate-2" />
            </div>
            <h1 className="font-display font-black text-6xl pb-2 bg-gradient-to-l from-primary to-primary-light bg-clip-text text-transparent mb-4">
              توفير
            </h1>
            <p className="text-on-surface-variant font-bold text-sm bg-white/5 inline-block px-4 py-1.5 rounded-full border border-white/5 shadow-inner">
              الإدارة المالية المتقدمة
            </p>
          </div>
          
          <div className="glass-card p-6 rounded-[32px] space-y-5 text-center animate-in fade-in slide-in-from-bottom-10 shadow-2xl duration-700 delay-150 relative overflow-hidden border border-white/20">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"></div>
            <div className="relative z-10 space-y-5">
              <div>
                <h2 className="font-black text-xl mb-2 text-on-surface">أهلاً بك 👋</h2>
                <p className="text-xs text-on-surface-variant leading-relaxed opacity-80 font-medium">
                  {loginMode === 'login' ? 'سجل دخولك لبدء مزامنة بياناتك' : 'أنشئ حساباً جديداً للبدء'}
                </p>
              </div>
              
              {loginError && (
                <div className="animate-in shake p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-2 text-right">
                   <div className="text-red-400 p-1 bg-red-400/10 rounded-lg">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                   </div>
                   <p className="text-red-400 text-[10px] font-bold flex-1">
                     {loginError}
                   </p>
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-3 text-right">
                {loginMode === 'register' && (
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="text"
                      placeholder="الاسم كامل"
                      value={emailAuthInput.name}
                      onChange={e => setEmailAuthInput(prev => ({...prev, name: e.target.value}))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors"
                    />
                    <input 
                      type="number"
                      placeholder="العمر"
                      value={emailAuthInput.age}
                      onChange={e => setEmailAuthInput(prev => ({...prev, age: e.target.value}))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                )}
                <input 
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={emailAuthInput.email}
                  onChange={e => setEmailAuthInput(prev => ({...prev, email: e.target.value}))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors text-left"
                  dir="ltr"
                />
                <input 
                  type="password"
                  placeholder="كلمة المرور"
                  value={emailAuthInput.password}
                  onChange={e => setEmailAuthInput(prev => ({...prev, password: e.target.value}))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors text-left"
                  dir="ltr"
                />

                <button 
                  type="submit"
                  disabled={isAuthLoading}
                  className={`w-full flex justify-center items-center gap-2 px-6 py-3.5 bg-primary text-on-primary rounded-xl font-black text-sm active:scale-95 transition-all shadow-[0_5px_20px_-5px_rgba(var(--theme-primary),0.5)] ${isAuthLoading ? 'opacity-70 pointer-events-none' : 'hover:brightness-110'}`}
                >
                  {isAuthLoading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span>{loginMode === 'login' ? 'سجل الدخول' : 'إنشاء حساب'}</span>
                  )}
                </button>
              </form>

              <div className="flex items-center gap-4 w-full">
                 <div className="flex-1 h-px bg-white/10"></div>
                 <span className="text-[10px] font-bold text-on-surface-variant">أو بطريقة أخرى</span>
                 <div className="flex-1 h-px bg-white/10"></div>
              </div>
              
              <button 
                onClick={handleLogin}
                disabled={isAuthLoading}
                className="w-full flex justify-center items-center gap-3 px-6 py-3.5 bg-white text-black rounded-xl font-black text-sm active:scale-95 transition-all hover:bg-gray-100 disabled:opacity-70 disabled:pointer-events-none"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
                <span>المتابعة بـ Google</span>
              </button>

              <div className="pt-2 text-xs font-bold text-on-surface-variant flex gap-1 justify-center">
                 <span>{loginMode === 'login' ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}</span>
                 <button 
                   onClick={() => {
                     setLoginMode(loginMode === 'login' ? 'register' : 'login')
                     setLoginError('')
                   }}
                   className="text-primary hover:underline"
                 >
                   {loginMode === 'login' ? 'انشاء حساب جديد' : 'تسجيل الدخول'}
                 </button>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center animate-in fade-in duration-1000 delay-300">
             <p className="text-[9px] text-on-surface-variant font-bold opacity-50 max-w-[200px] mx-auto leading-relaxed">
                بالتسجيل أنت توافق على شروط الاستخدام وسياسة الخصوصية الخاصة بمنصة توفير.
             </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen bg-background font-sans overflow-x-hidden relative ${isFullScreen ? 'pb-0' : 'pb-24'} ${isDarkMode ? 'dark' : 'light'}`}
      style={{
        // @ts-ignore
        '--theme-primary': currentPalette.primary,
        '--theme-primary-light': currentPalette.light,
        '--theme-font-sans': '"Tajawal", sans-serif',
        '--theme-font-display': '"Cairo", sans-serif',
        backgroundImage: isDarkMode ? "url('/bg-dark.png')" : "url('/bg-light.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="fixed inset-0 bg-background/60 backdrop-blur-[1px] -z-10 pointer-events-none"></div>
      
      {/* Top Bar */}
      {!isFullScreen && (
        <header className="fixed top-0 left-0 w-full z-50 bg-background/40 backdrop-blur-xl border-b border-white/5 flex justify-between items-center px-5 h-16">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/50 p-0.5 relative group cursor-pointer" onClick={() => setActiveTab('settings')}>
              <img 
                className="w-full h-full rounded-full object-cover" 
                src={user?.photoURL || "https://picsum.photos/seed/user123/100/100"} 
                alt="User"
                referrerPolicy="no-referrer"
              />
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${user ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            </div>
            <button 
              onClick={() => {
                setShowNotifications(true);
                markAllAsRead();
              }}
              className="text-primary hover:text-primary-light transition-colors bg-transparent border border-primary/20 p-2 rounded-full relative active:scale-95 transition-all"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-background animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            {user && (
              <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full animate-in fade-in zoom-in duration-500 ${isOffline ? 'bg-amber-400/10 text-amber-500' : 'bg-green-400/10 text-green-400'}`}>
                {isOffline ? <CloudOff size={10} /> : <Cloud size={10} />}
                <span className="hidden sm:inline">{isOffline ? 'بدون إنترنت' : 'متزامن'}</span>
              </div>
            )}
          </div>
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="flex items-center gap-1 font-display font-black text-2xl bg-gradient-to-l from-primary to-primary-light bg-clip-text text-transparent outline-none"
            >
              توفير
              <ChevronDown size={20} className={`text-primary transition-transform duration-300 ${isMenuOpen ? 'rotate-180': ''}`} />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute top-12 left-0 min-w-48 bg-background/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 z-50 text-right overflow-hidden"
                >
                  <button onClick={() => { setActiveTab('home'); setIsMenuOpen(false); }} className={`p-3 text-sm font-black rounded-xl transition-colors text-right flex justify-end gap-3 items-center ${activeTab === 'home' ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-on-surface'}`}>
                     الرئيسية <HomeIcon size={16} /> 
                  </button>
                  <button onClick={() => { setActiveTab('expenses'); setIsMenuOpen(false); }} className={`p-3 text-sm font-black rounded-xl transition-colors text-right flex justify-end gap-3 items-center ${activeTab === 'expenses' ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-on-surface'}`}>
                     الدخل والمصروفات <ArrowLeftRight size={16} /> 
                  </button>
                  <button onClick={() => { setActiveTab('reports'); setIsMenuOpen(false); }} className={`p-3 text-sm font-black rounded-xl transition-colors text-right flex justify-end gap-3 items-center ${activeTab === 'reports' ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-on-surface'}`}>
                     قسم التقارير <LineChartIcon size={16} />
                  </button>
                  <button onClick={() => { setActiveTab('budgets'); setIsMenuOpen(false); }} className={`p-3 text-sm font-black rounded-xl transition-colors text-right flex justify-end gap-3 items-center ${activeTab === 'budgets' ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-on-surface'}`}>
                     قسم الميزانية <Crosshair size={16} />
                  </button>
                  <button onClick={() => { setActiveTab('savings'); setIsMenuOpen(false); }} className={`p-3 text-sm font-black rounded-xl transition-colors text-right flex justify-end gap-3 items-center ${activeTab === 'savings' ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-on-surface'}`}>
                     قسم الادخار <TrendingUp size={16} />
                  </button>
                  <button onClick={() => { setActiveTab('debts'); setIsMenuOpen(false); }} className={`p-3 text-sm font-black rounded-xl transition-colors text-right flex justify-end gap-3 items-center ${activeTab === 'debts' ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-on-surface'}`}>
                     الديون والالتزامات <Scale size={16} />
                  </button>
                  <button onClick={() => { setActiveTab('accounts'); setIsMenuOpen(false); }} className={`p-3 text-sm font-black rounded-xl transition-colors text-right flex justify-end gap-3 items-center ${activeTab === 'accounts' ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-on-surface'}`}>
                     حساباتي <Landmark size={16} />
                  </button>
                  <button onClick={() => { setActiveTab('settings'); setIsMenuOpen(false); }} className={`p-3 text-sm font-black rounded-xl transition-colors text-right flex justify-end gap-3 items-center ${activeTab === 'settings' ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-on-surface'}`}>
                     الإعدادات <Settings size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`${isFullScreen ? 'pt-5 px-4 max-w-none' : 'pt-20 px-5 max-w-lg'} mx-auto relative z-10`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.25 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Notifications Overlay */}
      <AnimatePresence>
        {showNotifications && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            ></motion.div>
            
            <motion.div 
              initial={{ y: 100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-card border-white/10 overflow-hidden relative z-10 flex flex-col max-h-[80vh] shadow-3xl"
            >
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg text-primary">
                    <Bell size={18} />
                  </div>
                  <h3 className="font-display font-black text-lg">التنبيهات</h3>
                </div>
                <div className="flex gap-2">
                   <button 
                    onClick={clearNotifications}
                    className="p-2 text-on-surface-variant hover:text-red-400 transition-colors"
                    title="مسح الكل"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 opacity-40">
                    <History size={48} className="mb-4" />
                    <p className="font-bold text-sm">لا توجد تنبيهات حالية</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`p-4 rounded-[24px] border transition-all ${n.isRead ? 'bg-white/2 border-white/5 opacity-70' : 'bg-primary/5 border-primary/20 shadow-lg ring-1 ring-primary/20'}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`font-black text-sm ${n.type === 'warning' ? 'text-orange-400' : n.type === 'success' ? 'text-green-400' : 'text-primary'}`}>
                          {n.title}
                        </h4>
                        <span className="text-[10px] opacity-40 font-bold">{format(n.date, 'HH:mm')}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed font-medium">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-4 bg-white/2 border-t border-white/5">
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="w-full py-3 immersive-gradient text-on-primary rounded-xl font-display font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      {!isFullScreen && (
        <nav className="fixed bottom-0 left-0 w-full z-50 nav-glass flex justify-around items-center px-2 py-2 rounded-t-[32px] sm:px-6">
          <NavItem 
            active={activeTab === 'home'} 
            onClick={() => setActiveTab('home')} 
            icon={<HomeIcon size={24} strokeWidth={1.5} />} 
            label="الرئيسية" 
          />
          <NavItem 
            active={activeTab === 'expenses'} 
            onClick={() => setActiveTab('expenses')} 
            icon={<Receipt size={24} strokeWidth={1.5} />} 
            label="المصروفات" 
          />
          
          <div className="relative -top-6">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveTab('add')}
              className={`w-16 h-16 rounded-full shadow-[0_10px_25px_-5px_rgba(var(--theme-primary),0.5)] flex items-center justify-center z-50 border-[4px] border-background ${activeTab === 'add' ? 'bg-primary text-on-primary' : 'immersive-gradient text-on-primary'}`}
            >
              <Plus size={32} />
            </motion.button>
            <span className="absolute -bottom-4 w-full text-center text-[10px] font-black text-on-surface-variant opacity-70">
              إضافة
            </span>
          </div>

          <NavItem 
            active={activeTab === 'accounts'} 
            onClick={() => setActiveTab('accounts')} 
            icon={<Landmark size={24} strokeWidth={1.5} />} 
            label="حساباتي" 
          />
          <NavItem 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={<Settings size={24} strokeWidth={1.5} />} 
            label="الإعدادات" 
          />
        </nav>
      )}

      <ConfirmDialog 
        show={confirmDialog.show}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, show: false }))}
      />

      {/* Premium Notification Modal */}
      <AnimatePresence>
        {showPremiumModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPremiumModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            ></motion.div>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="w-full max-w-sm rounded-[32px] p-1 immersive-gradient shadow-[0_0_50px_rgba(var(--theme-primary),0.3)] relative z-10"
              dir="rtl"
            >
              <div className="bg-background rounded-[28px] overflow-hidden">
                <div className="relative h-40 flex items-center justify-center overflow-hidden bg-primary/10">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--theme-primary)_0%,_transparent_70%)]"></div>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute w-40 h-40 border border-primary/20 rounded-full border-dashed"
                  ></motion.div>
                  <Diamond size={64} className="text-primary fill-primary/20 drop-shadow-lg relative z-10 animate-pulse" strokeWidth={1.5} />
                </div>
                
                <div className="p-6 text-center space-y-4">
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/20 mb-2">مميزات حصرية</span>
                  
                  <h2 className="font-display font-black text-2xl text-on-surface">ارتقِ لبريميوم</h2>
                  <p className="text-sm text-on-surface-variant font-medium leading-relaxed opacity-80 pb-2">
                    تصدير التقارير بصيغة PDF و Excel والإحصائيات المتقدمة متاحة حصرياً للمشتركين في باقة توفير بريميوم. ترقى الآن لتجربة احترافية.
                  </p>
                  
                  <div className="space-y-3 pt-2">
                    <button 
                      onClick={() => {
                        setShowPremiumModal(false);
                        setActiveTab('settings');
                      }}
                      className="w-full py-4 immersive-gradient text-white rounded-2xl font-display font-black text-sm shadow-xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Zap size={18} className="fill-current" /> استكشاف بريميوم
                    </button>
                    <button 
                      onClick={() => setShowPremiumModal(false)}
                      className="w-full py-3 bg-white/5 text-on-surface font-bold text-sm rounded-2xl border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
                    >
                      متابعة بالنسخة المجانية
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }
) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-2xl transition-all duration-300 ${
        active ? 'text-primary bg-primary/20 scale-105' : 'text-on-surface-variant'
      }`}
    >
      {icon}
      <span className="text-[10px] font-bold mt-1.5">{label}</span>
    </button>
  );
}

function ConfirmDialog({ 
  show, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  variant = 'danger',
  confirmText = 'تأكيد الحذف'
}: { 
  show: boolean, 
  title: string, 
  message: string, 
  onConfirm: () => void, 
  onCancel: () => void,
  variant?: 'danger' | 'warning' | 'info',
  confirmText?: string
}
) {
  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';
  
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          ></motion.div>
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="glass-card w-full max-w-sm p-8 space-y-6 relative z-10 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            dir="rtl"
          >
            <div className={`w-16 h-16 ${isDanger ? 'bg-red-500/10 text-red-500' : isWarning ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'} rounded-full flex items-center justify-center mx-auto mb-2`}>
              {isDanger ? <AlertTriangle size={32} /> : isWarning ? <AlertCircle size={32} /> : <Info size={32} />}
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="font-display font-black text-xl text-on-surface">{title}</h3>
              <p className="text-sm text-on-surface-variant font-medium leading-relaxed opacity-70">
                {message}
              </p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button 
                onClick={onConfirm}
                className={`flex-1 py-4 ${isDanger ? 'bg-red-500 shadow-red-500/20' : isWarning ? 'bg-amber-500 shadow-amber-500/20' : 'bg-primary shadow-primary/20'} text-white rounded-2xl font-display font-black text-sm shadow-xl active:scale-95 transition-all`}
              >
                {confirmText}
              </button>
              <button 
                onClick={onCancel}
                className="flex-1 py-4 bg-white/5 text-on-surface-variant rounded-2xl font-display font-black text-sm active:scale-95 transition-all border border-white/5"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// --- Screens ---

export function AIInsights({ transactions, isPremium }: { transactions: Transaction[], isPremium?: boolean }
) {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function getInsights() {
      if (transactions.length === 0) return;
      if (!isPremium) {
        setInsight('نصيحة: ابدأ بتوفير جزء صغير من دخلك اليومي لبناء مستقبل مالي أفضل.');
        return;
      }
      
      setLoading(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const recentTxSummary = transactions.slice(0, 20).map(t => `${t.type}: ${t.amount} (${t.category})`).join(', ');
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Analyze these recent transactions and provide 4 very professional, advanced financial strategy tips in Arabic for a premium finance app dashboard. Include 1 prediction about their balance if they continue this pattern. Return ONLY the tips separated by a newline. Transactions: ${recentTxSummary}`,
        });

        setInsight(response.text || 'ابدأ بتوفير جزء صغير من دخلك اليومي لبناء مستقبل مالي أفضل.');
      } catch (error) {
        console.error('AI Insights error:', error);
        setInsight('نصيحة: حاول تقليل المصاريف غير الضرورية هذا الأسبوع لزيادة مدخراتك.');
      } finally {
        setLoading(false);
      }
    }

    getInsights();
  }, [transactions.length, isPremium]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" strokeWidth={1.5} />
          <h2 className="font-display font-bold text-lg">تحليلات ذكية</h2>
        </div>
        {!isPremium && (
          <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full font-black uppercase tracking-tighter border border-amber-500/20">قيد المحدودية</span>
        )}
      </div>
      <div className={`glass-card p-5 relative overflow-hidden group transition-all duration-500 ${!isPremium ? 'opacity-90' : 'bg-primary/5 border-primary/20 shadow-lg shadow-primary/5'}`}>
        {!isPremium && (
          <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
             <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary mb-3 text-current">
               <Lock size={20} />
             </div>
             <h3 className="text-xs font-black mb-1">التحليل المتقدم مغلق</h3>
             <p className="text-[10px] text-on-surface-variant font-medium leading-relaxed max-w-[180px]">اشترك في بريميوم لفتح التحليلات الذكية والتنبؤات المالية باستخدام AI.</p>
          </div>
        )}
        <div className="absolute top-0 left-0 w-1 h-full bg-primary/40 group-hover:bg-primary transition-colors"></div>
        {loading ? (
          <div className="flex flex-col gap-3 py-2 animate-pulse">
            <div className="h-3 w-3/4 bg-white/10 rounded-full"></div>
            <div className="h-3 w-1/2 bg-white/10 rounded-full"></div>
            <div className="h-3 w-2/3 bg-white/10 rounded-full"></div>
          </div>
        ) : (
          <ul className="space-y-4">
            {insight.split('\n').filter(tip => tip.trim()).map((tip, idx) => (
              <motion.li 
                key={idx}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${idx === insight.split('\n').filter(t => t.trim()).length - 1 && isPremium ? 'bg-amber-400 animate-pulse' : 'bg-primary/60'}`} />
                <p className={`text-xs font-medium leading-relaxed opacity-90 ${idx === insight.split('\n').filter(t => t.trim()).length - 1 && isPremium ? 'text-amber-300 font-bold' : 'text-on-surface'}`}>
                  {tip.replace(/^\d+\.\s*/, '')}
                </p>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}



function AccountHistoryScreen({ 
  account, 
  transactions, 
  onBack, 
  onDeleteTransaction, 
  isPrivacyMode, 
  formatMoney 
}: { 
  account?: Account, 
  transactions: Transaction[], 
  onBack: () => void, 
  onDeleteTransaction: (id: string) => void, 
  isPrivacyMode: boolean, 
  formatMoney: (amt: number, priv: boolean) => string 
}
) {
  if (!account) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <header className="flex items-center gap-4 text-right">
        <button 
          onClick={onBack}
          className="p-3 bg-white/5 rounded-2xl text-on-surface-variant hover:text-primary transition-all active:scale-95 border border-white/5"
        >
          <ChevronLeft size={20} className="rotate-180" />
        </button>
        <div>
          <h1 className="font-display font-black text-2xl text-on-surface">{account.name}</h1>
          <p className="text-on-surface-variant font-bold text-xs mt-1">سجل المعاملات لهذا الحساب</p>
        </div>
      </header>

      {/* Account Info Card */}
      <section className={`p-6 rounded-[28px] bg-slate-900/40 backdrop-blur-xl border border-white/10 relative overflow-hidden shadow-2xl`}>
        <div className={`absolute inset-0 ${account.color.replace('text-', 'bg-')} opacity-10 pointer-events-none`}></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="flex-1 w-full">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-inner">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">الرصيد المتاح</p>
              <div className="flex items-center gap-3">
                <span className={`text-4xl font-black font-display drop-shadow-sm ${account.color}`}>
                  {formatMoney(account.balance, isPrivacyMode)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 px-1">
               <span className="text-[10px] bg-white/10 px-2 py-1 rounded-lg font-bold uppercase tracking-wider text-on-surface/80">{account.type}</span>
               {account.cardNetwork && <span className="text-[10px] bg-white/10 px-2 py-1 rounded-lg font-bold uppercase tracking-wider text-on-surface/80">{account.cardNetwork}</span>}
            </div>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex-1 md:flex-none bg-green-500/10 p-3 rounded-2xl border border-green-500/10 min-w-[100px]">
              <p className="text-[8px] font-black uppercase opacity-60 mb-1">إجمالي الإيداع</p>
              <p className="text-sm font-black text-green-400">
                {formatMoney(transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0), isPrivacyMode)}
              </p>
            </div>
            <div className="flex-1 md:flex-none bg-red-500/10 p-3 rounded-2xl border border-red-500/10 min-w-[100px]">
              <p className="text-[8px] font-black uppercase opacity-60 mb-1">إجمالي الصرف</p>
              <p className="text-sm font-black text-red-400">
                {formatMoney(transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0), isPrivacyMode)}
              </p>
            </div>
          </div>

          <div className={`hidden md:flex p-4 bg-white/10 rounded-2xl backdrop-blur-md ${account.color}`}>
            <IconRenderer icon={account.icon} size={32} fallback={CreditCard} />
          </div>
        </div>
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
      </section>

      {/* Transaction List */}
      <section className="space-y-4">
        <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-widest px-1">المعاملات الأخيرة</h3>
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="py-20 text-center opacity-40 glass-card">
              <History size={48} className="mx-auto mb-4" />
              <p className="text-sm font-bold">لا توجد معاملات مسجلة لهذا الحساب</p>
            </div>
          ) : (
            transactions
              .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(t => {
                const isIncoming = t.type === 'income' || (t.type === 'transfer' && t.toAccountId === account.id);
                const isOutgoing = t.type === 'expense' || (t.type === 'transfer' && t.accountId === account.id);
                
                return (
                  <div key={t.id} className="glass-card p-4 flex items-center justify-between group hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:scale-105 transition-transform overflow-hidden ${isIncoming ? 'text-green-400' : 'text-red-400'}`}>
                        {t.iconUrl ? (
                          <img src={t.iconUrl} alt={t.category} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <IconRenderer icon={t.icon} size={20} />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-on-surface">
                          {t.title}
                          {t.type === 'transfer' && (
                            <span className="text-[10px] font-bold text-primary mr-2 opacity-70">
                              (تحويل {t.accountId === account.id ? 'إلى حساب آخر' : 'من حساب آخر'})
                            </span>
                          )}
                        </h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {t.tags?.map((tag, idx) => (
                            <span key={idx} className="text-[7px] font-black uppercase bg-primary/10 text-primary px-1 py-0.5 rounded leading-none">#{tag}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-black uppercase text-on-surface-variant opacity-60">{t.category}</span>
                          <span className="text-[9px] font-bold text-on-surface-variant opacity-40 border-r border-white/10 pr-2 mr-2">
                            {format(new Date(t.date), 'dd MMM yyyy', { locale: ar })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-sm font-black font-display ${isIncoming ? 'text-green-500' : 'text-red-500'}`}>
                        {isIncoming ? '+' : '-'}{formatMoney(t.amount, isPrivacyMode)}
                      </span>
                      <button 
                        onClick={() => onDeleteTransaction(t.id)}
                        className="p-1.5 text-on-surface-variant opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </section>
    </div>
  );
}

function ExpensesScreen({ 
  transactions, 
  categories, 
  accounts,
  onDeleteTransaction, 
  onAddTransaction,
  isPrivacyMode, 
  currency,
  exchangeRate,
  formatMoney 
}: { 
  transactions: Transaction[], 
  categories: Category[], 
  accounts: Account[],
  onDeleteTransaction: (id: string) => void, 
  onAddTransaction: (t: any) => void,
  isPrivacyMode: boolean, 
  currency: string,
  exchangeRate: number,
  formatMoney: (amt: number, priv: boolean) => string 
}
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('month');
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return transactions
      .filter(t => t.type === transactionType)
      .filter(t => {
        // Search filter
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             t.category.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Category filter
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        
        // Time filter
        let matchesTime = true;
        const txDate = new Date(t.date);
        if (timeFilter === 'today') {
          matchesTime = txDate.setHours(0,0,0,0) === now.setHours(0,0,0,0);
        } else if (timeFilter === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          matchesTime = txDate >= weekAgo;
        } else if (timeFilter === 'month') {
          matchesTime = txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        }
        
        return matchesSearch && matchesCategory && matchesTime;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchQuery, selectedCategory, timeFilter]);

  const totalFiltered = filteredExpenses.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 relative">
      <section className="text-right flex justify-between items-center">
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-transparent p-3 rounded-2xl text-primary border border-primary/20 cursor-pointer active:scale-95 transition-all hover:bg-primary/5 shadow-sm"
        >
           <Plus size={20} strokeWidth={2.5} />
        </button>
        <div>
          <h1 className="font-display font-black text-2xl text-on-surface flex items-center justify-center md:justify-start gap-2">
            <ArrowLeftRight className="text-primary text-opacity-80" />
            إدارة {transactionType === 'expense' ? 'المصروفات' : 'الدخل'}
          </h1>
          <p className="text-on-surface-variant font-bold text-xs mt-1">تتبع وتحليل كل قرش {transactionType === 'expense' ? 'تصرفه' : 'تكسبه'}</p>
        </div>
      </section>

      {/* Type Toggle */}
      <section className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
        <button 
          onClick={() => setTransactionType('expense')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${transactionType === 'expense' ? 'bg-white/10 text-on-surface shadow-md' : 'text-on-surface-variant opacity-70 hover:opacity-100'}`}
        >
          المصروفات
        </button>
        <button 
          onClick={() => setTransactionType('income')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${transactionType === 'income' ? 'bg-white/10 text-on-surface shadow-md' : 'text-on-surface-variant opacity-70 hover:opacity-100'}`}
        >
          الدخل
        </button>
      </section>

      {/* Summary Card */}
      <section className={`p-6 rounded-[28px] text-on-primary shadow-xl relative overflow-hidden ring-1 ring-white/20 ${transactionType === 'income' ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
        <div className="relative z-10 flex justify-between items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">إجمالي {transactionType === 'expense' ? 'المصاريف' : 'الدخل'} لهذه الفترة</p>
            <h2 className="text-3xl font-black font-display">{formatMoney(totalFiltered, isPrivacyMode)}</h2>
          </div>
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
            {transactionType === 'expense' ? <TrendingDown size={24} /> : <TrendingUp size={24} />}
          </div>
        </div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
      </section>

      {/* Filters */}
      <section className="space-y-4">
        <div className="relative group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="ابحث عن عملية أو فئة..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-card py-4 pr-12 pl-5 bg-white/5 border border-white/10 rounded-[22px] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-xs font-bold"
            dir="rtl"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" dir="rtl">
          <button 
            onClick={() => setTimeFilter('today')}
            className={`px-6 py-2.5 rounded-xl font-black text-[10px] whitespace-nowrap transition-all ${timeFilter === 'today' ? 'immersive-gradient text-white shadow-lg' : 'bg-white/5 border border-white/5 text-on-surface-variant'}`}
          >اليوم</button>
          <button 
            onClick={() => setTimeFilter('week')}
            className={`px-6 py-2.5 rounded-xl font-black text-[10px] whitespace-nowrap transition-all ${timeFilter === 'week' ? 'immersive-gradient text-white shadow-lg' : 'bg-white/5 border border-white/5 text-on-surface-variant'}`}
          >هذا الأسبوع</button>
          <button 
            onClick={() => setTimeFilter('month')}
            className={`px-6 py-2.5 rounded-xl font-black text-[10px] whitespace-nowrap transition-all ${timeFilter === 'month' ? 'immersive-gradient text-white shadow-lg' : 'bg-white/5 border border-white/5 text-on-surface-variant'}`}
          >هذا الشهر</button>
          <button 
            onClick={() => setTimeFilter('all')}
            className={`px-6 py-2.5 rounded-xl font-black text-[10px] whitespace-nowrap transition-all ${timeFilter === 'all' ? 'immersive-gradient text-white shadow-lg' : 'bg-white/5 border border-white/5 text-on-surface-variant'}`}
          >الكل</button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" dir="rtl">
          <button 
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all border ${selectedCategory === 'all' ? 'bg-primary/20 text-primary border-primary/20' : 'bg-white/5 border-white/5 text-on-surface-variant'}`}
          >الكل</button>
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.label)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black whitespace-nowrap transition-all border ${selectedCategory === cat.label ? 'bg-primary/20 text-primary border-primary/20' : 'bg-white/5 border-white/5 text-on-surface-variant'}`}
            >{cat.label}</button>
          ))}
        </div>
      </section>

      {/* Transactions List */}
      <section className="space-y-3">
        {filteredExpenses.length === 0 ? (
          <div className="py-20 text-center opacity-40">
            <ShoppingBag size={48} className="mx-auto mb-4" />
            <p className="text-sm font-bold">لا توجد {transactionType === 'expense' ? 'مصروفات' : 'إيرادات'} تطابق البحث</p>
          </div>
        ) : (
          filteredExpenses.map(t => (
            <div key={t.id} className="glass-card p-4 flex items-center justify-between group hover:bg-white/10 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-400/10 flex items-center justify-center border border-red-400/5 group-hover:scale-110 transition-transform overflow-hidden">
                  {t.iconUrl ? (
                    <img src={t.iconUrl} alt={t.category} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <IconRenderer icon={t.icon} size={22} className="text-red-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black text-on-surface">{t.title}</h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {t.tags?.map((tag, idx) => (
                      <span key={idx} className="text-[7px] font-black uppercase bg-primary/10 text-primary px-1 py-0.5 rounded leading-none">#{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black uppercase text-on-surface-variant opacity-60 bg-white/5 px-1.5 py-0.5 rounded">{t.category}</span>
                    <span className="text-[9px] font-bold text-on-surface-variant opacity-40">{format(new Date(t.date), 'dd MMM', { locale: ar })}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-black text-red-500 font-display">-{formatMoney(t.amount, isPrivacyMode)}</span>
                <button 
                  onClick={() => onDeleteTransaction(t.id)}
                  className="p-1.5 text-on-surface-variant opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            ></motion.div>
            
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-background w-full max-w-xl rounded-t-[32px] md:rounded-[32px] p-8 space-y-6 relative z-10 border-t border-white/10 max-h-[90vh] overflow-y-auto"
              dir="rtl"
            >
              <div className="flex justify-between items-center mb-4">
                 <h2 className="font-display font-black text-xl">إضافة مصروف جديد</h2>
                 <button onClick={() => setShowAddModal(false)} className="bg-white/5 p-2 rounded-full"><X size={20}/></button>
              </div>

              <AddTransactionForm 
                categories={categories} 
                accounts={accounts} 
                onAdd={(t) => {
                  onAddTransaction(t);
                  setShowAddModal(false);
                }} 
                currency={currency}
                exchangeRate={exchangeRate}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Reports({ 
  transactions, 
  categories, 
  isFullScreen, 
  onToggleFullScreen, 
  isPremium,
  isPrivacyMode,
  formatMoney,
  onRequirePremium
}: { 
  transactions: Transaction[], 
  categories: Category[], 
  isFullScreen?: boolean, 
  onToggleFullScreen?: () => void, 
  isPremium?: boolean,
  isPrivacyMode?: boolean,
  formatMoney: (amt: number, priv?: boolean) => string,
  onRequirePremium: () => void
}
) {
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const exportToCSV = () => {
    if (!isPremium) {
      onRequirePremium();
      return;
    }
    const csvData = filteredTransactions.map(t => ({
      'التاريخ': format(new Date(t.date), 'yyyy-MM-dd'),
      'العنوان': t.title,
      'المبلغ': t.amount,
      'النوع': t.type === 'transfer' ? 'تحويل' : t.type === 'income' ? 'دخل' : 'مصروف',
      'الفئة': t.category,
      'ملاحظات': t.notes || ''
    }));
    
    // Get headers
    const headers = Object.keys(csvData[0] || {}).join(',');
    // Get rows
    const rows = csvData.map(obj => Object.values(obj).map(val => `"${val}"`).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tofeer-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    if (!isPremium) {
      onRequirePremium();
      return;
    }
    const element = document.getElementById('advanced-pdf-report');
    if (!element) return;
    
    // Temporarily patch getComputedStyle to prevent html2canvas from crashing on oklch
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function(el, pseudoElt) {
      const computed = originalGetComputedStyle(el, pseudoElt);
      return new Proxy(computed, {
        get(target, prop, receiver) {
          if (prop === 'getPropertyValue') {
            return (p) => {
              const val = target.getPropertyValue(p);
              // html2canvas doesn't support oklch, so fallback to transparent if encountered
              if (val && val.includes('oklch')) return 'transparent';
              return val;
            };
          }
          if (prop === 'length') return target.length;
          // Proxy indexed access like computed[0]
          if (typeof prop === 'string' && !isNaN(Number(prop))) {
            return target[prop as Extract<keyof CSSStyleDeclaration, string>];
          }
          const val = target[prop as keyof CSSStyleDeclaration];
          if (typeof val === 'function') {
            return val.bind(target);
          }
          return val;
        }
      });
    };

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Unhide for rendering
      element.style.display = 'block';
      element.style.opacity = '1';
      
      const opt = {
        margin:       [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
        filename:     `tofeer-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          onclone: (clonedDoc: any) => {
            const style = clonedDoc.createElement('style');
            // Force border-colors and default text decorations to transparent/hex to override Tailwind v4's oklch variables
            style.innerHTML = `
              * {
                border-color: transparent !important;
                outline-color: transparent !important;
                text-decoration-color: transparent !important;
              }
            `;
            clonedDoc.head.appendChild(style);
            
            // Explicitly set explicit borders on our tables if needed
            const rows = clonedDoc.querySelectorAll('#advanced-pdf-report tr');
            rows.forEach((r: any) => {
              r.style.borderColor = '#f3f4f6';
            });
            const header = clonedDoc.querySelectorAll('#advanced-pdf-report h2, #advanced-pdf-report .border-b-4');
            header.forEach((h: any) => {
              h.style.borderColor = '#e5e7eb';
            });
          }
        },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' as const }
      };
      
      await html2pdf().set(opt).from(element).save();
      
      // Hide again
      element.style.display = 'none';
      element.style.opacity = '0';
    } finally {
      // Restore getComputedStyle
      window.getComputedStyle = originalGetComputedStyle;
    }
  };

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (timeFilter) {
      case 'day': startDate = new Date(now.setHours(0,0,0,0)); break;
      case 'week': startDate = subDays(new Date(), 7); break;
      case 'month': startDate = startOfMonth(new Date()); break;
      case 'year': startDate = startOfYear(new Date()); break;
      case 'custom': 
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      default: startDate = startOfMonth(new Date());
    }

    return transactions.filter(t => {
      const d = new Date(t.date);
      if (timeFilter === 'custom') {
        return d >= startDate && d <= endDate;
      }
      return isAfter(d, startDate);
    });
  }, [transactions, timeFilter, customStartDate, customEndDate]);

  const { totalIncome, totalExpenses, categoryData, trendData } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    const catExpenses: Record<string, number> = {};
    const trends: Record<string, { name: string, income: number, expense: number }> = {};

    filteredTransactions.forEach(t => {
      const amount = t.amount;
      const dateKey = format(new Date(t.date), timeFilter === 'year' ? 'MMM' : 'dd MMM', { locale: ar });

      if (!trends[dateKey]) {
        trends[dateKey] = { name: dateKey, income: 0, expense: 0 };
      }

      if (t.type === 'income') {
        income += amount;
        trends[dateKey].income += amount;
      } else if (t.type === 'expense') {
        expenses += amount;
        trends[dateKey].expense += amount;
        catExpenses[t.category] = (catExpenses[t.category] || 0) + amount;
      }
    });

    const pieData = Object.entries(catExpenses).map(([name, value]) => {
      const categoryInfo = categories.find(c => c.label === name);
      return {
        name,
        value,
        color: categoryInfo?.color.split(' ')[1] || '#6366f1',
        iconUrl: categoryInfo?.iconUrl
      };
    }).sort((a, b) => b.value - a.value);

    // If pie data is empty, use mock or empty state
    const finalPieData = pieData.length > 0 ? pieData : [{ name: 'لا يوجد', value: 1, color: '#333' }];

    const sortedTrendData = Object.values(trends);

    return { 
      totalIncome: income, 
      totalExpenses: expenses, 
      categoryData: finalPieData, 
      trendData: sortedTrendData 
    };
  }, [filteredTransactions, timeFilter]);

  const comparisonData = useMemo(() => {
    const now = new Date();
    const startOfCurrent = startOfMonth(now);
    const startOfPrev = startOfMonth(subMonths(now, 1));
    const endOfPrev = subDays(startOfCurrent, 1);

    const currentMonthTx = transactions.filter(t => isAfter(new Date(t.date), startOfCurrent));
    const prevMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= startOfPrev && d <= endOfPrev;
    });

    const currentIncome = currentMonthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const currentExpense = currentMonthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    const prevIncome = prevMonthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const prevExpense = prevMonthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    return [
      {
        name: 'الشهر السابق',
        income: prevIncome,
        expense: prevExpense,
      },
      {
        name: 'الشهر الحالي',
        income: currentIncome,
        expense: currentExpense,
      }
    ];
  }, [transactions]);

  const savingsRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="flex justify-between items-center px-1">
        <div className="text-right">
          <h1 className="font-display font-black text-2xl text-on-surface flex items-center justify-center md:justify-start gap-2">
            <LineChartIcon className="text-primary text-opacity-80" />
            التقارير المالية
          </h1>
          <p className="text-on-surface-variant font-bold text-xs mt-1">تحليل مفصل لدخلك ومصروفاتك</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportToPDF}
            className="p-3 bg-white/5 rounded-2xl text-on-surface-variant hover:text-red-400 transition-all active:scale-95 border border-white/5"
            title="تصدير PDF"
          >
            <FileText size={20} strokeWidth={1.5} />
          </button>
          <button 
            onClick={exportToCSV}
            className="p-3 bg-white/5 rounded-2xl text-on-surface-variant hover:text-green-500 transition-all active:scale-95 border border-white/5"
            title="تصدير CSV"
          >
            <FileSpreadsheet size={20} strokeWidth={1.5} />
          </button>
          <button 
            onClick={onToggleFullScreen}
            className="p-3 bg-white/5 rounded-2xl text-on-surface-variant hover:text-primary transition-all active:scale-95 border border-white/5"
            title={isFullScreen ? "خروج من ملء الشاشة" : "وضع ملء الشاشة"}
          >
            {isFullScreen ? <Minimize size={20} strokeWidth={1.5} /> : <Maximize size={20} strokeWidth={1.5} />}
          </button>
        </div>
      </section>

      {/* Hidden PDF Template */}
      <div id="advanced-pdf-report" style={{ display: 'none', opacity: 0, position: 'absolute', top: '-9999px', left: '-9999px', width: '800px', backgroundColor: '#fcfcfc', color: '#111' }} className="p-10 font-sans" dir="rtl">
        <div style={{ borderBottomColor: '#6366f1' }} className="border-b-4 pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 style={{ color: '#111827' }} className="text-4xl font-display font-black mb-2">توفير</h1>
            <p style={{ color: '#6b7280' }} className="text-sm font-bold">التقرير المالي المفصل الذكي</p>
          </div>
          <div style={{ color: '#6b7280' }} className="text-left text-sm font-medium">
            <p>تاريخ التقرير: {format(new Date(), 'yyyy/MM/dd')}</p>
            <p>الفترة: {timeFilter === 'custom' ? `${customStartDate} إلى ${customEndDate}` : timeFilter === 'day' ? 'اليوم' : timeFilter === 'week' ? 'هذا الأسبوع' : timeFilter === 'month' ? 'هذا الشهر' : 'هذه السنة'}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-10">
          <div style={{ backgroundColor: '#f9fafb', borderColor: '#f3f4f6' }} className="p-6 rounded-2xl border">
            <p style={{ color: '#6b7280' }} className="text-xs font-bold uppercase tracking-wider mb-2">إجمالي الدخل</p>
            <p style={{ color: '#16a34a' }} className="text-2xl font-black font-display">{formatMoney(totalIncome, isPrivacyMode)}</p>
          </div>
          <div style={{ backgroundColor: '#f9fafb', borderColor: '#f3f4f6' }} className="p-6 rounded-2xl border">
            <p style={{ color: '#6b7280' }} className="text-xs font-bold uppercase tracking-wider mb-2">إجمالي المصروفات</p>
            <p style={{ color: '#dc2626' }} className="text-2xl font-black font-display">{formatMoney(totalExpenses, isPrivacyMode)}</p>
          </div>
          <div style={{ backgroundColor: '#f9fafb', borderColor: '#f3f4f6' }} className="p-6 rounded-2xl border">
            <p style={{ color: '#6b7280' }} className="text-xs font-bold uppercase tracking-wider mb-2">صافي المدخرات</p>
            <p style={{ color: totalIncome - totalExpenses >= 0 ? '#16a34a' : '#dc2626' }} className="text-2xl font-black font-display">{formatMoney(totalIncome - totalExpenses, isPrivacyMode)}</p>
          </div>
        </div>

        <div className="mb-10">
          <h2 style={{ color: '#111827', borderBottomColor: '#e5e7eb' }} className="text-xl font-bold mb-4 border-b pb-2">تفاصيل المعاملات المالية</h2>
          <table className="w-full text-right text-sm">
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', color: '#4b5563' }} className="font-bold">
                <th className="py-3 px-4 rounded-r-lg">التاريخ</th>
                <th className="py-3 px-4">العنوان</th>
                <th className="py-3 px-4">الفئة</th>
                <th className="py-3 px-4">النوع</th>
                <th className="py-3 px-4 rounded-l-lg text-left">المبلغ</th>
              </tr>
            </thead>
            <tbody className="mt-2">
              {filteredTransactions.map((t, idx) => (
                <tr key={idx} style={{ borderBottomColor: '#f9fafb', color: '#1f2937' }} className="border-b border-spacing-y-2 font-medium">
                  <td className="py-3 px-4">{format(new Date(t.date), 'yyyy/MM/dd')}</td>
                  <td className="py-3 px-4">{t.title}</td>
                  <td className="py-3 px-4">{t.category}</td>
                  <td className="py-3 px-4 flex items-center gap-1">
                    {t.type === 'income' ? <span style={{ color: '#22c55e' }}>دخل</span> : t.type === 'expense' ? <span style={{ color: '#ef4444' }}>مصروف</span> : <span style={{ color: '#3b82f6' }}>تحويل</span>}
                  </td>
                  <td className="py-3 px-4 text-left font-display font-bold" dir="ltr">
                    {t.type === 'expense' ? '-' : '+'}{t.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div style={{ color: '#9ca3af' }} className="text-center py-10 font-bold">لا توجد معاملات مالية في هذه الفترة</div>
          )}
        </div>
        
        <div style={{ color: '#9ca3af', borderTopColor: '#e5e7eb' }} className="text-center text-xs font-bold border-t pt-6 mt-10">
          تم إنشاء هذا التقرير تلقائياً بواسطة تطبيق توفير (Tofeer)
        </div>
      </div>

      {/* Time Filter */}
      <div className="space-y-4">
        <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10 shadow-inner" dir="rtl">
          {[
            { id: 'day', label: 'يوم' },
            { id: 'week', label: 'أسبوع' },
            { id: 'month', label: 'شهر' },
            { id: 'year', label: 'سنة' },
            { id: 'custom', label: 'مخصص' }
          ].map((btn) => (
            <button 
              key={btn.id} 
              onClick={() => setTimeFilter(btn.id as any)}
              className={`flex-1 py-2.5 rounded-xl font-black text-[10px] sm:text-xs transition-all ${timeFilter === btn.id ? 'immersive-gradient text-white shadow-lg' : 'text-on-surface-variant hover:bg-white/5'}`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {timeFilter === 'custom' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card p-4 overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-4" dir="rtl">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase pr-1">من تاريخ</label>
                  <input 
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/40 color-scheme-dark"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase pr-1">إلى تاريخ</label>
                  <input 
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/40 color-scheme-dark"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-5 border-r-4 border-r-green-500 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-60">إجمالي الدخل</p>
            <div className="my-1.5 flex items-baseline gap-1">
              <span className="font-display text-xl font-black text-green-500">{formatMoney(totalIncome, isPrivacyMode)}</span>
            </div>
            <div className="flex items-center gap-1 text-green-500 text-[9px] font-black">
              <TrendingUp size={10} />
              <span>مستقر</span>
            </div>
          </div>
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-green-500/10 rounded-full blur-xl"></div>
        </div>
        <div className="glass-card p-5 border-r-4 border-r-red-500 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-60">إجمالي المصروفات</p>
            <div className="my-1.5 flex items-baseline gap-1">
              <span className="font-display text-xl font-black text-red-500">{formatMoney(totalExpenses, isPrivacyMode)}</span>
            </div>
            <div className="flex items-center gap-1 text-red-500 text-[9px] font-black">
              <TrendingDown size={10} />
              <span>{totalIncome > 0 ? `${Math.round((totalExpenses/totalIncome)*100)}% من الدخل` : '0%'}</span>
            </div>
          </div>
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-red-500/10 rounded-full blur-xl"></div>
        </div>
      </div>

      {/* Comparison Chart */}
      <section className="glass-card p-6">
        <div className="flex justify-between items-center mb-6 px-1">
          <h2 className="font-display font-bold text-lg text-on-surface">مقارنة شهرية</h2>
          <div className="flex items-center gap-1.5 text-[9px] font-black text-on-surface-variant">
             <BarChart2 size={12} className="text-primary" />
             <span>الدخل ضد المصروف</span>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart
              data={comparisonData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
              />
              <YAxis hide />
              <Tooltip 
                cursor={{ fill: 'rgba(var(--theme-primary),0.05)' }}
                contentStyle={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--glass-border-color)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
                itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                formatter={(value: number) => [`${formatMoney(value, isPrivacyMode)}`]}
              />
              <Bar 
                dataKey="income" 
                name="دخل" 
                fill="rgb(var(--theme-primary))" 
                radius={[6, 6, 0, 0]} 
                barSize={32}
                animationDuration={800}
              />
              <Bar 
                dataKey="expense" 
                name="مصروف" 
                fill="#ef4444" 
                radius={[6, 6, 0, 0]} 
                barSize={32}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-tighter opacity-60">تغير الدخل</p>
            <p className={`text-sm font-black mt-1 ${comparisonData[1].income >= comparisonData[0].income ? 'text-green-500' : 'text-red-500'}`}>
              {comparisonData[0].income > 0 ? `${(((comparisonData[1].income - comparisonData[0].income) / comparisonData[0].income) * 100).toFixed(1)}%` : '0%'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-tighter opacity-60">تغير المصروف</p>
            <p className={`text-sm font-black mt-1 ${comparisonData[1].expense <= comparisonData[0].expense ? 'text-green-500' : 'text-red-500'}`}>
              {comparisonData[0].expense > 0 ? `${(((comparisonData[1].expense - comparisonData[0].expense) / comparisonData[0].expense) * 100).toFixed(1)}%` : '0%'}
            </p>
          </div>
        </div>
      </section>

      {/* Trend Chart */}
      <section className="glass-card p-6">
        <div className="flex justify-between items-center mb-6 px-1">
          <h2 className="font-display font-bold text-lg text-on-surface">تحليل الاتجاه</h2>
          <div className="flex items-center gap-4 text-[9px] font-black">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary"></div><span>الدخل</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div><span>المصروف</span></div>
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(var(--theme-primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="rgb(var(--theme-primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border-color)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fontWeight: 700, fill: 'var(--on-surface-variant-color)' }} 
              />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--glass-border-color)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
                itemStyle={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--on-surface-color)' }}
                formatter={(value: number) => [`${formatMoney(value, isPrivacyMode)}`]}
                labelStyle={{ color: 'var(--on-surface-variant-color)' }}
              />
              <Area type="monotone" dataKey="income" name="دخل" stroke="rgb(var(--theme-primary))" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} animationDuration={1000} />
              <Area type="monotone" dataKey="expense" name="مصروف" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} animationDuration={1000} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Category Breakdowns */}
      <section className="glass-card p-6">
        <div className="flex justify-between items-center mb-8 px-1">
          <h2 className="font-display font-bold text-lg">توزيع المصروفات</h2>
          <div className="bg-primary/10 px-3 py-1 rounded-full">
             <span className="text-[10px] text-primary font-black uppercase tracking-wider">حسب الفئة</span>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-48 h-48 relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  animationBegin={0}
                  animationDuration={800}
                >
                   {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || 'rgb(var(--theme-primary))'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--glass-border-color)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                  formatter={(value: number) => [`${formatMoney(value, isPrivacyMode)}`, 'المبلغ']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-black text-on-surface">{Math.round(savingsRate)}%</span>
              <span className="text-[9px] text-on-surface-variant font-black tracking-widest uppercase mt-0.5">الادخار</span>
            </div>
          </div>
          <div className="flex-1 w-full space-y-5">
            {categoryData.slice(0, 4).map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden border border-white/5">
                      {item.iconUrl ? (
                        <img src={item.iconUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || '#6366f1' }}></div>
                      )}
                    </div>
                    <span className="text-on-surface-variant">{item.name}</span>
                  </div>
                  <span className="text-on-surface">{((item.value / (totalExpenses || 1)) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.value / (totalExpenses || 1)) * 100}%` }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.color || '#6366f1' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pro Financial Metrics */}
      <section className={`glass-card p-6 relative overflow-hidden transition-all duration-700 ${!isPremium ? 'opacity-80' : 'bg-primary/5 border-primary/20 shadow-2xl'}`}>
        {!isPremium && (
          <div className="absolute inset-0 bg-background/40 backdrop-blur-[6px] z-20 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
             <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary mb-4 shadow-inner ring-1 ring-white/10">
               <Lock size={28} />
             </div>
             <h3 className="text-base font-black mb-2 flex items-center gap-2 text-on-surface">
               مؤشرات احترافية مغلقة
               <Diamond size={16} className="text-yellow-400 fill-yellow-400" />
             </h3>
             <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed max-w-[240px] opacity-80">
               افتح Pro Dashboard لمتابعة التدفق النقدي (Cash Flow)، معدل الحرق (Burn Rate)، وصافي الثروة (Net Worth).
             </p>
             <div className="mt-6 w-12 h-1 bg-white/10 rounded-full"></div>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-8 relative z-10 px-1">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/15 rounded-xl text-primary">
               <LayoutDashboard size={20} />
             </div>
             <div>
               <h2 className="font-display font-black text-lg">مؤشرات احترافية (Pro)</h2>
               <p className="text-[10px] text-on-surface-variant font-bold opacity-60">تحليل معمق للأداء المالي</p>
             </div>
          </div>
          {isPremium && (
            <span className="text-[9px] bg-green-500/10 text-green-500 px-3 py-1 rounded-full font-black uppercase tracking-tight border border-green-500/20 shadow-sm animate-pulse">مفعل</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="space-y-4">
             <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-on-surface-variant opacity-60 pr-1">Cash Flow</span>
                <TrendingUp size={14} className="text-green-400 opacity-40" />
             </div>
             <div className="glass-card p-4 bg-white/2 border-white/5">
                <p className="text-xl font-black font-display text-primary">{formatMoney(totalIncome - totalExpenses, isPrivacyMode)}</p>
                <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                   <div className="h-full bg-primary/40" style={{ width: '65%' }}></div>
                </div>
                <p className="text-[9px] mt-2 font-bold text-on-surface-variant opacity-60">تعديل السيولة متاح</p>
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-on-surface-variant opacity-60 pr-1">Monthly Burn Rate</span>
                <Zap size={14} className="text-red-400 opacity-40" />
             </div>
             <div className="glass-card p-4 bg-white/2 border-white/5">
                <p className="text-xl font-black font-display text-red-400">{formatMoney(totalExpenses / 30, isPrivacyMode)} / يوم</p>
                <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                   <div className="h-full bg-red-400/40" style={{ width: '40%' }}></div>
                </div>
                <p className="text-[9px] mt-2 font-bold text-on-surface-variant opacity-60">على مدار آخر 30 يوم</p>
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-on-surface-variant opacity-60 pr-1">Financial Health</span>
                <ShieldCheck size={14} className="text-blue-400 opacity-40" />
             </div>
             <div className="glass-card p-4 bg-white/2 border-white/5">
                <p className="text-xl font-black font-display text-blue-400">{savingsRate > 20 ? 'ممتاز' : 'متوسط'}</p>
                <div className="flex gap-1 mt-3">
                   {[1,2,3,4,5].map(i => (
                     <div key={i} className={`h-1 flex-1 rounded-full ${i <= (savingsRate/20) + 1 ? 'bg-blue-400' : 'bg-white/5'}`}></div>
                   ))}
                </div>
                <p className="text-[9px] mt-2 font-bold text-on-surface-variant opacity-60">بناءً على نسبة الادخار</p>
             </div>
          </div>
        </div>

        {/* Pro Charts Placeholder */}
        <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
           <div className="flex gap-4 items-center mb-6">
              <div className="flex-1 h-px bg-white/5"></div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30">Net Worth History (Last 7 Days)</p>
              <div className="flex-1 h-px bg-white/5"></div>
           </div>
           {(() => {
              const currentNW = transactions.reduce((s,t) => t.type==='income'? s+t.amount : t.type==='expense'? s-t.amount : s, 0);
              let tempNW = currentNW;
              const history = [currentNW];
              
              for (let i = 1; i < 7; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i + 1);
                const dayStr = d.toISOString().split('T')[0];
                const dayTx = transactions.filter(t => new Date(t.date).toISOString().split('T')[0] === dayStr);
                const dInc = dayTx.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
                const dExp = dayTx.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
                tempNW = tempNW - dInc + dExp;
                history.push(tempNW);
              }
              const reversed = history.reverse();
              const maxVal = Math.max(...reversed, 1);
              const minVal = Math.min(...reversed, 0);
              const range = maxVal - minVal || 1;

              return (
                <div className="h-32 w-full flex items-end justify-between gap-1 px-2">
                   {reversed.map((val, i) => {
                     const heightPercent = Math.max(10, ((val - minVal) / range) * 100);
                     return (
                       <div key={i} className={`flex-1 rounded-t-lg transition-all duration-1000 ${isPremium ? 'bg-primary/20' : 'bg-white/5'}`} style={{ height: `${heightPercent}%` }}></div>
                     );
                   })}
                </div>
              );
           })()}
        </div>
      </section>

      {/* Savings Growth */}
      <section className="glass-card p-6 immersive-gradient text-white border-none shadow-[0_20px_50px_rgba(var(--theme-primary),0.3)]">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
            <BarChart2 className="text-white" size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-display font-black text-lg">النمو المالي</h3>
            <p className="text-[10px] font-bold opacity-70 italic">رؤية مستقبلية لمدخراتك</p>
          </div>
        </div>
        <p className="text-xs font-medium leading-relaxed opacity-90 mb-5">
          بناءً على نشاطك المالي الحالي، أنت في طريقك لتوفير ما يقارب <b>{formatMoney(totalIncome - totalExpenses, isPrivacyMode)}</b> بنهاية الفترة. استمر في التحكم بمصروفاتك!
        </p>
        <button className="w-full py-3 bg-white text-primary rounded-xl font-display font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl">
          تحسين الميزانية
        </button>
      </section>
    </div>
  );
}

function AddScreen({ 
  categories, 
  accounts, 
  onAddTransaction, 
  onCancel,
  currency,
  exchangeRate,
  autoCategories
}: { 
  categories: Category[], 
  accounts: Account[], 
  onAddTransaction: (t: any) => void, 
  onCancel: () => void,
  currency: 'IQD' | 'USD',
  exchangeRate: number,
  autoCategories?: Record<string, string>
}
) {
  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center px-1">
        <h2 className="font-display font-black text-2xl bg-gradient-to-l from-primary to-primary-light bg-clip-text text-transparent">
          إضافة عملية مالية
        </h2>
        <button onClick={onCancel} className="bg-white/5 p-2.5 rounded-full text-on-surface-variant hover:bg-white/10 transition-all">
          <X size={20} strokeWidth={1.5} />
        </button>
      </div>

      <div className="glass-card p-1">
        <AddTransactionForm 
          categories={categories} 
          accounts={accounts} 
          onAdd={(t) => onAddTransaction(t)} 
          currency={currency}
          exchangeRate={exchangeRate}
          autoCategories={autoCategories}
        />
      </div>
    </div>
  );
}

function AddTransactionForm({ categories, accounts, onAdd, currency, exchangeRate, autoCategories }: { categories: Category[], accounts: Account[], onAdd: (t: any) => void, currency: string, exchangeRate: number, autoCategories?: Record<string, string> }
) {
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(categories[0] || null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(accounts[0] || null);
  const [toAccount, setToAccount] = useState<Account | null>(accounts.length > 1 ? accounts[1] : null);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        setIsAiScanning(true);
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            
            const response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: {
                parts: [
                  { inlineData: { data: base64Data, mimeType: 'audio/webm' } },
                  { text: `استخرج بيانات المعاملة المالية من هذه الملاحظة الصوتية أو النص.
أعد فقط ملف JSON بالهيكل التالي: { "title": "string", "amount": number, "category": "string" }.
قواعد هامة جداً:
- العنوان (title): استخرج اسم المادة أو الخدمة بدقة (مثال: طماطم، لحم، بنزين، فاتورة كهرباء). لا تكتب جملاً طويلة.
- المبلغ (amount): يجب أن يكون رقماً (number).
- الفئة (category): استخدم ذكاءك لتعيين الفئة الصحيحة من هذه القائمة (يجب أن تطابق إحداها تماماً): "طعام", "نقل", "منزل", "دراسة", "تسوق", "ترفيه", "أخرى".
  * أمثلة: 
    - أي مواد غذائية (طماطم، خيار، لحم، دجاج، أرز، مقاضي، بقالة، مطعم) -> "طعام"
    - سيارة، بنزين، غسيل سيارة، باص، تاكسي -> "نقل"
    - كهرباء، إنترنت، إيجار، أدوات صحية، أثاث -> "منزل"
    - ملابس، أحذية، عطور، أدوات تجميل -> "تسوق"
    - سينما، ألعاب، اشتراكات ترفيهية -> "ترفيه"
    - كتب، رسوم مدرسية، أقلام -> "دراسة"
لا تقم بهلوسة أي بيانات. لا تضف أي نص خارج كود JSON.` }
                ]
              },
              config: { responseMimeType: "application/json" }
            });
            const data = JSON.parse(response.text || '{}');
            if (data.title) setTitle(data.title);
            if (data.amount) setAmount(data.amount.toString());
            if (data.category) {
              const cat = categories.find(c => c.label === data.category) || categories.find(c => c.label === 'أخرى');
              if (cat) setSelectedCategory(cat);
            }
          };
          reader.readAsDataURL(audioBlob);
        } catch (err) {
          console.error("Audio processing failed:", err);
          alert("فشلت معالجة الصوت. حاول مرة أخرى.");
        } finally {
          setIsAiScanning(false);
          setIsRecording(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("يرجى السماح بالوصول إلى الميكروفون.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    if (type === 'expense' && title.trim() && autoCategories) {
      const match = autoCategories[title.trim().toLowerCase()];
      if (match) {
        const cat = categories.find(c => c.id === match);
        if (cat) setSelectedCategory(cat);
      }
    }
  }, [title, type, autoCategories, categories]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleScanBill = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAiScanning(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: file.type } },
              { text: "Extract transaction data from this receipt. Return only JSON with following structure: { title, amount, category (one of: طعام, نقل, منزل, دراسة, تسوق, ترفيه, أخرى) }. Amount must be literal number." }
            ]
          },
          config: { responseMimeType: "application/json" }
        });

        const data = JSON.parse(response.text || '{}');
        if (data.title) setTitle(data.title);
        if (data.amount) setAmount(data.amount.toString());
        if (data.category) {
          const cat = categories.find(c => c.label === data.category) || categories.find(c => c.label === 'أخرى');
          if (cat) setSelectedCategory(cat);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Scanning failed:", err);
    } finally {
      setIsAiScanning(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col items-center gap-8">
        <div className="bg-white/5 backdrop-blur-md rounded-full p-1.5 flex w-full max-w-[300px] border border-white/10 shadow-inner">
          <button 
            onClick={() => setType('expense')}
            className={`flex-1 py-3 px-4 rounded-full font-black text-xs transition-all duration-300 ${type === 'expense' ? 'immersive-gradient text-on-primary shadow-xl scale-105' : 'text-on-surface-variant'}`}
          >
            مصروف
          </button>
          <button 
            onClick={() => setType('income')}
            className={`flex-1 py-3 px-4 rounded-full font-black text-xs transition-all duration-300 ${type === 'income' ? 'immersive-gradient text-on-primary shadow-xl scale-105' : 'text-on-surface-variant'}`}
          >
            دخل
          </button>
          <button 
            onClick={() => setType('transfer' as any)}
            className={`flex-1 py-3 px-4 rounded-full font-black text-xs transition-all duration-300 ${type === 'transfer' as any ? 'immersive-gradient text-on-primary shadow-xl scale-105' : 'text-on-surface-variant'}`}
          >
            تحويل
          </button>
        </div>

        <div className="text-center space-y-2 w-full relative">
          <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-40">المبلغ ({currency === 'IQD' ? 'دينار' : 'دولار'})</p>
          <div className="flex items-baseline justify-center gap-3">
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-display text-5xl font-black text-on-surface tracking-tighter bg-transparent text-center focus:outline-none w-48"
              placeholder="0"
            />
            <span className="font-display font-black text-primary text-xl">{currency === 'IQD' ? 'د.ع' : '$'}</span>
          </div>
          {currency === 'USD' && amount && (
            <p className="text-[10px] font-bold text-on-surface-variant opacity-60">≈ {(parseFloat(amount) * exchangeRate).toLocaleString()} د.ع (سعر الصرف: {exchangeRate})</p>
          )}
          {currency === 'IQD' && amount && (
             <p className="text-[10px] font-bold text-on-surface-variant opacity-60">≈ {(parseFloat(amount) / exchangeRate).toFixed(2)} $ (سعر الصرف: {exchangeRate})</p>
          )}
          
          <div className="absolute top-0 left-0 flex flex-col gap-2">
             <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isAiScanning}
              className={`p-3 bg-white/5 rounded-2xl text-primary hover:bg-primary/10 transition-all border border-white/5 shadow-inner ${isAiScanning ? 'animate-pulse opacity-50' : ''}`}
              title="مسح الفاتورة بالذكاء الاصطناعي"
            >
              <Camera size={20} strokeWidth={1.5} />
            </button>
            <button 
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              disabled={isAiScanning}
              className={`p-3 rounded-2xl transition-all border shadow-inner flex items-center justify-center ${isRecording ? 'bg-red-500/20 text-red-500 border-red-500/50 animate-pulse' : 'bg-white/5 text-primary border-white/5 hover:bg-primary/10'} ${isAiScanning && !isRecording ? 'opacity-50' : ''}`}
              title={isRecording ? "إيقاف التسجيل" : "تسجيل الفاتورة بالصوت"}
            >
              {isRecording ? <Square size={20} strokeWidth={1.5} fill="currentColor" /> : <Mic size={20} strokeWidth={1.5} />}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleScanBill} 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
            />
          </div>
        </div>
      </section>

      <div className="space-y-5">
        <div className="space-y-2.5">
          <label className="font-display font-black text-[10px] text-on-surface-variant pr-2 uppercase tracking-widest opacity-40 leading-none">
            {type === 'transfer' ? 'الحساب المُرسل (من)' : 'الحساب المالي'}
          </label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" dir="rtl">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => setSelectedAccount(acc)}
                className={`flex items-center gap-3 px-4 py-3 min-w-[130px] rounded-2xl glass-card transition-all border shrink-0 ${selectedAccount?.id === acc.id ? 'ring-2 ring-primary border-transparent' : 'border-white/5 opacity-60'}`}
              >
                <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${acc.color}`}>
                  <IconRenderer icon={acc.icon} size={16} strokeWidth={1.5} />
                </div>
                <span className="text-xs font-bold">{acc.name}</span>
              </button>
            ))}
          </div>
        </div>

        {type === 'transfer' && (
          <div className="space-y-2.5">
            <label className="font-display font-black text-[10px] text-on-surface-variant pr-2 uppercase tracking-widest opacity-40 leading-none">الحساب المُستقبل (إلى)</label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" dir="rtl">
              {accounts.filter(a => a.id !== selectedAccount?.id).map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setToAccount(acc)}
                  className={`flex items-center gap-3 px-4 py-3 min-w-[130px] rounded-2xl glass-card transition-all border shrink-0 ${toAccount?.id === acc.id ? 'ring-2 ring-primary border-transparent' : 'border-white/5 opacity-60'}`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${acc.color}`}>
                    <IconRenderer icon={acc.icon} size={16} strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-bold">{acc.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          <label className="font-display font-black text-[10px] text-on-surface-variant pr-2 uppercase tracking-widest opacity-40 leading-none">اسم العملية</label>
          <input 
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full glass-card px-5 py-4 font-sans focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all text-sm bg-white/5 backdrop-blur-xl" 
            placeholder="مثال: اشتراك نت، راتب..."
          />
        </div>

        <div className="space-y-2.5">
          <label className="font-display font-black text-[10px] text-on-surface-variant pr-2 uppercase tracking-widest opacity-40 leading-none">ملاحظات إضافية (اختياري)</label>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full glass-card px-5 py-4 font-sans focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all text-sm bg-white/5 backdrop-blur-xl min-h-[100px] resize-none" 
            placeholder="أضف تفاصيل إضافية هنا..."
          />
        </div>

        <div className="space-y-2.5">
          <label className="font-display font-black text-[10px] text-on-surface-variant pr-2 uppercase tracking-widest opacity-40 leading-none">الوسوم (تبويب)</label>
          <div className="flex flex-wrap gap-2 mb-2 min-h-4">
            {tags.map((tag, idx) => (
              <span key={idx} className="bg-primary/20 text-primary text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 border border-primary/20">
                {tag}
                <X size={10} className="cursor-pointer" onClick={() => setTags(prev => prev.filter((_, i) => i !== idx))} />
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input 
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  e.preventDefault();
                  if (!tags.includes(tagInput.trim())) {
                    setTags([...tags, tagInput.trim()]);
                  }
                  setTagInput('');
                }
              }}
              className="flex-1 glass-card px-5 py-3 font-sans focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all text-sm bg-white/5 backdrop-blur-xl" 
              placeholder="مثال: قهوة، عطلة... (اضغط Enter للإضافة)"
            />
            <button 
              onClick={() => {
                if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                  setTags([...tags, tagInput.trim()]);
                  setTagInput('');
                }
              }}
              className="p-3 bg-primary/20 text-primary rounded-2xl hover:bg-primary/30 transition-all"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center justify-between transition-all duration-300 cursor-pointer" onClick={() => setIsRecurring(!isRecurring)}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl transition-colors ${isRecurring ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-white/5 text-on-surface-variant border border-white/5'}`}>
              <RefreshCcw size={18} className={isRecurring ? 'animate-spin-slow' : ''} />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">عملية متكررة</p>
              <p className="text-[10px] text-on-surface-variant font-bold">تكرار هذه العملية تلقائياً</p>
            </div>
          </div>
          <div className={`w-12 h-6 rounded-full transition-all duration-500 relative p-1 pointer-events-none ${isRecurring ? 'immersive-gradient shadow-[0_0_12px_rgba(99,102,241,0.4)]' : 'bg-white/10'}`}>
            <motion.div 
              animate={{ x: isRecurring ? 24 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="w-4 h-4 bg-white rounded-full shadow-lg"
            />
          </div>
        </div>

        <AnimatePresence>
          {isRecurring && (
            <motion.div 
              initial={{ height: 0, opacity: 0, y: -10 }}
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -10 }}
              className="overflow-hidden space-y-2.5 pt-1"
            >
              <label className="font-display font-black text-[10px] text-on-surface-variant pr-2 uppercase tracking-widest opacity-40 leading-none">فترة التكرار</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'daily', label: 'يومياً' },
                  { id: 'weekly', label: 'أسبوعياً' },
                  { id: 'monthly', label: 'شهرياً' },
                  { id: 'yearly', label: 'سنوياً' }
                ].map((freq) => (
                  <button 
                    key={freq.id}
                    onClick={(e) => { e.stopPropagation(); setFrequency(freq.id as any); }}
                    className={`py-3 rounded-xl font-black text-[10px] border transition-all ${frequency === freq.id ? 'immersive-gradient text-white border-transparent shadow-lg' : 'bg-white/5 border-white/10 text-on-surface-variant'}`}
                  >
                    {freq.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <section className="glass-card p-6 space-y-5">
        <h3 className="text-[10px] font-black text-on-surface-variant opacity-40 px-1 uppercase tracking-widest leading-none">الفئة</h3>
        <div className="grid grid-cols-4 gap-4">
          {categories.map((cat) => (
            <CategoryItem 
              key={cat.id} 
              icon={<IconRenderer icon={cat.icon} size={20} />} 
              label={cat.label} 
              color={cat.color} 
              bgColor={cat.bgColor} 
              isSelected={selectedCategory?.id === cat.id}
              onClick={() => setSelectedCategory(cat)}
              iconUrl={cat.iconUrl}
            />
          ))}
        </div>
      </section>

      <button 
        onClick={() => onAdd({
          id: Date.now().toString(),
          title: title || (type === 'transfer' ? 'تحويل مالي' : type === 'income' ? 'دخل جديد' : 'مصروف جديد'),
          amount: parseFloat(amount) || 0,
          type,
          category: type === 'transfer' ? 'تحويل' : (selectedCategory?.label || 'أخرى'),
          date: new Date(),
          icon: type === 'transfer' ? 'RefreshCcw' : (selectedCategory?.icon || (type === 'income' ? 'CreditCard' : 'Utensils')),
          color: type === 'transfer' ? 'text-primary' : (selectedCategory?.color || (type === 'income' ? 'text-green-400' : 'text-red-400')),
          isRecurring,
          frequency: isRecurring ? frequency : undefined,
          notes: notes.trim() || undefined,
          tags,
          iconUrl: type !== 'transfer' ? selectedCategory?.iconUrl : undefined,
          accountId: selectedAccount?.id,
          toAccountId: type === 'transfer' ? toAccount?.id : undefined
        })}
        className="w-full immersive-gradient text-on-primary py-5 rounded-2xl font-display font-black text-lg shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all border border-white/20"
      >
        حفظ العملية
      </button>
    </div>
  );
}

function AddGoalForm({ onAdd }: { onAdd: (g: any) => void }
) {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Car');

  return (
    <div className="space-y-7">
      <div className="space-y-5">
        <div className="space-y-2.5">
          <label className="font-display font-black text-[10px] text-on-surface-variant pr-2 uppercase tracking-widest opacity-40 leading-none">اسم الهدف</label>
          <input 
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full glass-card px-5 py-4 font-sans focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all text-sm bg-white/5 backdrop-blur-xl" 
            placeholder="مثال: دفعة أولى للمنزل"
          />
        </div>

        <div className="space-y-2.5">
          <label className="font-display font-black text-[10px] text-on-surface-variant pr-2 uppercase tracking-widest opacity-40 leading-none">المبلغ المستهدف (د.ع)</label>
          <input 
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full glass-card px-5 py-4 font-sans focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all text-sm bg-white/5 backdrop-blur-xl" 
            placeholder="0"
          />
        </div>
      </div>

      <section className="glass-card p-6 space-y-5">
        <h3 className="text-[10px] font-black text-on-surface-variant opacity-40 px-1 uppercase tracking-widest leading-none">اختر أيقونة</h3>
        <div className="grid grid-cols-4 gap-4 text-on-surface-variant">
           <CategoryItem onClick={() => setSelectedIcon('HomeIcon')} isSelected={selectedIcon === 'HomeIcon'} icon={<IconRenderer icon="HomeIcon" size={20} />} label="منزل" color="text-primary" bgColor="bg-primary/10" />
           <CategoryItem onClick={() => setSelectedIcon('Car')} isSelected={selectedIcon === 'Car'} icon={<IconRenderer icon="Car" size={20} />} label="سيارة" color="text-primary" bgColor="bg-primary/10" />
           <CategoryItem onClick={() => setSelectedIcon('Smartphone')} isSelected={selectedIcon === 'Smartphone'} icon={<IconRenderer icon="Smartphone" size={20} />} label="جهاز" color="text-primary" bgColor="bg-primary/10" />
           <CategoryItem onClick={() => setSelectedIcon('TrendingUp')} isSelected={selectedIcon === 'TrendingUp'} icon={<IconRenderer icon="TrendingUp" size={20} />} label="استثمار" color="text-primary" bgColor="bg-primary/10" />
        </div>
      </section>

      <button 
        onClick={() => onAdd({
          id: Math.random().toString(),
          title: title || 'هدف جديد',
          targetAmount: Number(target) || 1000000,
          currentAmount: 0,
          icon: selectedIcon,
          color: 'text-primary'
        })}
        className="w-full immersive-gradient text-on-primary py-5 rounded-2xl font-display font-black text-lg shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all border border-white/20"
      >
        إنشاء الهدف
      </button>
    </div>
  );
}



function AddDebtForm({ onAdd }: { onAdd: (debt: any) => void }
) {
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'owe' | 'owed'>('owe');
  const [dueDate, setDueDate] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName || !amount) return;
    
    onAdd({
      personName,
      amount: parseFloat(amount),
      type,
      dueDate: new Date(dueDate),
      description,
      status: 'active'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
        <button 
          type="button"
          onClick={() => setType('owe')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${type === 'owe' ? 'bg-red-500 text-white shadow-md' : 'text-on-surface-variant opacity-70 hover:opacity-100'}`}
        >
          أنا مدين (عليك)
        </button>
        <button 
          type="button"
          onClick={() => setType('owed')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${type === 'owed' ? 'bg-green-500 text-white shadow-md' : 'text-on-surface-variant opacity-70 hover:opacity-100'}`}
        >
          أنا دائن (لك)
        </button>
      </div>
      <div>
        <label className="block text-[10px] font-black uppercase text-on-surface-variant opacity-70 mb-2">اسم الشخص / الجهة</label>
        <input 
          type="text" 
          required
          value={personName}
          onChange={e => setPersonName(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-right"
          placeholder="محمد أحمد"
        />
      </div>
      <div>
        <label className="block text-[10px] font-black uppercase text-on-surface-variant opacity-70 mb-2">المبلغ</label>
        <div className="relative">
          <input 
            type="number" 
            required
            min="0"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-on-surface font-bold font-display text-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-right"
            placeholder="0.00"
          />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-black uppercase text-on-surface-variant opacity-70 mb-2">تاريخ الاستحقاق</label>
        <input 
          type="date" 
          required
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-right"
        />
      </div>
      <div>
        <label className="block text-[10px] font-black uppercase text-on-surface-variant opacity-70 mb-2">ملاحظات (اختياري)</label>
        <input 
          type="text" 
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-on-surface font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-right"
          placeholder="تفاصيل إضافية..."
        />
      </div>
      <button 
        type="submit"
        className="w-full py-4 rounded-2xl bg-primary text-on-primary font-black text-sm shadow-xl mt-4 active:scale-95 transition-transform"
      >
        حفظ الدين
      </button>
    </form>
  );
}

function DebtsScreen({
  debts,
  onAddDebt,
  onUpdateDebt,
  currency,
  isPrivacyMode,
  formatMoney
}: {
  debts: any[];
  onAddDebt: (debt: any) => void;
  onUpdateDebt: (id: string, updates: any) => void;
  currency: string;
  isPrivacyMode: boolean;
  formatMoney: (amt: number, priv: boolean) => string;
}
) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [paymentModalData, setPaymentModalData] = useState<{id: string, currentPaid: number, total: number} | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const activeDebts = debts.filter(d => d.status === 'active');
  const paidDebts = debts.filter(d => d.status === 'paid');

  const totalOwed = activeDebts.filter(d => d.type === 'owe').reduce((s,d) => s + (d.amount - (d.paidAmount || 0)), 0);
  const totalOwedToMe = activeDebts.filter(d => d.type === 'owed').reduce((s,d) => s + (d.amount - (d.paidAmount || 0)), 0);

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalData || !paymentAmount) return;
    
    const amountToPay = parseFloat(paymentAmount);
    const newPaidAmount = (paymentModalData.currentPaid || 0) + amountToPay;
    
    if (newPaidAmount >= paymentModalData.total) {
      onUpdateDebt(paymentModalData.id, { status: 'paid', paidAmount: paymentModalData.total });
    } else {
      onUpdateDebt(paymentModalData.id, { paidAmount: newPaidAmount });
    }
    
    setPaymentModalData(null);
    setPaymentAmount('');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-400 pb-24">
      <section className="flex justify-between items-center px-1">
        <div>
        <h1 className="font-display font-black text-3xl text-on-surface flex items-center justify-center md:justify-start gap-2">
          <Scale className="text-primary text-opacity-80" /> الديون والالتزامات
        </h1>
          <p className="text-on-surface-variant font-bold mt-1 text-xs">تتبع الديون التي لك وعليك بسهولة</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-xl active:scale-95 transition-transform"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="glass-card p-5 border-l-4 border-l-red-500/50 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingDown size={40} className="text-red-500" /></div>
           <h3 className="text-[10px] font-black uppercase text-on-surface-variant opacity-70 mb-2 relative z-10">إجمالي الديون (عليك)</h3>
           <p className="text-2xl font-black text-red-400 font-display relative z-10">{formatMoney(totalOwed, isPrivacyMode)}</p>
        </div>
        <div className="glass-card p-5 border-l-4 border-l-green-500/50 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={40} className="text-green-500" /></div>
           <h3 className="text-[10px] font-black uppercase text-on-surface-variant opacity-70 mb-2 relative z-10">إجمالي الديون (لك)</h3>
           <p className="text-2xl font-black text-green-400 font-display relative z-10">{formatMoney(totalOwedToMe, isPrivacyMode)}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display font-bold text-lg px-2">الديون النشطة</h2>
        {activeDebts.length === 0 ? (
          <div className="py-12 text-center opacity-40 glass-card mx-2">
            <p className="text-sm font-bold">لا يوجد ديون نشطة حالياً.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDebts.map(debt => {
              const paidStr = debt.paidAmount || 0;
              const remainingStr = debt.amount - paidStr;
              const progress = Math.min(100, Math.max(0, Math.round((paidStr / Math.max(debt.amount, 1)) * 100))) || 0;
              
              return (
              <div key={debt.id} className={`glass-card p-4 flex flex-col gap-3 border-r-4 ${debt.type === 'owe' ? 'border-r-red-500/40' : 'border-r-green-500/40'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${debt.type === 'owe' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                      {debt.type === 'owe' ? <TrendingDown size={20} strokeWidth={2.5} /> : <TrendingUp size={20} strokeWidth={2.5} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-on-surface">{debt.personName}</h4>
                      <p className="text-[10px] text-on-surface-variant font-medium opacity-80">
                        استحقاق: {new Date(debt.dueDate).toLocaleDateString('ar-IQ')}
                      </p>
                      {debt.description && (
                        <p className="text-[9px] text-on-surface-variant mt-1 opacity-60 leading-tight block truncate max-w-[150px]">{debt.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-left">
                    <p className={`font-display font-bold text-lg ${debt.type === 'owe' ? 'text-red-400' : 'text-green-400'}`}>
                      {formatMoney(remainingStr, isPrivacyMode)}
                    </p>
                    <p className="text-[9px] text-on-surface-variant opacity-70">المتبقي</p>
                  </div>
                </div>

                {/* Progress & Actions */}
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-[8px] font-black text-on-surface-variant">
                      <span>سُدد: {formatMoney(paidStr, isPrivacyMode)}</span>
                      <span>الإجمالي: {formatMoney(debt.amount, isPrivacyMode)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${debt.type === 'owe' ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setPaymentModalData({id: debt.id, currentPaid: paidStr, total: debt.amount})}
                    className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-black text-on-surface transition-colors"
                  >
                    تسديد
                  </button>
                  <button 
                    onClick={() => onUpdateDebt(debt.id, { status: 'paid', paidAmount: debt.amount })}
                    className="bg-white/10 hover:bg-white/20 p-1.5 rounded-lg text-green-400 transition-colors"
                    title="تسديد بالكامل"
                  >
                    <CheckCircle size={16} />
                  </button>
                </div>
              </div>
            )})}
          </div>
        )}
      </section>

      {paidDebts.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-white/5 mx-2">
          <h2 className="font-display font-bold text-lg px-2 opacity-60">تاريخ السداد</h2>
          <div className="space-y-3 opacity-60 grayscale">
            {paidDebts.map(debt => (
              <div key={debt.id} className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-on-surface-variant">
                     <CheckCircle size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-on-surface line-through">{debt.personName}</h4>
                    <p className="text-[10px] text-on-surface-variant font-medium">سُددت</p>
                  </div>
                </div>
                <div className="text-left line-through">
                   <p className={`font-display font-bold text-sm text-on-surface-variant`}>
                     {formatMoney(debt.amount, isPrivacyMode)}
                   </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pb-0 sm:pb-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm nav-glass shadow-2xl rounded-t-[32px] sm:rounded-3xl relative z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 pb-12 sm:pb-6">
                <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6 sm:hidden"></div>
                
                <h3 className="font-display font-black text-2xl mb-1 text-on-surface">إضافة دين جديد</h3>
                <p className="text-xs text-on-surface-variant font-bold mb-6">سجل تفاصيل الدين وتاريخ الاستحقاق</p>
                
                <AddDebtForm 
                  onAdd={(d) => {
                    onAddDebt(d);
                    setShowAddModal(false);
                  }} 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Partial Payment Modal */}
      <AnimatePresence>
        {paymentModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPaymentModalData(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm glass-card p-6 relative z-10 mx-auto"
            >
              <h3 className="font-display font-black text-xl mb-4 text-on-surface">تسديد جزء من الدين</h3>
              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-on-surface-variant opacity-70 mb-2">المبلغ المراد تسديده</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="0.01"
                    max={paymentModalData.total - paymentModalData.currentPaid}
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-on-surface font-bold font-display text-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-right"
                    placeholder="0.00"
                  />
                  <p className="text-[10px] text-on-surface-variant opacity-70 mt-2">المبلغ المتبقي: {formatMoney(paymentModalData.total - paymentModalData.currentPaid, isPrivacyMode)}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => setPaymentModalData(null)}
                    className="flex-1 py-3 rounded-xl bg-white/5 text-on-surface font-bold text-sm hover:bg-white/10 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-black text-sm shadow-xl active:scale-95 transition-transform"
                  >
                    تأكيد السداد
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BudgetsScreen({
  budgets,
  transactions,
  categories,
  currency,
  isPrivacyMode,
  isPremium,
  onAddBudget,
  onDeleteBudget,
  formatMoney
}: {
  budgets: Budget[];
  transactions: Transaction[];
  categories: Category[];
  currency: string;
  isPrivacyMode: boolean;
  isPremium?: boolean;
  onAddBudget: (b: Omit<Budget, 'id'>) => void;
  onDeleteBudget: (id: string) => void;
  formatMoney: (amt: number, priv?: boolean) => string;
}
) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || '');
  const [limitInput, setLimitInput] = useState('');
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate() || 1;

  const currentMonthExpenses = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= currentMonthStart)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, currentMonthStart]);

  const projectedExpenses = Math.round((currentMonthExpenses / dayOfMonth) * daysInMonth);
  // Calculate if they will break budget
  const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
  const projectedToBreak = totalBudgetLimit > 0 && projectedExpenses > totalBudgetLimit;
  const breakDate = projectedToBreak && currentMonthExpenses > 0 
    ? Math.min(daysInMonth, Math.round((totalBudgetLimit / currentMonthExpenses) * dayOfMonth))
    : null;
  
  const budgetsWithProgress = useMemo(() => {
    return budgets.map(budget => {
      const category = categories.find(c => c.id === budget.categoryId) || categories[0];
      const spent = transactions
        .filter(t => t.type === 'expense' && t.category === category.label && new Date(t.date) >= currentMonthStart)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const percentage = (spent / budget.limit) * 100;
      const cappedPercentage = Math.min(percentage, 100);
      
      let statusColor = 'bg-emerald-500 text-emerald-500';
      if (percentage >= 100) statusColor = 'bg-red-500 text-red-500';
      else if (percentage >= 80) statusColor = 'bg-amber-500 text-amber-500';

      return {
        ...budget,
        category,
        spent,
        percentage,
        cappedPercentage,
        statusColor
      };
    });
  }, [budgets, transactions, categories]);

  const handleAddBudget = () => {
    if (!selectedCategory || !limitInput) return;
    onAddBudget({
      categoryId: selectedCategory,
      limit: parseFloat(limitInput),
      period: 'monthly'
    });
    setShowAddModal(false);
    setLimitInput('');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-400 pb-24">
      <section className="text-center md:text-right">
        <h1 className="font-display font-black text-3xl text-on-surface flex items-center justify-center md:justify-start gap-2">
          <Tags className="text-primary text-opacity-80" /> ميزانيات الفئات
        </h1>
        <p className="text-on-surface-variant font-bold mt-1">حدد حداً أعلى للمصروفات الشهرية لكل فئة وراقب إنفاقك</p>
      </section>

      {/* Add Budget Action */}
      {!showAddModal && (
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full p-4 glass-card border border-primary/20 hover:border-primary/40 text-primary font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
        >
          <Plus size={20} /> إضافة ميزانية جديدة لفئة
        </button>
      )}

      {/* Pro Dynamic Forecast (Premium Only) */}
      <section className={`glass-card p-6 overflow-hidden relative group transition-all duration-700 ${!isPremium ? 'opacity-80 grayscale-[0.5]' : 'bg-primary/5 border-primary/20 shadow-2xl ring-1 ring-primary/20'}`}>
         {!isPremium && (
           <div className="absolute inset-0 bg-background/30 backdrop-blur-[4px] z-20 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mb-4 shadow-xl">
                 <Calendar size={28} />
              </div>
              <h3 className="text-sm font-black mb-1">التقويم المالي المستقبلي مغلق</h3>
              <p className="text-[10px] text-on-surface-variant font-bold max-w-[200px] leading-relaxed opacity-80">
                اشترك في بريميوم لرؤية توقعات المصروفات للفترة المتبقية من الشهر وتنبؤات كسر الميزانية.
              </p>
           </div>
         )}
         
         <div className="relative z-10 space-y-5">
           <div className="flex justify-between items-center px-1">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/15 rounded-xl text-primary"><Calendar size={20} /></div>
                <div>
                   <h3 className="text-base font-black">التوقعات المالية (Pro)</h3>
                   <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-tighter opacity-70 italic">Future Prediction Engine</p>
                </div>
             </div>
             {isPremium && (
               <span className="text-[9px] bg-primary text-on-primary px-3 py-1 rounded-full font-black uppercase animate-pulse shadow-lg shadow-primary/20">AI Active</span>
             )}
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/2 rounded-2xl border border-white/5 space-y-1">
                 <p className="text-[10px] font-bold text-on-surface-variant opacity-60">التوقع الشهري النهائي</p>
                 <p className="text-lg font-black text-on-surface">
                    {formatMoney(projectedExpenses, isPrivacyMode)}
                 </p>
                 <div className="flex items-center gap-1 text-[9px] font-black mt-2">
                    <TrendingUp size={10} className={projectedToBreak ? "text-red-400" : "text-emerald-400"} /> 
                    <span className={projectedToBreak ? "text-red-400" : "text-emerald-400"}>
                      {projectedToBreak ? 'زيادة متوقعة عن الميزانية' : 'ضمن حدود الميزانية'}
                    </span>
                 </div>
              </div>
              <div className="p-4 bg-white/2 rounded-2xl border border-white/5 space-y-1">
                 <p className="text-[10px] font-bold text-on-surface-variant opacity-60">تاريخ كسر الميزانية</p>
                 <p className={`text-lg font-black ${projectedToBreak ? 'text-red-400' : 'text-emerald-400'}`}>
                   {projectedToBreak && breakDate ? `${breakDate} ${format(new Date(), 'MMMM', { locale: ar })}` : 'لن يتم كسرها'}
                 </p>
                 <p className="text-[9px] mt-2 font-bold text-on-surface-variant opacity-60 italic">بناءً على وتيرة الصرف الحالية</p>
              </div>
           </div>
           
           <div className="p-4 bg-primary/10 rounded-2xl border border-primary/10">
              <p className="text-[10px] leading-relaxed font-bold text-on-surface opacity-90">
                 <Sparkles size={12} className="inline mr-1 text-primary" />
                 {projectedToBreak 
                   ? `نصيحة Pro: لتجنب كسر الميزانية، قم بتقليل المصاريف اليومية من ${formatMoney(Math.round(currentMonthExpenses / dayOfMonth), isPrivacyMode)} إلى ${formatMoney(Math.round((totalBudgetLimit - currentMonthExpenses) / (daysInMonth - dayOfMonth)), isPrivacyMode)}`
                   : `نصيحة Pro: استمر على نفس الوتيرة! من المتوقع أن توفر ${formatMoney(Math.max(0, totalBudgetLimit - projectedExpenses), isPrivacyMode)} هذا الشهر.`}
              </p>
           </div>
         </div>
         <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap size={100} />
         </div>
      </section>

      {/* Add Budget Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-background/30 rounded-2xl border border-primary/20 p-5 space-y-4 shadow-2xl relative"
          >
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-primary to-transparent"></div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-display font-black text-sm text-primary flex items-center gap-2"><Target size={18} /> ميزانية شهرية جديدة</h4>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-on-surface-variant hover:text-red-400"><X size={18} /></button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface-variant uppercase pr-1 tracking-widest opacity-70">اختر الفئة</label>
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-background/50 border border-white/10 rounded-xl p-3 text-sm text-on-surface focus:ring-2 focus:ring-primary/40 focus:outline-none appearance-none"
                >
                  <option value="" disabled className="bg-background text-on-surface">-- اختر --</option>
                  {categories.map(c => (
                    // Avoid showing categories that already have a budget
                    !budgets.some(b => b.categoryId === c.id) && (
                      <option key={c.id} value={c.id} className="bg-background text-on-surface">{c.label}</option>
                    )
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface-variant uppercase pr-1 tracking-widest opacity-70">الحد الأقصى الشهري</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={limitInput}
                    onChange={(e) => setLimitInput(e.target.value)}
                    placeholder="مثال: 150000"
                    className="w-full bg-background/50 border border-white/10 rounded-xl p-3 pl-12 text-sm text-on-surface focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
                    dir="ltr"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-on-surface-variant opacity-50 uppercase">{currency}</span>
                </div>
              </div>
              
              <button 
                onClick={handleAddBudget}
                disabled={!selectedCategory || !limitInput}
                className="w-full py-3 bg-primary text-on-primary rounded-xl text-xs font-black shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:bg-primary/90 transition-all disabled:opacity-50 disabled:shadow-none mt-2"
              >
                تخصيص وحفظ الميزانية
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budgets List */}
      <div className="space-y-4">
        {budgetsWithProgress.length === 0 ? (
          <div className="py-12 glass-card rounded-3xl text-center opacity-60 border-dashed border-white/10">
            <Target size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-sm font-bold">لم تقم بإعداد ميزانية لأي فئة بعد.</p>
            <p className="text-xs mt-2 opacity-80 max-w-xs mx-auto">ابدأ بتحديد مبلغ لكل فئة لتراقب صرفك خلال الشهر.</p>
          </div>
        ) : (
          budgetsWithProgress.map(b => {
             const dangerMode = b.percentage >= 100;
             const isWarning = b.percentage >= 80 && b.percentage < 100;
             return (
              <div key={b.id} className={`glass-card p-5 space-y-4 shadow-xl border-l-[6px] ${dangerMode ? 'border-l-red-500' : isWarning ? 'border-l-amber-500' : 'border-l-emerald-500'} transition-all`} >
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-3">
                     <div className={`w-12 h-12 flex items-center justify-center rounded-xl bg-background/50 ${b.category.color}`}>
                       <IconRenderer icon={b.category.icon} size={24} strokeWidth={1.5} fallback={Target} />
                     </div>
                     <div>
                       <h3 className="font-black text-base text-on-surface">{b.category.label}</h3>
                       <p className="text-xs text-on-surface-variant font-bold opacity-80">
                         المبلغ المتبقي: 
                         <span className="font-mono ml-1 mr-1" dir="ltr">
                           {formatMoney(Math.max(b.limit - b.spent, 0), isPrivacyMode)}
                         </span>
                         {currency}
                       </p>
                     </div>
                   </div>
                   <button 
                     onClick={() => setBudgetToDelete(b.id)}
                     className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-80">
                    <span>تم صرف {formatMoney(b.spent, isPrivacyMode)}</span>
                    <span>الحد {formatMoney(b.limit, isPrivacyMode)}</span>
                  </div>
                  <div className="h-3 w-full bg-background/50 rounded-full overflow-hidden shadow-inner border border-white/5 relative">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${b.cappedPercentage}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full ${b.statusColor.split(' ')[0]} shadow-[0_0_10px_currentColor]`}
                    ></motion.div>
                  </div>
                  {dangerMode && <p className="text-xs text-red-400 font-bold mt-2 animate-pulse flex items-center gap-1"><AlertTriangle size={14}/> لقد تجاوزت الميزانية المحددة لهذه الفئة!</p>}
                </div>
              </div>
             )
          })
        )}
      </div>

       {/* Delete Confirmation Modal */}
       <AnimatePresence>
        {budgetToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setBudgetToDelete(null)}
            ></motion.div>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-card w-full max-w-sm p-6 relative z-10 border border-red-500/20 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <Trash2 size={32} />
              </div>
              <h3 className="font-display font-black text-xl text-on-surface mb-2">حذف الميزانية؟</h3>
              <p className="text-sm font-bold text-on-surface-variant mb-6">هل أنت متأكد أنك تريد حذف هذه الميزانية؟ لن تتأثر معاملاتك السابقة.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    onDeleteBudget(budgetToDelete);
                    setBudgetToDelete(null);
                  }}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl text-xs font-black shadow-[0_4px_15px_rgba(239,68,68,0.3)] hover:bg-red-600 transition-all"
                >
                  نعم، احذف
                </button>
                <button 
                  onClick={() => setBudgetToDelete(null)}
                  className="flex-1 py-3 bg-white/5 text-on-surface rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
                >
                  إلغاء التراجع
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}



function AccountsScreen({ 
  accounts,
  accountBalances,
  onAddAccount,
  onDeleteAccount,
  onUpdateAccount,
  onViewHistory,
  currency,
  isPrivacyMode,
  isPremium,
  formatMoney
}: {
  accounts: Account[],
  accountBalances: Record<string, number>,
  onAddAccount: (a: Omit<Account, 'id'>) => void,
  onDeleteAccount: (id: string) => void,
  onUpdateAccount: (id: string, updates: Partial<Account>) => void,
  onViewHistory: (id: string) => void,
  currency: string,
  isPrivacyMode: boolean,
  isPremium?: boolean,
  formatMoney: (amt: number, priv?: boolean) => string
}
) {
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<'cash' | 'bank' | 'wallet' | 'card'>('card');
  const [newAccountNetwork, setNewAccountNetwork] = useState<'visa' | 'mastercard' | 'zaincash' | 'qicard' | 'other'>('visa');
  const [newAccountLast4, setNewAccountLast4] = useState('');
  const [newAccountInitialBalance, setNewAccountInitialBalance] = useState('');
  const [newAccountCurrency, setNewAccountCurrency] = useState(currency);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  
  const [accountToEditBalance, setAccountToEditBalance] = useState<Account | null>(null);
  const [editBalanceValue, setEditBalanceValue] = useState('');
  const [editAccountColor, setEditAccountColor] = useState('');
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountNetwork, setEditAccountNetwork] = useState<'visa' | 'mastercard' | 'zaincash' | 'qicard' | 'other'>('visa');
  const [editAccountLast4, setEditAccountLast4] = useState('');
  const [editAccountCurrency, setEditAccountCurrency] = useState('');
  const [showConfirmBalance, setShowConfirmBalance] = useState(false);

  const totalAssets = useMemo(() => {
    return Object.values(accountBalances).reduce((sum, bal) => sum + bal, 0);
  }, [accountBalances]);

  const handleUpdateAccount = () => {
    if (!accountToEditBalance) return;
    
    let updates: Partial<Account> = { 
      color: editAccountColor,
      name: editAccountName,
      cardNetwork: accountToEditBalance.type === 'card' ? editAccountNetwork : undefined,
      last4: accountToEditBalance.type === 'card' ? editAccountLast4 : undefined
    };

    if (editBalanceValue !== '') {
      const newBalance = parseFloat(editBalanceValue);
      const currentBalance = accountBalances[accountToEditBalance.id] || 0;
      const currentInitial = accountToEditBalance.initialBalance || 0;
      const transactionsSum = currentBalance - currentInitial;
      const newInitialBalance = newBalance - transactionsSum;
      updates.initialBalance = newInitialBalance;
    }
    
    onUpdateAccount(accountToEditBalance.id, updates);
    setAccountToEditBalance(null);
    setEditBalanceValue('');
  };

  const accountColors = [
    { id: 'text-indigo-400', label: 'إنديغو', dot: 'bg-indigo-400' },
    { id: 'text-blue-400', label: 'أزرق', dot: 'bg-blue-400' },
    { id: 'text-emerald-400', label: 'زمردي', dot: 'bg-emerald-400' },
    { id: 'text-amber-400', label: 'كهرماني', dot: 'bg-amber-400' },
    { id: 'text-rose-400', label: 'وردي', dot: 'bg-rose-400' },
    { id: 'text-violet-400', label: 'بنفسجي', dot: 'bg-violet-400' },
    { id: 'text-cyan-400', label: 'سماوي', dot: 'bg-cyan-400' },
    { id: 'text-orange-400', label: 'برتقالي', dot: 'bg-orange-400' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-400 pb-24">
      <section className="text-center md:text-right">
        <h1 className="font-display font-black text-3xl text-on-surface flex items-center justify-center md:justify-start gap-2">
          <Landmark className="text-primary text-opacity-80" /> إدارة حساباتي
        </h1>
        <p className="text-on-surface-variant font-bold mt-1">تتبع أرصدتك، بطاقاتك والمحافظ الرقمية بسهولة</p>
      </section>

      {/* Pro Net Worth Analyzer (Premium Only) */}
      <section className={`glass-card p-6 overflow-hidden relative transition-all duration-700 ${!isPremium ? 'opacity-80' : 'bg-primary/5 border-primary/20 shadow-2xl ring-1 ring-primary/20'}`}>
         {!isPremium && (
           <div className="absolute inset-0 bg-background/30 backdrop-blur-[6px] z-20 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mb-4">
                 <Landmark size={28} />
              </div>
              <h3 className="text-sm font-black mb-1">محلل صافي الثروة مغلق</h3>
              <p className="text-[10px] text-on-surface-variant font-bold max-w-[200px] leading-relaxed opacity-80">
                اشترك في بريميوم لرؤية تحليل شامل لصافي ثروتك (Net Worth) وتقارير توزيع الأصول الاحترافية.
              </p>
           </div>
         )}
         
         <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
           <div className="flex-1 text-center md:text-right space-y-2">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                 <div className="p-1.5 bg-primary/15 rounded-lg text-primary"><Landmark size={16} /></div>
                 <h3 className="text-sm font-black uppercase tracking-widest text-on-surface-variant opacity-60">صافي الثروة التقديري</h3>
              </div>
              <p className="text-4xl font-black font-display text-primary tracking-tighter">
                 {formatMoney(totalAssets, isPrivacyMode)}
              </p>
              <div className="flex items-center justify-center md:justify-start gap-2 text-primary/80 text-[10px] font-black mt-2">
                 <Landmark size={12} />
                 <span>إجمالي الأرصدة المتاحة في حساباتك</span>
              </div>
           </div>
           
           <div className="w-24 h-24 relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent border-l-transparent -rotate-45"></div>
              <div className="flex flex-col items-center">
                 <span className="text-xs font-black text-on-surface">{Math.min(100, Math.round((totalAssets/1000000) * 100))}%</span>
                 <span className="text-[8px] font-bold text-on-surface-variant uppercase">للـ مليون</span>
              </div>
           </div>
         </div>
      </section>

      {/* Accounts List Section */}
      <div className="glass-card p-5 space-y-4 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-xs font-black text-on-surface-variant uppercase tracking-widest">حساباتك وبطاقاتك النشطة</h4>
          <button 
            onClick={() => setShowAddAccount(!showAddAccount)}
            className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-black hover:bg-primary/20 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> إضافة حساب 
          </button>
        </div>

        <div className="space-y-3">
          {accounts.length === 0 ? (
            <div className="py-12 text-center opacity-40">
              <CreditCard size={48} className="mx-auto mb-4" />
              <p className="text-sm font-bold">لم تقم بإضافة أي حسابات أو بطاقات</p>
            </div>
          ) : (
            accounts.map(acc => {
              const currentBalance = accountBalances[acc.id] || 0;
              return (
                <div 
                  key={acc.id} 
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group relative overflow-hidden cursor-pointer hover:bg-white/10 active:scale-[0.99] transition-all"
                  onClick={() => onViewHistory(acc.id)}
                >
                  <div className={`absolute top-0 right-0 w-24 h-24 ${acc.color.replace('text-', 'bg-')}/5 rounded-full blur-2xl -z-10`}></div>
                   <div className="flex items-center gap-4 z-10 w-full pr-1">
                    <div className={`w-14 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 ${acc.color} shadow-lg`}>
                      <IconRenderer icon={acc.icon} size={24} strokeWidth={1.5} fallback={CreditCard} />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                           <span 
                             className={`w-2 h-2 rounded-full ${
                               acc.type === 'card' ? 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 
                               acc.type === 'bank' ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 
                               acc.type === 'wallet' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 
                               'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                             }`} 
                             title={acc.type === 'card' ? 'بطاقة إلكترونية' : acc.type === 'bank' ? 'حساب بنكي' : acc.type === 'wallet' ? 'محفظة رقمية' : 'نقدي كاش'}
                           />
                           <p className="text-base font-black text-on-surface">{acc.name}</p>
                           {acc.type === 'card' && (
                             <div className="flex items-center gap-1.5">
                               {acc.cardNetwork && acc.cardNetwork !== 'other' && (
                                 <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider text-on-surface-variant">
                                   {acc.cardNetwork === 'qicard' ? 'Qi Card' : acc.cardNetwork}
                                 </span>
                               )}
                               {acc.last4 && <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono">**** {acc.last4}</span>}
                             </div>
                           )}
                        </div>
                        <p className={`font-display font-black text-lg tracking-wider bg-background/30 px-3 py-1 rounded-lg border border-white/5 shadow-inner flex items-center gap-1 ${currentBalance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                           {formatMoney(currentBalance, isPrivacyMode)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-on-surface-variant font-bold opacity-80 uppercase tracking-widest">
                          {acc.type === 'card' ? 'بطاقة إلكترونية' : acc.type === 'bank' ? 'حساب بنكي' : acc.type === 'wallet' ? 'محفظة رقمية' : 'نقدي / كاش'}
                        </p>
                        <div className="flex items-center gap-1">
                          <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               setAccountToEditBalance(acc);
                               setEditBalanceValue(currentBalance.toString());
                               setEditAccountColor(acc.color);
                               setEditAccountName(acc.name);
                               setEditAccountNetwork(acc.cardNetwork || 'visa');
                               setEditAccountLast4(acc.last4 || '');
                             }}
                             className="p-1.5 text-primary opacity-60 hover:opacity-100 hover:bg-primary/10 rounded-lg transition-all"
                             title="تعديل الحساب"
                           >
                             <Pencil size={16} />
                           </button>
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               setAccountToDelete(acc.id);
                             }}
                             className="p-1.5 text-red-400 opacity-60 hover:opacity-100 hover:bg-red-500/10 rounded-lg transition-all"
                             title="حذف الحساب"
                           >
                             <Trash2 size={16} />
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Account Modal/Accordion */}
        <AnimatePresence>
          {showAddAccount && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden bg-background/30 rounded-2xl border border-primary/20 p-5 mt-6 space-y-5 shadow-2xl relative"
            >
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-primary to-transparent"></div>
              <h4 className="font-display font-black text-sm text-primary">تفاصيل الحساب الجديد</h4>
              <div className="flex gap-2 p-1.5 bg-background/50 rounded-xl overflow-x-auto no-scrollbar">
                {[
                  { id: 'card', label: 'بطاقة' },
                  { id: 'wallet', label: 'محفظة' },
                  { id: 'bank', label: 'بنكي' },
                  { id: 'cash', label: 'نقدي' },
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setNewAccountType(type.id as any)}
                    className={`flex-1 min-w-[70px] py-2.5 px-2 text-xs font-black rounded-lg transition-all ${newAccountType === type.id ? 'bg-primary text-on-primary shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-100' : 'text-on-surface-variant hover:bg-white/5 opacity-70'}`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase pr-1 tracking-widest opacity-70">اسم الحساب (مطلوب)</label>
                  <input 
                    type="text"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    placeholder={newAccountType === 'card' ? 'مثال: فيزا الإسكان' : 'مثال: محفظة زين أو كاشي'}
                    className="w-full bg-background/50 border border-white/10 rounded-xl p-3.5 text-sm text-on-surface focus:ring-2 focus:ring-primary/40 focus:border-primary/50 focus:outline-none transition-all"
                  />
                </div>

                {newAccountType === 'card' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase pr-1 tracking-widest opacity-70">نوع الشبكة</label>
                      <select 
                        value={newAccountNetwork}
                        onChange={(e) => setNewAccountNetwork(e.target.value as any)}
                        className="w-full bg-background/50 border border-white/10 rounded-xl p-3.5 text-sm text-on-surface focus:ring-2 focus:ring-primary/40 focus:outline-none appearance-none"
                      >
                        <option value="mastercard">Mastercard</option>
                        <option value="visa">Visa</option>
                        <option value="qicard">Qi Card</option>
                        <option value="neo">Neo</option>
                        <option value="other">أخرى</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase pr-1 tracking-widest opacity-70">آخر 4 أرقام</label>
                      <input 
                        type="text"
                        maxLength={4}
                        value={newAccountLast4}
                        onChange={(e) => setNewAccountLast4(e.target.value.replace(/\D/g, ''))}
                        placeholder="1234"
                        className="w-full bg-background/50 border border-white/10 rounded-xl p-3.5 text-sm font-mono text-center tracking-widest text-on-surface focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
                        dir="ltr"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase pr-1 tracking-widest opacity-70">الرصيد الافتتاحي / الحالي الدقيق</label>
                  <div className="flex gap-2 relative">
                    <div className="relative flex-1">
                      <input 
                        type="number"
                        value={newAccountInitialBalance}
                        onChange={(e) => setNewAccountInitialBalance(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-background/50 border border-white/10 rounded-xl p-3.5 pl-4 text-sm text-on-surface focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
                        dir="ltr"
                      />
                    </div>
                    <select 
                      value={newAccountCurrency}
                      onChange={(e) => setNewAccountCurrency(e.target.value)}
                      className="w-24 bg-background/50 border border-white/10 rounded-xl p-3.5 text-xs font-bold text-center appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40 text-on-surface"
                    >
                      <option value="IQD">IQD</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button 
                  onClick={() => {
                    if (newAccountName.trim() && newAccountInitialBalance) {
                      onAddAccount({
                        name: newAccountName,
                        type: newAccountType,
                        balance: 0,
                        initialBalance: Number(newAccountInitialBalance) || 0,
                        cardNetwork: newAccountType === 'card' ? newAccountNetwork : undefined,
                        last4: newAccountType === 'card' ? newAccountLast4 : undefined,
                        icon: newAccountType === 'card' ? 'CreditCard' : newAccountType === 'bank' ? 'Landmark' : newAccountType === 'wallet' ? 'Smartphone' : 'DollarSign',
                        color: newAccountType === 'card' ? 'text-indigo-400' : newAccountType === 'bank' ? 'text-blue-400' : 'text-emerald-400',
                        currency: newAccountCurrency
                      });
                      setNewAccountName('');
                      setNewAccountLast4('');
                      setNewAccountInitialBalance('');
                      setShowAddAccount(false);
                    }
                  }}
                  disabled={!newAccountName.trim() || !newAccountInitialBalance}
                  className="flex-1 py-3.5 bg-primary text-on-primary rounded-xl text-xs font-black shadow-[0_4px_15px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:grayscale disabled:shadow-none hover:bg-primary/90 transition-all"
                >
                  حفظ والإضافة للقائمة
                </button>
                <button 
                  onClick={() => setShowAddAccount(false)}
                  className="px-6 py-3.5 bg-white/5 text-on-surface rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {accountToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setAccountToDelete(null)}
            ></motion.div>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-card w-full max-w-sm p-6 relative z-10 border border-red-500/20 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 mb-4 shadow-[0_0_20_rgba(239,68,68,0.2)]">
                <Trash2 size={32} />
              </div>
              <h3 className="font-display font-black text-xl text-on-surface mb-2">حذف الحساب؟</h3>
              <p className="text-sm font-bold text-on-surface-variant mb-6">هل أنت متأكد أنك تريد حذف هذا الحساب؟ هذا الإجراء لا يمكن التراجع عنه.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    onDeleteAccount(accountToDelete);
                    setAccountToDelete(null);
                  }}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl text-xs font-black shadow-[0_4px_15px_rgba(239,68,68,0.3)] hover:bg-red-600 transition-all"
                >
                  نعم، احذف الحساب
                </button>
                <button 
                  onClick={() => setAccountToDelete(null)}
                  className="flex-1 py-3 bg-white/5 text-on-surface rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
                >
                  إلغاء التراجع
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Balance Modal */}
      <AnimatePresence>
        {accountToEditBalance && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setAccountToEditBalance(null)}
            ></motion.div>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-card w-full max-w-sm p-6 relative z-10 border border-primary/20 shadow-2xl transition-all"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-display font-black text-xl text-on-surface">تعديل الحساب</h3>
                <button onClick={() => setAccountToEditBalance(null)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Details */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase pr-1 tracking-widest opacity-70">اسم الحساب</label>
                    <input 
                      type="text"
                      value={editAccountName}
                      onChange={(e) => setEditAccountName(e.target.value)}
                      className="w-full bg-background/50 border border-white/10 rounded-xl p-3.5 text-sm text-on-surface focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
                    />
                  </div>

                  {accountToEditBalance.type === 'card' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-on-surface-variant uppercase pr-1 tracking-widest opacity-70">نوع الشبكة</label>
                        <select 
                          value={editAccountNetwork}
                          onChange={(e) => setEditAccountNetwork(e.target.value as any)}
                          className="w-full bg-background/50 border border-white/10 rounded-xl p-3.5 text-xs text-on-surface focus:ring-2 focus:ring-primary/40 focus:outline-none appearance-none"
                        >
                          <option value="mastercard">Mastercard</option>
                          <option value="visa">Visa</option>
                          <option value="qicard">Qi Card</option>
                          <option value="neo">Neo</option>
                          <option value="other">أخرى</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-on-surface-variant uppercase pr-1 tracking-widest opacity-70">آخر 4 أرقام</label>
                        <input 
                          type="text"
                          maxLength={4}
                          value={editAccountLast4}
                          onChange={(e) => setEditAccountLast4(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-background/50 border border-white/10 rounded-xl p-3.5 text-sm font-mono text-center tracking-widest text-on-surface focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className={`w-14 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 ${editAccountColor} shadow-lg transition-colors`}>
                    <IconRenderer icon={accountToEditBalance.icon} size={24} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-on-surface leading-tight">تعديل المظهر والرصيد</p>
                    <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-widest opacity-60 mt-0.5">اختر لوناً وحدث الرصيد الحالي</p>
                  </div>
                </div>

                {/* Color Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase pr-1 tracking-widest opacity-70">لون تمييز الحساب</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {accountColors.map(color => (
                      <button
                        key={color.id}
                        onClick={() => setEditAccountColor(color.id)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${editAccountColor === color.id ? 'ring-2 ring-white ring-offset-2 ring-offset-background' : 'opacity-60 scale-90 hover:scale-100 hover:opacity-100'}`}
                      >
                        <div className={`w-full h-full rounded-full ${color.dot} shadow-lg`}></div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase pr-1 tracking-widest opacity-70">الرصيد الجديد (دقيق)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      autoFocus
                      value={editBalanceValue}
                      onChange={(e) => setEditBalanceValue(e.target.value)}
                      className="w-full bg-background/50 border border-white/10 rounded-xl p-4 pl-12 text-lg font-bold text-on-surface focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
                      dir="ltr"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-on-surface-variant opacity-50 uppercase">{currency}</span>
                  </div>
                  <p className="text-[9px] text-on-surface-variant font-bold pr-1 opacity-60 leading-relaxed italic text-right">
                    * سيقوم النظام بتعديل الرصيد الافتتاحي للحساب ليتناسب مع الرصيد المدخل بناءً على سجل معاملاتك.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => {
                      if (!accountToEditBalance) return;
                      const currentBalance = accountBalances[accountToEditBalance.id] || 0;
                      const newBalance = parseFloat(editBalanceValue);
                      if (!isNaN(newBalance) && newBalance !== currentBalance) {
                        setShowConfirmBalance(true);
                      } else {
                        handleUpdateAccount();
                      }
                    }}
                    className="flex-1 py-4 immersive-gradient text-on-primary rounded-xl font-display font-black text-sm shadow-xl active:scale-95 transition-all"
                  >
                    حفظ التغييرات
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        show={showConfirmBalance}
        title="تأكيد تعديل الرصيد"
        message="هل أنت متأكد من تعديل رصيد الحساب يدوياً؟ سيقوم النظام بتعديل الرصيد الافتتاحي ليتوافق مع الرصيد الجديد بناءً على تاريخ معاملاتك."
        confirmText="تعديل الرصيد"
        variant="warning"
        onConfirm={() => {
          handleUpdateAccount();
          setShowConfirmBalance(false);
        }}
        onCancel={() => setShowConfirmBalance(false)}
      />
    </div>
  );
}

function SettingsScreen({ 
  user,
  onLogin,
  onLogout,
  loginError,
  currentPalette,
  onPaletteChange,
  isDarkMode,
  onToggleDarkMode,
  currency,
  onCurrencyChange,
  isSecurityEnabled,
  onToggleSecurity,
  securityEmail,
  onSecurityEmailChange,
  addNotification,
  categories,
  onAddCategory,
  onDeleteCategory,
  isPremium,
  onStartPremiumTrial,
  onRequirePremium,
  onExportData
}: { 
  user: User | null,
  onLogin: () => void,
  onLogout: () => void,
  loginError?: string,
  currentPalette: Palette,
  onPaletteChange: (p: Palette) => void,
  isDarkMode: boolean,
  onToggleDarkMode: () => void,
  currency: string,
  onCurrencyChange: (c: string) => void,
  isSecurityEnabled: boolean,
  onToggleSecurity: () => void,
  securityEmail: string,
  onSecurityEmailChange: (val: string) => void,
  addNotification: (n: any) => void,
  categories: Category[],
  onAddCategory: (cat: any) => void,
  onDeleteCategory: (id: string) => void,
  isPremium: boolean,
  onStartPremiumTrial: () => void,
  onRequirePremium: () => void,
  onExportData: () => void
}
) {
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatColor, setNewCatColor] = useState('text-primary');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [newProfileName, setNewProfileName] = useState(user?.displayName || '');
  const [newProfilePassword, setNewProfilePassword] = useState('');
  const [profileMsg, setProfileMsg] = useState('');

  const handleUpdateProfile = async () => {
    if (!user) return;
    setProfileMsg('');
    try {
      if (newProfileName !== user.displayName) {
        await updateProfile(user, { displayName: newProfileName });
      }
      if (newProfilePassword) {
        await updatePassword(user, newProfilePassword);
      }
      setProfileMsg('تم تحديث البيانات بنجاح!');
      if (newProfilePassword) {
        setNewProfilePassword('');
      }
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'تحديث الحساب',
        message: 'تم تحديث معلومات حسابك بنجاح',
        date: new Date(),
        isRead: false
      });
      setTimeout(() => {
        setShowProfileSettings(false);
        setProfileMsg('');
      }, 2000);
    } catch (e: any) {
      if (e.code === 'auth/requires-recent-login') {
        setProfileMsg('يرجى تسجيل الخروج والدخول مجدداً لتحديث كلمة المرور.');
      } else {
        setProfileMsg(e.message || 'حدث خطأ أثناء التحديث.');
      }
    }
  };
  
  const availableColors = [
    'text-primary', 'text-blue-500', 'text-green-500', 'text-red-500', 
    'text-purple-500', 'text-amber-500', 'text-rose-500', 'text-sky-500',
    'text-emerald-500', 'text-orange-500', 'text-indigo-500'
  ];
  
  const availableIcons = [
    'Tag', 'Coffee', 'Utensils', 'Car', 'ShoppingBag', 'Home', 'Music', 
    'Gamepad', 'Heart', 'Camera', 'Book', 'Plane', 'Smartphone', 'Cpu'
  ];

  const [activeModal, setActiveModal] = useState<'support' | 'terms' | 'privacy' | 'developer' | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-400">
      <section className="text-center md:text-right">
        <h1 className="font-display font-black text-3xl text-on-surface">إعدادات الحساب</h1>
        <p className="text-on-surface-variant font-bold mt-1">تخصيص تجربتك المالية</p>
      </section>

      {/* Immersive User Profile Header */}
      <div className="flex flex-col items-center justify-center space-y-6 pt-2">
        <div className="relative">
          <div 
            className="w-28 h-28 rounded-full border-4 border-primary/30 p-1.5 bg-background shadow-2xl"
            style={{ 
              // @ts-ignore
              boxShadow: `0 0 50px rgba(${currentPalette.primary}, 0.2)` 
            }}
          >
             <img src={user?.photoURL || "https://picsum.photos/seed/user123/200/200"} className="w-full h-full rounded-full object-cover" alt="Profile" />
          </div>
          <div className={`absolute bottom-1 right-1 w-7 h-7 border-4 border-background rounded-full ${user ? 'bg-green-500' : 'bg-gray-400'}`}></div>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-black text-on-surface">{user?.displayName || "مستخدم ضيف"}</h3>
          <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">
            {user ? 'حساب متزامن سحابياً' : 'وضع الأوفلاين'}
          </p>
        </div>
        
        {!user ? (
          <div className="flex flex-col items-center gap-2">
            {loginError && (
              <p className="text-red-400 text-xs font-bold bg-red-400/10 px-3 py-1.5 rounded-lg max-w-xs text-center border border-red-400/20">
                {loginError}
              </p>
            )}
            <button 
              onClick={onLogin}
              className="flex items-center gap-3 px-8 py-3 bg-white text-black rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition-all"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              <span>تسجيل الدخول بالمزامنة</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-2 bg-green-500/10 text-green-500 rounded-xl text-[10px] font-black uppercase">
            <Cloud size={14} />
            <span>بياناتك في أمان</span>
          </div>
        )}
      </div>

      {/* Premium Banner */}
      <section className="immersive-gradient p-7 rounded-[32px] text-on-primary shadow-2xl relative overflow-hidden ring-1 ring-white/20">
        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                 <Diamond size={22} className="text-yellow-300 fill-yellow-300" />
              </div>
              <h2 className="font-display font-black text-lg">توفير بريميوم</h2>
            </div>
            {isPremium ? (
              <span className="text-[10px] bg-green-500 text-white px-3 py-1 rounded-full font-black uppercase tracking-tight shadow-lg shadow-green-500/20 flex items-center gap-1.5 animate-pulse">
                <ShieldCheck size={12} />
                مفعل حالياً
              </span>
            ) : (
              <span className="text-[9px] bg-white text-primary px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">AI Powered</span>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/5 group hover:bg-white/15 transition-all">
              <div className="p-2 bg-red-400/20 rounded-xl text-red-300 group-hover:scale-110 transition-transform">
                <TrendingDown size={18} />
              </div>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-tight">تنبؤ ذكي بالفشل المالي</h4>
                <p className="text-[9px] opacity-80 mt-0.5 leading-relaxed font-medium">توقع نفاد الراتب، تحذير مبكر من العجز ونبضات صرف خطيرة.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/5 group hover:bg-white/15 transition-all">
              <div className="p-2 bg-amber-400/20 rounded-xl text-amber-300 group-hover:scale-110 transition-transform">
                <Sparkles size={18} />
              </div>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-tight">مستشار مالي بالذكاء الاصطناعي</h4>
                <p className="text-[9px] opacity-80 mt-0.5 leading-relaxed font-medium">نظام تفاعلي للاقتراحات، خطط أسبوعية، ومحاكاة لسيناريوهات دخلك.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/5 group hover:bg-white/15 transition-all">
              <div className="p-2 bg-blue-400/20 rounded-xl text-blue-300 group-hover:scale-110 transition-transform">
                <LayoutDashboard size={18} />
              </div>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-tight">لوحة تحكم احترافية</h4>
                <p className="text-[9px] opacity-80 mt-0.5 leading-relaxed font-medium">Cash Flow، Burn Rate، Net Worth Tracker ومخططات تفاعلية.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/5 group hover:bg-white/15 transition-all">
              <div className="p-2 bg-green-400/20 rounded-xl text-green-300 group-hover:scale-110 transition-transform">
                <Target size={18} />
              </div>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-tight">محرك الأهداف الذكي</h4>
                <p className="text-[9px] opacity-80 mt-0.5 leading-relaxed font-medium">يربط أهدافك بسلوكك اليومي ويقترح لك أسرع الطرق للوصول.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/5 group hover:bg-white/15 transition-all">
              <div className="p-2 bg-purple-400/20 rounded-xl text-purple-300 group-hover:scale-110 transition-transform">
                <Brain size={18} />
              </div>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-tight">تحليل نفسي للسلوك المالي</h4>
                <p className="text-[9px] opacity-80 mt-0.5 leading-relaxed font-medium">يكتشف محفزات الصرف النفسية والزمنية ويقدم نصائح سلوكية.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/5 group hover:bg-white/15 transition-all">
              <div className="p-2 bg-rose-400/20 rounded-xl text-rose-300 group-hover:scale-110 transition-transform">
                <Calendar size={18} />
              </div>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-tight">تقويم مالي مستقبلي</h4>
                <p className="text-[9px] opacity-80 mt-0.5 leading-relaxed font-medium">توقع الضغط المالي خلال الشهر وتنبيهات ذكية للفواتير.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/5 group hover:bg-white/15 transition-all">
              <div className="p-2 bg-sky-400/20 rounded-xl text-sky-300 group-hover:scale-110 transition-transform">
                <Globe size={18} />
              </div>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-tight">وضع "الذكاء الاقتصادي"</h4>
                <p className="text-[9px] opacity-80 mt-0.5 leading-relaxed font-medium">مراقبة التضخم واقتراح تحويل العملات لتأمين مدخراتك.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/5 group hover:bg-white/15 transition-all">
              <div className="p-2 bg-indigo-400/20 rounded-xl text-indigo-300 group-hover:scale-110 transition-transform">
                <RefreshCcw size={18} />
              </div>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-tight">تصنيف ذاتي التعلم</h4>
                <p className="text-[9px] opacity-80 mt-0.5 leading-relaxed font-medium">يتعلم منك باستمرار ويكتشف الأنماط الجديدة تلقائياً.</p>
              </div>
            </div>
          </div>

          {isPremium ? (
            <div className="w-full bg-white/10 text-white py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 backdrop-blur-md border border-white/10">
              <Sparkles size={14} className="text-yellow-300" />
              <span>أنت تستمتع بجميع مميزات بريميوم حالياً</span>
            </div>
          ) : (
            <button 
              onClick={onStartPremiumTrial}
              className="w-full bg-white text-primary py-4 rounded-2xl font-black text-xs transition-all active:scale-95 shadow-xl border border-white flex items-center justify-center gap-2 hover:bg-opacity-90"
            >
              <Zap size={14} className="fill-current" />
              <span>ترقية الحساب ($3.99/شهرياً)</span>
            </button>
          )}
        </div>
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary/20 rounded-full blur-[60px]"></div>
      </section>

      <div className="space-y-7">
        {user && (
          <SettingsGroup title="الحساب">
            <SettingsItem 
              icon={<UserIcon size={18} />} 
              label="تغيير الاسم وكلمة المرور" 
              hasArrow 
              onClick={() => setShowProfileSettings(true)}
            />
          </SettingsGroup>
        )}
        <SettingsGroup title="المظهر واللغة">
          <SettingsItem 
            icon={<Moon size={18} />} 
            label="الوضع الليلي" 
            hasToggle 
            activeToggle={isDarkMode} 
            onToggle={onToggleDarkMode} 
          />
          <SettingsItem 
            icon={<DollarSign size={18} />} 
            label="العملة" 
            value={currency} 
            onClick={() => onCurrencyChange(currency === 'IQD' ? 'USD' : 'IQD')} 
          />
        </SettingsGroup>


        <SettingsGroup title="الأمان والمزامنة">
          <SettingsItem 
            icon={<ShieldCheck size={18} />} 
            label="نظام الأمان والتنبيهات" 
            hasToggle 
            activeToggle={isSecurityEnabled} 
            onToggle={onToggleSecurity} 
          />
          {isSecurityEnabled && (
            <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10 mx-5 -mt-2">
               <label className="text-[10px] font-bold text-on-surface-variant flex items-center gap-1.5 mb-1.5"><Mail size={12} /> بريد استلام التنبيهات</label>
               <input 
                 type="email" 
                 value={securityEmail}
                 onChange={(e) => onSecurityEmailChange(e.target.value)}
                 className="w-full bg-background border border-white/5 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors text-left" 
                 dir="ltr"
                 placeholder="your@email.com"
               />
               <p className="text-[9px] text-on-surface-variant/70 mt-1.5">ستصلك تنبيهات فورية عند إضافة حساب جديد، محاولات الدخول، وغيرها.</p>
            </div>
          )}
        </SettingsGroup>

        <SettingsGroup title="عن التطبيق">
          <SettingsItem 
            icon={<HelpCircle size={18} />} 
            label="الدعم والمساعدة" 
            hasArrow 
            onClick={() => setActiveModal('support')}
          />
          <SettingsItem 
            icon={<FileText size={18} />} 
            label="شروط الاستخدام" 
            hasArrow 
            onClick={() => setActiveModal('terms')}
          />
          <SettingsItem 
            icon={<Shield size={18} />} 
            label="سياسة الخصوصية" 
            hasArrow 
            onClick={() => setActiveModal('privacy')}
          />
          <SettingsItem 
            icon={<Cpu size={18} />} 
            label="المطور" 
            hasArrow 
            onClick={() => setActiveModal('developer')}
          />
        </SettingsGroup>
      </div>

      {activeModal === 'support' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <div className="relative w-full max-w-sm glass-card border-white/10 p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-black text-xl">الدعم والمساعدة</h3>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              يسعدنا تلقي استفساراتكم ومساعدتكم في حال واجهتم أي مشكلة في استخدام التطبيق.
            </p>
            <div className="space-y-3 mt-2">
              <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-on-surface py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                <Mail size={16} /> ممثل خدمة العملاء
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'terms' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <div className="relative w-full max-w-sm glass-card border-white/10 p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-black text-xl">شروط الاستخدام</h3>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="text-xs text-on-surface-variant leading-relaxed max-h-[60vh] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              <p className="font-bold text-on-surface">مرحباً بك في تطبيق توفير (Tofeer). يرجى قراءة هذه الشروط بعناية قبل استخدام خدماتنا.</p>
              
              <div className="space-y-2">
                <h4 className="font-bold text-on-surface text-[13px]">1. قبول الشروط</h4>
                <p>باستخدامك أو وصولك إلى التطبيق، فإنك توافق على الالتزام بشروط الخدمة هذه وجميع القوانين واللوائح المعمول بها محلياً ودولياً. إذا لم توافق على أي جزء من هذه الشروط، فلا يحق لك الوصول إلى الخدمة.</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-on-surface text-[13px]">2. الحسابات والمسؤولية</h4>
                <p>أنت مسؤول عن حماية كلمة المرور التي تستخدمها للوصول إلى الخدمة وعن أي أنشطة أو إجراءات تتم بموجب كلمة المرور الخاصة بك. لا يحق لك نقل حسابك أو إعطائه للغير بأي شكل من الأشكال.</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-on-surface text-[13px]">3. استخدام الخدمة وإدارة البيانات</h4>
                <p>الخدمة مقدمة "كما هي" لمساعدتك في إدارة أموالك الشخصية. التطبيق غير مسؤول في أي حال من الأحوال عن أي خسائر مالية، استثمارات خاطئة، أو أي أضرار مباشرة أو غير مباشرة ناتجة عن الاعتماد على البيانات والمعلومات المقدمة ضمن التطبيق.</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-on-surface text-[13px]">4. الملكية الفكرية</h4>
                <p>يحتفظ التطبيق والشركات التابعة له بجميع الحقوق وحقوق الملكية الفكرية لجميع مكونات التطبيق والتصميم والشعارات. يمنع نسخ أو إعادة إنتاج أي جزء من التطبيق دون إذن كتابي مسبق.</p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-bold text-on-surface text-[13px]">5. إنهاء الاستخدام</h4>
                <p>نحتفظ بالحق في تعليق أو إنهاء حسابك على الفور، دون إشعار مسبق أو مسؤولية، لأي سبب من الأسباب، بما في ذلك على سبيل المثال لا الحصر إذا انتهكت الشروط.</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-on-surface text-[13px]">6. التعديلات</h4>
                <p>قد نقوم بتعديل شروط الاستخدام هذه في أي وقت دون إشعار. باستمرار استخدامك للتطبيق بعد إجراء أي تعديلات، فإنك توافق على الالتزام بالشروط المعدلة.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'privacy' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <div className="relative w-full max-w-sm glass-card border-white/10 p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center">
              <h3 className="font-display font-black text-xl">سياسة الخصوصية</h3>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="text-xs text-on-surface-variant leading-relaxed max-h-[60vh] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              <p className="font-bold text-on-surface">إيماننا بخصوصيتك هو محور كل ما نبنيه. تشرح هذه السياسة كيفية جمعنا، استخدامنا، وحمايتنا لمعلوماتك الشخصية.</p>

              <div className="space-y-2">
                <h4 className="font-bold text-on-surface text-[13px]">1. جمع وحفظ البيانات</h4>
                <p>تتم مزامنة بياناتك المالية والمصرفية التي تدخلها (كالمعاملات والتصنيفات) وتخزينها بشكل مشفر وآمن عبر خوادم سحابية ذات معايير عالمية (Google Cloud/Firebase). لا نجمع بيانات غير ضرورية لعمل التطبيق الأساسي.</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-on-surface text-[13px]">2. استخدام البيانات</h4>
                <p>نستخدم بياناتك حصرياً لتزويدك بالخدمة وتمكينك من عرض الإحصائيات والمزامنة التلقائية للأجهزة. لا نبيع بياناتك لأطراف ثالثة لتسويق منتجاتهم، ولا نحلل معاملاتك لغرض بيع الإعلانات.</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-on-surface text-[13px]">3. الأمان والتشفير</h4>
                <p>نعتمد أحدث بروتوكولات التشفير القياسية (TLS/SSL) لنقل البيانات. على الرغم من أننا نسعى لاستخدام وسائل مقبولة تجارياً لحماية بياناتك، فإنه لا توجد طريقة نقل عبر الإنترنت أو تخزين إلكتروني آمنة بنسبة 100%.</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-on-surface text-[13px]">4. معالجة بيانات الطرف الثالث</h4>
                <p>قد يستخدم التطبيق خدمات تابعة لأطراف ثالثة (مثل خدمات المصادقة من جوجل Google Auth) للمساعدة في تقديم الخدمة. تخضع هذه الخدمات لسياسات الخصوصية المستقلة الخاصة بها.</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-on-surface text-[13px]">5. حذف البيانات</h4>
                <p>يحق لك في أي وقت حذف بياناتك بالكامل وحذف حسابك من إعدادات التطبيق. بمجرد الحذف، نزيل جميع معلوماتك الشخصية والمعاملات المرتبطة بك نهائياً من خوادمنا ولن نتمكن من استعادتها.</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-on-surface text-[13px]">6. تغييرات الخصوصية</h4>
                <p>قد نقوم بتحديث سياسة الخصوصية الخاصة بنا من وقت لآخر. سيتم إعتبار استمرار استخدامك للخدمة بعد التحديث بمثابة موافقة منك على السياسة الجديدة.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'developer' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          <div className="relative w-full max-w-sm glass-card border-white/10 p-8 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200 text-center">
             <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
             
             <div className="w-24 h-24 bg-primary/20 rounded-full overflow-hidden flex items-center justify-center mb-2 shadow-lg shadow-primary/20 border-2 border-primary/50 relative">
               <img src="/developer.jpg" alt="المطور حسين عبدالله يعقوب" className="w-full h-full object-cover" onError={(e) => {
                 (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/developer/100/100';
               }} />
             </div>
             <h3 className="font-display font-black text-2xl text-primary">المطور: حسين عبدالله يعقوب</h3>
             
             <p className="text-sm text-on-surface-variant font-bold leading-relaxed w-full border-t border-b border-white/5 py-4 my-2">
               طالب هندسة نفط<br />
               العراق - ذي قار
             </p>
             
             <div className="w-full space-y-2 mt-2">
               <a href="mailto:ah343238@gmail.com" className="w-full flex items-center justify-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                 <FileText size={16} /> <span dir="ltr">ah343238@gmail.com</span>
               </a>
               <a href="https://wa.me/9647813563139" target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-left" dir="ltr">
                 <Smartphone size={16} /> <span>+964 781 356 3139</span>
               </a>
             </div>
          </div>
        </div>
      )}





      {showProfileSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowProfileSettings(false)}
          ></div>
          <div className="relative w-full max-w-sm glass-card border-white/10 p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center bg-white/5 -mt-6 -mx-6 p-6 rounded-t-3xl border-b border-white/5">
              <h3 className="font-display font-black text-xl">إعدادات الحساب</h3>
              <button onClick={() => setShowProfileSettings(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="space-y-4 pt-2">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-on-surface-variant px-1">الاسم</label>
                <input 
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary w-full"
                  placeholder="الاسم كامل"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-on-surface-variant px-1">كلمة المرور الجديدة (اختياري)</label>
                <input 
                  type="password"
                  value={newProfilePassword}
                  onChange={(e) => setNewProfilePassword(e.target.value)}
                  className="bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary w-full text-left"
                  dir="ltr"
                  placeholder="اتركه فارغاً لعدم التغيير"
                />
              </div>

              {profileMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold text-center ${profileMsg.includes('نجاح') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {profileMsg}
                </div>
              )}

              <button 
                onClick={handleUpdateProfile}
                className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold active:scale-95 transition-all outline-none border-none mt-2"
              >
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}

      {user && (
        <button 
          onClick={onLogout}
          className="w-full py-5 bg-red-500/10 text-red-500 rounded-2xl font-display font-black text-sm border border-red-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          <LogOut size={20} />
          <span>تسجيل الخروج الآمن</span>
        </button>
      )}
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string, children: React.ReactNode }
) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-black text-on-surface-variant opacity-40 px-3 uppercase tracking-widest">{title}</h3>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}




