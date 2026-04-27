import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameMonth, isSameDay, startOfCurrentMonth, isAfter, subMonths, isSameWeek, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area, LineChart, Line } from 'recharts';

export function Reports({ 
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
