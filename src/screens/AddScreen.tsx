import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameMonth, isSameDay, startOfCurrentMonth, isAfter, subMonths, isSameWeek, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';

export function AddScreen({ 
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
