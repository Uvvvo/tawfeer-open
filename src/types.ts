import { LucideIcon } from 'lucide-react';

export type Tab = 'home' | 'expenses' | 'reports' | 'budgets' | 'accounts' | 'settings' | 'accountHistory';

export interface Transaction {
  id: string;
  amount: number;
  date: string | Date;
  title: string;
  category: string;
  icon?: LucideIcon | any;
  color?: string;
  type?: 'expense' | 'income' | 'transfer';
  accountId?: string;
  receiptUrl?: string; // OCR Extracted image
  merchant?: string; // Parsed from OpenAI/Gemini
  isRecurring?: boolean;
  recurringInterval?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  iconUrl?: string; // For auto-fetched logos
  toAccountId?: string; // For transfers
}

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'card' | 'wallet';
  balance: number;
  currency?: string;
  color?: string;
  cardNumber?: string;
  cardNetwork?: 'visa' | 'mastercard' | 'amex' | 'discover';
  last4?: string; // Last 4 digits of card
}

export interface Debt {
  id: string;
  personName: string;
  amount: number;
  type: 'owe' | 'owed';
  dueDate?: Date;
  paidAmount?: number;
  notes?: string;
  createdAt: Date;
}

export interface SavingChallenge {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  startDate: Date;
  endDate?: Date;
  icon?: any;
  color?: string;
}

export interface Category {
  id: string;
  label: string;
  icon: any;
  color: string;
  iconUrl?: string;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  color?: string;
  icon?: any;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
  period: 'weekly' | 'monthly' | 'yearly';
}

export interface Palette {
  name: string;
  primary: string;
  light: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  date: Date;
  isRead: boolean;
}
