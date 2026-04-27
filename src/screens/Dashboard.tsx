import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameMonth, isSameDay, startOfMonth, isAfter, subMonths, isSameWeek, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area, LineChart, Line } from 'recharts';

import { Eye, EyeOff, TrendingUp, TrendingDown, Target, ChevronLeft, Zap, Trash, Trash2, RefreshCcw } from 'lucide-react';
import { IconRenderer } from '../App';
import { AIInsights } from '../App';
export function Dashboard({ 
  balance, 
  income, 
  expenses, 
  transactions, 
  goals, 
  accounts,
  accountBalances,
  debts,
  challenges,
  onDeleteTransaction, 
  onDeleteGoal,
  isPrivacyMode,
  togglePrivacy,
  currency,
  isPremium,
  onNavigateToTab,
  onViewAccount,
  formatMoney
}: any) {
  const { currentMonthChange, isPositive, currentMonthIncome, currentMonthExpense } = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    
    let currentMonthNet = 0;
    let income = 0;
    let expense = 0;
    
    (transactions || []).forEach((t: any) => {
      const txDate = new Date(t.date);
      if (txDate >= currentMonthStart) {
        if (t.type === 'income') {
          currentMonthNet += t.amount;
          income += t.amount;
        }
        if (t.type === 'expense') {
          currentMonthNet -= t.amount;
          expense += t.amount;
        }
      }
    });

    const previousBalance = balance - currentMonthNet;
    let percentageChange = 0;
    if (previousBalance !== 0) {
      percentageChange = (currentMonthNet / Math.abs(previousBalance)) * 100;
    } else if (currentMonthNet > 0) {
      percentageChange = 100;
    } else if (currentMonthNet < 0) {
      percentageChange = -100;
    }
    
    return {
      currentMonthChange: Math.abs(percentageChange).toFixed(1),
      isPositive: percentageChange >= 0,
      currentMonthIncome: income,
      currentMonthExpense: expense,
    };
  }, [transactions, balance]);

  return (
    <div className="space-y-7">
      {/* Balance Card */}
      <section className="immersive-gradient rounded-[32px] p-7 text-on-primary shadow-2xl relative overflow-hidden ring-1 ring-white/20">
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <p className="font-display text-sm font-medium opacity-80 mb-2">إجمالي الرصيد</p>
            <button 
              onClick={togglePrivacy}
              className="p-2 bg-white/20 rounded-full backdrop-blur-md hover:bg-white/30 transition-all font-display"
            >
              {isPrivacyMode ? <Eye size={16} strokeWidth={1.5} /> : <EyeOff size={16} strokeWidth={1.5} />}
            </button>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold tracking-tight">
              {formatMoney(balance, isPrivacyMode).split(' ')[0]}
            </span>
            <span className="text-lg opacity-70">{currency === 'IQD' ? 'د.ع' : '$'}</span>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2">
              {isPositive ? (
                <TrendingUp size={14} strokeWidth={2.5} className="text-green-300" />
              ) : (
                <TrendingDown size={14} strokeWidth={2.5} className="text-red-300" />
              )}
              <span className={`text-xs font-bold ${isPositive ? 'text-green-300' : 'text-red-300'}`}>
                {currentMonthChange}% {isPositive ? '▲' : '▼'}
              </span>
            </div>
            <span className="text-xs opacity-60 font-medium font-bold">هذا الشهر</span>
          </div>
        </div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      </section>

      {/* Monthly Summary */}
      <section className="grid grid-cols-2 gap-4">
        <div className="glass-card p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={60} className="text-green-500" />
          </div>
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
              <TrendingUp size={18} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-70 mb-1">إجمالي الدخل</p>
              <p className="text-sm font-black text-on-surface">
                {formatMoney(currentMonthIncome, isPrivacyMode)}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingDown size={60} className="text-red-500" />
          </div>
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
              <TrendingDown size={18} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-70 mb-1">إجمالي المصروفات</p>
              <p className="text-sm font-black text-on-surface">
                {formatMoney(currentMonthExpense, isPrivacyMode)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="col-span-2 glass-card p-5 relative overflow-hidden group border-r-4 border-r-primary/50">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Target size={18} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-70 mb-1">صافي الادخار (الشهر)</p>
                <p className={`text-lg font-black ${currentMonthIncome - currentMonthExpense >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {currentMonthIncome - currentMonthExpense > 0 ? '+' : ''}{formatMoney(currentMonthIncome - currentMonthExpense, isPrivacyMode)}
                </p>
              </div>
            </div>
            <div className="text-left">
               <p className="text-[10px] font-black opacity-60">معدل الادخار</p>
               <p className="font-bold text-sm text-primary">
                  {currentMonthIncome > 0 ? Math.max(0, Math.round(((currentMonthIncome - currentMonthExpense) / currentMonthIncome) * 100)) : 0}%
               </p>
            </div>
          </div>
        </div>
      </section>

      {/* Accounts List */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h2 className="font-display font-bold text-lg">حساباتي</h2>
          <button onClick={() => onNavigateToTab('accounts')} className="text-[10px] text-primary font-black flex items-center gap-1 uppercase tracking-widest leading-none">إدارة <ChevronLeft size={10} /></button>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1" dir="rtl">
          {accounts.map((acc: any) => (
            <div 
              key={acc.id} 
              onClick={() => onViewAccount(acc.id)}
              className="glass-card p-4 min-w-[160px] flex-shrink-0 flex items-center gap-3 border-l-2 cursor-pointer active:scale-95 transition-all hover:bg-white/5" 
              style={{ borderLeftColor: acc.color.replace('text-', '') }}
            >
              <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center ${acc.color}`}>
                <IconRenderer icon={acc.icon} size={18} strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-on-surface-variant font-black mb-0.5">{acc.name}</p>
                <p className="text-sm font-bold font-display">{formatMoney(accountBalances[acc.id] || 0, isPrivacyMode)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Insights Section */}
      <AIInsights transactions={transactions} isPremium={isPremium} />

      {/* Debts Summary */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="font-display font-bold text-lg">الديون والالتزامات</h2>
          <button onClick={() => onNavigateToTab('debts')} className="text-[10px] text-primary font-black flex items-center gap-1 uppercase tracking-widest leading-none">عرض الكل <ChevronLeft size={10} /></button>
        </div>
        <div className="space-y-3">
          {debts.filter((d: any) => d.status === 'active').length === 0 ? (
            <div className="glass-card py-6 text-center opacity-40">
              <p className="text-xs font-bold font-display">لا يوجد ديون حالياً</p>
            </div>
          ) : (
            debts.filter((d: any) => d.status === 'active').slice(0, 2).map((debt: any) => (
              <div key={debt.id} className="glass-card p-4 flex items-center justify-between border-r-4 border-r-orange-500/40">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${debt.type === 'owe' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                    {debt.type === 'owe' ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold">{debt.personName}</p>
                    <p className="text-[10px] text-on-surface-variant font-medium">موعد السداد: {format(debt.dueDate, 'dd MMMM', { locale: ar })}</p>
                  </div>
                </div>
                <p className={`font-display font-bold ${debt.type === 'owe' ? 'text-red-400' : 'text-green-400'}`}>
                   {formatMoney(debt.amount, isPrivacyMode)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Savings Challenges Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="font-display font-bold text-lg">تحديات الادخار</h2>
          <button onClick={() => onNavigateToTab('savings')} className="text-[10px] text-primary font-black flex items-center gap-1 uppercase tracking-widest leading-none">استكشاف <ChevronLeft size={10} /></button>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2" dir="rtl">
          {challenges.length > 0 ? challenges.map((challenge: any) => (
            <div key={challenge.id} className="glass-card p-5 min-w-[240px] flex-shrink-0 bg-indigo-500/5 relative overflow-hidden">
               <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Target size={20} /></div>
                    <span className="text-[10px] font-black bg-indigo-400 text-white px-2 py-0.5 rounded-full">نشط</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{challenge.title}</h3>
                    <p className="text-[10px] text-on-surface-variant font-bold mt-1">الهدف: {formatMoney(challenge.targetAmount, isPrivacyMode)}</p>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-400" style={{ width: `${(challenge.currentAmount / challenge.targetAmount) * 100}%` }} />
                  </div>
               </div>
            </div>
          )) : (
            <div className="glass-card p-5 w-full flex flex-col items-center justify-center text-center gap-4 bg-primary/5 py-8 border-dashed">
               <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Zap size={24} strokeWidth={1.5} /></div>
               <div>
                 <p className="text-xs font-bold">لا توجد تحديات نشطة</p>
                 <p className="text-[10px] text-on-surface-variant font-medium mt-1">ابدأ تحدي الـ 52 أسبوعاً وضاعف مدخراتك!</p>
               </div>
               <button onClick={() => onNavigateToTab('savings')} className="px-6 py-2 bg-primary text-white text-[10px] font-black rounded-full shadow-lg shadow-primary/20">ابدأ الآن</button>
            </div>
          )}
        </div>
      </section>

      {/* Summary Chips */}
      <section className="grid grid-cols-2 gap-4">
        <div className="glass-card p-5 flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mb-3">
            <TrendingUp size={18} strokeWidth={1.5} />
          </div>
          <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-wider mb-1">المدخرات</p>
          <p className="font-display font-bold text-indigo-400 text-lg">{formatMoney(income, isPrivacyMode)}</p>
        </div>
        <div className="glass-card p-5 flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-3">
            <TrendingDown size={18} strokeWidth={1.5} />
          </div>
          <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-wider mb-1">المصروفات</p>
          <p className="font-display font-bold text-red-400 text-lg">{formatMoney(expenses, isPrivacyMode)}</p>
        </div>
      </section>

      {/* Dynamic Savings Goals Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="font-display font-bold text-lg">أهداف الادخار</h2>
          <button onClick={() => onNavigateToTab('savings')} className="text-[10px] text-primary font-black flex items-center gap-1 uppercase tracking-widest leading-none">إدارة الأهداف <ChevronLeft size={10} /></button>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2" dir="rtl">
          {(goals || []).map((goal: any) => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            return (
              <div key={goal.id} className="glass-card p-5 min-w-[260px] flex-shrink-0 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onDeleteGoal(goal.id)}
                      className="p-2 bg-red-500/10 text-red-400 rounded-lg h-9 w-9 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 size={16} strokeWidth={1.5} />
                    </button>
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                      <IconRenderer icon={goal.icon} size={20} strokeWidth={1.5} />
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-primary bg-primary/20 px-2 py-0.5 rounded-full">{Math.round(progress)}%</span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-on-surface mb-1">{goal.title}</h3>
                  <p className="text-[10px] text-on-surface-variant font-bold">باقي {formatMoney(goal.targetAmount - goal.currentAmount, isPrivacyMode)}</p>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1 }}
                    className="h-full immersive-gradient shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                  />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-on-surface-variant">
                  <span>{formatMoney(goal.currentAmount, isPrivacyMode)}</span>
                  <span>{formatMoney(goal.targetAmount, isPrivacyMode)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="font-display font-bold text-lg">سجل العمليات</h2>
          <button onClick={() => onNavigateToTab('reports')} className="text-[10px] text-primary font-black flex items-center gap-1 uppercase tracking-widest leading-none">عرض الكل <ChevronLeft size={10} /></button>
        </div>
        <div className="space-y-3">
          {transactions.map((t: any) => (
            <div key={t.id} className="glass-card p-4 flex flex-col gap-3 active:scale-[0.98] transition-transform">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-on-surface-variant border border-white/5 overflow-hidden`}>
                    {t.iconUrl ? (
                      <img src={t.iconUrl} alt={t.category} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <IconRenderer icon={t.icon} size={22} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm tracking-wide">{t.title}</p>
                      {t.isRecurring && <RefreshCcw size={12} className="text-primary animate-spin-slow" />}
                    </div>
                    <p className="text-[10px] text-on-surface-variant font-bold mt-0.5">
                      {format(t.date, 'dd MMMM، yyyy', { locale: ar })}
                      {t.isRecurring && t.frequency && ` • ${t.frequency === 'daily' ? 'يومياً' : t.frequency === 'weekly' ? 'أسبوعياً' : t.frequency === 'monthly' ? 'شهرياً' : 'سنوياً'}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => onDeleteTransaction(t.id)}
                    className="p-2.5 text-on-surface-variant hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                  <p className={`font-display font-bold ${t.type === 'transfer' ? 'text-primary' : t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {t.type === 'transfer' ? '' : t.type === 'income' ? '+' : '-'}{formatMoney(t.amount, isPrivacyMode)}
                  </p>
                </div>
              </div>
              {t.notes && (
                <div className="bg-white/5 rounded-xl px-4 py-2.5 border-r-2 border-primary/40">
                  <p className="text-[10px] text-on-surface-variant italic font-medium leading-relaxed">{t.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Promo Info */}
      <div className="glass-card flex items-center justify-between p-4 bg-orange-500/5 border-orange-500/20">
        <div className="w-9 h-9 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
           <Zap size={18} strokeWidth={1.5} />
        </div>
        <div className="flex-1 px-4 text-xs font-bold text-on-surface">تذكير الفواتير المستحقة</div>
        <div className="text-[10px] text-orange-400 font-black bg-orange-400/10 px-2 py-1 rounded">٢٤ ساعة</div>
      </div>
    </div>
  );
}
