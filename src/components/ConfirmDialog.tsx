import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameMonth, isSameDay, startOfCurrentMonth, isAfter, subMonths, isSameWeek, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';

export function ConfirmDialog({ 
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
