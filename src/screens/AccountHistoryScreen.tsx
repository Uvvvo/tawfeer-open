import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameMonth, isSameDay, startOfCurrentMonth, isAfter, subMonths, isSameWeek, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';

export function AccountHistoryScreen({ 
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
