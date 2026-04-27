import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameMonth, isSameDay, startOfMonth, isAfter, subMonths, isSameWeek, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';

export function CategoryItem({ icon, label, color, bgColor, isSelected, onClick, iconUrl }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-3 group transition-all ${onClick ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all border shadow-sm overflow-hidden ${isSelected ? 'immersive-gradient border-white/20 text-white shadow-lg' : `${bgColor || 'bg-white/5'} ${color} border-white/5 opacity-60 group-hover:opacity-100`}`}>
        {iconUrl ? (
          <img src={iconUrl} alt={label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          icon
        )}
      </div>
      <span className={`text-[10px] font-black uppercase tracking-tighter transition-all ${isSelected ? 'text-primary opacity-100' : 'text-on-surface-variant opacity-60'}`}>{label}</span>
    </button>
  );
}
