import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameMonth, isSameDay, startOfCurrentMonth, isAfter, subMonths, isSameWeek, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';

export function AddTransactionForm({ categories, accounts, onAdd, currency, exchangeRate, autoCategories }: { categories: Category[], accounts: Account[], onAdd: (t: any) => void, currency: string, exchangeRate: number, autoCategories?: Record<string, string> }
