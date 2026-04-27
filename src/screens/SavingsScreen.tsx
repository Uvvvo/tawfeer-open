import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameMonth, isSameDay, startOfMonth, isAfter, subMonths, isSameWeek, subDays, addMonths } from 'date-fns';
import { ar } from 'date-fns/locale';

import { Target, Home as HomeIcon, Car, Plane, Laptop, ShoppingBag, Heart, Gift, Smartphone, ChevronRight, TrendingUp, Brain, Diamond, X, Plus, Trash, Zap, ChevronLeft, Trash2 } from 'lucide-react';
import { IconRenderer } from '../App';
export function SavingsScreen({ 
  goals, 
  challenges,
  transactions, 
  onDeleteGoal, 
  onAddGoal, 
  onAddChallenge,
  isPrivacyMode, 
  isPremium,
  currency, 
  formatMoney,
  onBack
}: any) {
  const [showAddGoal, setShowAddGoal] = useState(false);
  
  // Calculate average monthly savings from transactions
  const avgMonthlySavings = useMemo(() => {
    if (!transactions || transactions.length === 0) return 0;
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    
    const recentTx = transactions.filter((t: any) => new Date(t.date) >= threeMonthsAgo);
    const totalInc = recentTx.filter((t: any) => t.type === 'income').reduce((s: number,t: any) => s+t.amount, 0);
    const totalExp = recentTx.filter((t: any) => t.type === 'expense').reduce((s: number,t: any) => s+t.amount, 0);
    
    // Average per month over the last 3 months
    const netSavings = totalInc - totalExp;
    return Math.max(netSavings / 3, 1000); // minimum 1000 to avoid Infinity
  }, [transactions]);
  
  // Goal add form states
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');
  const [goalIcon, setGoalIcon] = useState('Target');

  const ICON_OPTIONS = [
    { id: 'Target', icon: <Target size={18} /> },
    { id: 'Home', icon: <HomeIcon size={18} /> },
    { id: 'Car', icon: <Car size={18} /> },
    { id: 'Plane', icon: <Plane size={18} /> },
    { id: 'Laptop', icon: <Laptop size={18} /> },
    { id: 'ShoppingBag', icon: <ShoppingBag size={18} /> },
    { id: 'Heart', icon: <Heart size={18} /> },
    { id: 'Gift', icon: <Gift size={18} /> },
    { id: 'Smartphone', icon: <Smartphone size={18} /> },
  ];

  const handleAddGoal = () => {
    if (!goalTitle || !goalTarget) return;
    onAddGoal({
      title: goalTitle,
      targetAmount: Number(goalTarget),
      currentAmount: Number(goalCurrent) || 0,
      icon: goalIcon,
      status: 'active',
      startDate: new Date().toISOString()
    });
    setGoalTitle('');
    setGoalTarget('');
    setGoalCurrent('');
    setGoalIcon('Target');
    setShowAddGoal(false);
  };

  const totalTarget = (goals || []).reduce((acc: number, g: any) => acc + (g.targetAmount || 0), 0);
  const totalCurrent = (goals || []).reduce((acc: number, g: any) => acc + (g.currentAmount || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-400 pb-24">
      <header className="flex justify-between items-center">
        <button 
          onClick={onBack}
          className="p-2.5 bg-white/5 rounded-full text-on-surface-variant hover:bg-white/10 transition-all"
        >
          <ChevronRight size={20} strokeWidth={1.5} />
        </button>
        <h1 className="font-display font-black text-2xl text-on-surface">إدارة الادخار</h1>
        <div className="w-10"></div>
      </header>

      {/* Summary Card */}
      <section className="immersive-gradient rounded-[32px] p-6 text-on-primary shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
             <p className="text-[10px] font-black uppercase tracking-widest opacity-70">إجمالي المدخرات المستهدفة</p>
             <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
               <TrendingUp size={18} />
             </div>
          </div>
          <h2 className="text-3xl font-black font-display mb-2">
            {formatMoney(totalTarget, isPrivacyMode)}
          </h2>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden mt-4">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${overallProgress}%` }}
               className="h-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]" 
             />
          </div>
          <div className="flex justify-between items-center mt-3">
            <p className="text-[10px] font-bold opacity-80">تم توفير {formatMoney(totalCurrent, isPrivacyMode)} حتى الآن</p>
            <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-full">{Math.round(overallProgress)}%</span>
          </div>
        </div>
      </section>

      {/* Pro Achievements (Premium Only) */}
      {isPremium && goals?.length > 0 && (
        <section className="bg-primary/5 border border-primary/20 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
           <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                 <Brain size={20} />
              </div>
              <div>
                 <h3 className="text-sm font-black text-on-surface">نظام تحقيق الأهداف الذكي</h3>
                 <p className="text-[9px] text-on-surface-variant font-bold opacity-70">توقعات مدعومة بالـ AI</p>
              </div>
              <Diamond size={16} className="mr-auto text-amber-400 fill-amber-400 animate-bounce" />
           </div>
           <div className="space-y-4">
              {goals.slice(0, 2).map((goal: any, i: number) => {
                const remaining = goal.targetAmount - goal.currentAmount;
                const monthsToGoal = remaining > 0 ? Math.ceil(remaining / avgMonthlySavings) : 0;
                return (
                  <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5">
                     <div className="text-[10px] font-bold text-on-surface flex-1">
                        موعد الوصول المتوقع لـ <span className="text-primary">{goal.title}</span>:
                     </div>
                     <div className="text-xs font-black text-primary">
                        {remaining <= 0 ? 'مكتمل!' : format(addMonths(new Date(), monthsToGoal), 'MMMM yyyy', { locale: ar })}
                     </div>
                  </div>
                );
              })}
           </div>
           <div className="mt-4 pt-4 border-t border-white/5 text-[10px] font-medium leading-relaxed text-on-surface-variant italic">
              * التوقعات مبنية على معدل الادخار الشهري الحالي ونمط معاملاتك.
           </div>
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
        </section>
      )}

      {/* Goals Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-display font-bold text-lg">أهداف الادخار</h3>
          <button 
            onClick={() => setShowAddGoal(!showAddGoal)}
            className={`p-2 rounded-xl transition-all ${showAddGoal ? 'bg-red-500/10 text-red-400' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
          >
            {showAddGoal ? <X size={20} /> : <Plus size={20} />}
          </button>
        </div>

        {showAddGoal && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 space-y-4 border-primary/20 bg-primary/5"
          >
            <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">إضافة هدف جديد</h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface-variant uppercase pr-1 tracking-widest opacity-70">أختر أيقونة الهدف</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setGoalIcon(option.id)}
                      className={`p-3 rounded-xl transition-all border ${goalIcon === option.id ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-110' : 'bg-white/5 border-white/5 text-on-surface-variant hover:bg-white/10'}`}
                    >
                      {option.icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface-variant uppercase pr-1 tracking-widest opacity-70">اسم الهدف</label>
                <input 
                  type="text" 
                  placeholder="مثلاً: سيارة جديدة، رحلة سياحية" 
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full bg-background/50 border border-white/5 rounded-xl p-3 text-sm focus:ring-1 focus:ring-primary/50 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase pr-1 tracking-widest opacity-70">المبلغ المستهدف</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full bg-background/50 border border-white/5 rounded-xl p-3 text-sm focus:ring-1 focus:ring-primary/50 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase pr-1 tracking-widest opacity-70">المبلغ المتوفر حالياً</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(e.target.value)}
                    className="w-full bg-background/50 border border-white/5 rounded-xl p-3 text-sm focus:ring-1 focus:ring-primary/50 outline-none"
                  />
                </div>
              </div>
              <button 
                onClick={handleAddGoal}
                disabled={!goalTitle || !goalTarget}
                className="w-full py-4 immersive-gradient text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                تأكيد وحفظ الهدف
              </button>
            </div>
          </motion.div>
        )}

        <div className="grid gap-4">
          {(goals || []).length > 0 ? (goals || []).map((goal: any) => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            return (
              <div key={goal.id} className="glass-card p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                      <IconRenderer icon={goal.icon} size={24} />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-base">{goal.title}</h4>
                      <p className="text-[10px] text-on-surface-variant font-bold">باقي {formatMoney(goal.targetAmount - goal.currentAmount, isPrivacyMode)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => onDeleteGoal(goal.id)}
                      className="p-2 text-on-surface-variant hover:text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} strokeWidth={1.5} />
                    </button>
                    <span className="text-[10px] font-black text-primary bg-primary/20 px-3 py-1 rounded-full h-fit self-center">{Math.round(progress)}%</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full immersive-gradient shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-on-surface-variant">
                  <span>تم توفير: {formatMoney(goal.currentAmount, isPrivacyMode)}</span>
                  <span>الهدف: {formatMoney(goal.targetAmount, isPrivacyMode)}</span>
                </div>
              </div>
            );
          }) : (
             <div className="text-center py-10 opacity-40">
               <p className="text-xs font-bold">لا توجد أهداف ادخار مضافة بعد</p>
             </div>
          )}
        </div>
      </section>

      {/* Challenges Section */}
      <section className="space-y-4">
        <h3 className="font-display font-bold text-lg px-1">تحديات الادخار</h3>
        <div className="grid gap-4">
          {challenges.map((challenge: any) => (
             <div key={challenge.id} className="glass-card p-5 flex items-center justify-between bg-indigo-500/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-1 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Zap size={80} />
                </div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 shadow-inner">
                    <Target size={24} />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm">{challenge.title}</h4>
                    <p className="text-[10px] text-indigo-400/80 font-bold mt-1 tracking-tight">تحدي نشط • {Math.round((challenge.currentAmount / challenge.targetAmount) * 100)}% مكتمل</p>
                  </div>
                </div>
                <ChevronLeft size={18} className="text-indigo-400 opacity-40" />
             </div>
          ))}
          {challenges.length === 0 && (
            <div className="glass-card p-8 text-center space-y-6 border-dashed border-white/10 bg-indigo-500/5">
               <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner rotate-3">
                 <Zap size={32} />
               </div>
               <div>
                 <p className="text-sm font-black">جاهز لتحدي الـ 52 أسبوعاً؟</p>
                 <p className="text-[10px] text-on-surface-variant mt-2 font-medium leading-relaxed opacity-70">وفر مبلغاً بسيطاً كل أسبوع وشاهد مدخراتك تنمو لتصل إلى هدفك بكل سهولة.</p>
               </div>
               <button 
                 onClick={() => onAddChallenge({
                   title: 'تحدي الـ 52 أسبوعاً',
                   targetAmount: 500000,
                   currentAmount: 0,
                   durationInWeeks: 52,
                   startDate: new Date().toISOString(),
                   status: 'active'
                 })}
                 className="w-full py-4 bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
               >
                 تفعيل التحدي الآن
               </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
