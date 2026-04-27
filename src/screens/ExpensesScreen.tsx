import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameMonth, isSameDay, startOfCurrentMonth, isAfter, subMonths, isSameWeek, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';

export function ExpensesScreen({ 
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
