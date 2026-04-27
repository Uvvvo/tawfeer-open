import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameMonth, isSameDay, startOfMonth, isAfter, subMonths, isSameWeek, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';

import { ChevronLeft } from 'lucide-react';
export function SettingsItem({ icon, label, value, hasArrow, hasToggle, activeToggle, onToggle, onClick, children }: any) {
  return (
    <div 
      onClick={hasToggle ? onToggle : onClick}
      className="glass-card flex items-center justify-between p-4 active:bg-white/10 transition-colors cursor-pointer border-white/5"
    >
      <div className="flex items-center gap-4 text-right">
        <div className="w-10 h-10 bg-white/5 text-primary rounded-xl flex items-center justify-center border border-white/5">
          {icon}
        </div>
        <span className="font-bold text-sm text-on-surface">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-[10px] text-primary font-black px-2 py-1 bg-primary/10 rounded">{value}</span>}
        {hasArrow && <ChevronLeft size={16} className="text-on-surface-variant" />}
        {hasToggle && (
           <div 
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`w-11 h-6 rounded-full relative p-1 cursor-pointer flex transition-all ${activeToggle ? 'bg-primary justify-end' : 'bg-white/10 justify-start'}`}
           >
            <div className="w-4 h-4 bg-white rounded-full shadow-lg"></div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
