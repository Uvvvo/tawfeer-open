import fs from 'fs';
import path from 'path';

const content = fs.readFileSync('src/App.tsx', 'utf-8');

// Use this helper to extract the function body.
function extractFunction(source, funcName) {
  const startRegex = new RegExp(`^function ${funcName}\\(`, 'm');
  const match = source.match(startRegex);
  if (!match) return null;
  const startIndex = match.index;
  let braceCount = 0;
  let inFunction = false;
  let endIndex = -1;

  for (let i = startIndex; i < source.length; i++) {
    const char = source[i];
    if (char === '{') {
      braceCount++;
      inFunction = true;
    } else if (char === '}') {
      braceCount--;
      if (inFunction && braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  if (endIndex === -1) return null;
  return source.substring(startIndex, endIndex);
}

const screens = [
  'Dashboard', 'AccountHistoryScreen', 'ExpensesScreen', 'Reports',
  'AddScreen', 'AddTransactionForm', 'AddGoalForm', 'CategoryItem',
  'AddDebtForm', 'DebtsScreen', 'BudgetsScreen', 'SavingsScreen',
  'AccountsScreen', 'SettingsScreen', 'NavItem', 'ConfirmDialog',
  'AIInsights', 'SettingsGroup', 'SettingsItem'
];

let remainingApp = content;

const screensDir = 'src/screens';
const componentsDir = 'src/components';

if (!fs.existsSync(screensDir)) fs.mkdirSync(screensDir);
if (!fs.existsSync(componentsDir)) fs.mkdirSync(componentsDir);

const allLucideIcons = [
  'Home', 'PieChart', 'PlusCircle', 'TrendingUp', 'Wallet', 
  'Settings', 'CreditCard', 'DollarSign', 'Calendar', 'Briefcase',
  'Utensils', 'Car', 'ShoppingCart', 'Zap', 'Heart', 'Coffee',
  'MoreHorizontal', 'ArrowDownRight', 'ArrowUpRight', 'Search',
  'Filter', 'Download', 'ChevronLeft', 'ChevronRight', 'PiggyBank',
  'Target', 'Plus', 'MoreVertical', 'Trash2', 'Edit2', 'Check', 'X',
  'Bell', 'Eye', 'EyeOff', 'TrendingDown', 'AlertTriangle',
  'History', 'LogOut', 'Shield', 'Smartphone', 'User', 'Mail',
  'Lock', 'Unlock', 'Image as ImageIcon', 'Camera', 'RefreshCcw',
  'Clock', 'ChevronDown', 'ChevronUp', 'Activity', 'Award',
  'Crosshair', 'Star', 'UserIcon', 'Moon', 'Sun', 'Globe',
  'FileText', 'HelpCircle', 'Cpu', 'Info', 'ShieldCheck',
  'BarChart2', 'BarChart3', 'PieChart as PieChartIcon', 'LineChart',
  'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Maximize2', 
  'Minimize2', 'Upload', 'Download as DownloadIcon', 'Image',
  'Wifi', 'WifiOff', 'Signal', 'Battery', 'Tag', 'Landmark', 'Diamond', 'Sparkles',
  'Instagram', 'Send'
];

screens.forEach(comp => {
  const body = extractFunction(remainingApp, comp);
  if (!body) {
    console.log(`Could not extract ${comp}`);
    return;
  }

  // Remove component from remainingApp
  remainingApp = remainingApp.replace(body, '');

  let fileDir = comp.includes('Screen') || comp === 'Dashboard' || comp === 'Reports' ? screensDir : componentsDir;
  
  // Find which icons are used
  const usedIcons = allLucideIcons.filter(icon => {
    const iconName = icon.split(' as ')[0];
    const regex = new RegExp(`\\b${iconName}\\b`);
    return regex.test(body);
  });

  // Collect which types to import based on types.ts
  const appTypes = ['Tab', 'Transaction', 'Account', 'Debt', 'SavingChallenge', 'Category', 'Goal', 'Budget', 'Palette', 'AppNotification'];
  
  const usedTypes = appTypes.filter(type => {
      const regex = new RegExp(`\\b${type}\\b`);
      return regex.test(body);
  });

  let imports = `import React, { useState, useEffect, useMemo, useRef } from 'react';\n`;
  imports += `import { motion, AnimatePresence } from 'framer-motion';\n`;
  imports += `import { format, isSameMonth, isSameDay, startOfCurrentMonth, isAfter, subMonths, isSameWeek, subDays } from 'date-fns';\n`;
  imports += `import { ar } from 'date-fns/locale';\n`;
  if (usedIcons.length > 0) {
    imports += `import { ${usedIcons.join(', ')} } from 'lucide-react';\n`;
  }
  
  if (usedTypes.length > 0) {
      const relativePath = fileDir === screensDir ? '../types' : '../types';
      imports += `import { ${usedTypes.join(', ')} } from '${relativePath}';\n`;
  }

  // Very hacky way to inject global functions if needed, but for now we'll rely on props.
  // Actually, wait, some components might use `formatMoney` strictly from props or global? No, it's passed as prop mostly.
  // But wait, there are Recharts imports needed for Reports!

  if (comp === 'Reports' || comp === 'Dashboard' || comp === 'BudgetsScreen' || comp === 'SettingsScreen') {
     imports += `import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area, LineChart, Line } from 'recharts';\n`;
  }

  // Replace function signature with export
  const exportBody = body.replace(/^function /, 'export function ');

  fs.writeFileSync(path.join(fileDir, `${comp}.tsx`), `${imports}\n${exportBody}`);
  console.log(`Extracted ${comp}`);
});

fs.writeFileSync('src/App.tsx', remainingApp);

// Prepend imports to App.tsx
let remainingAppWithImports = fs.readFileSync('src/App.tsx', 'utf-8');
const allImportsNeeded = screens.map(comp => {
  const fileDir = comp.includes('Screen') || comp === 'Dashboard' || comp === 'Reports' ? './screens' : './components';
  return `import { ${comp} } from '${fileDir}/${comp}';`;
}).join('\n');

remainingAppWithImports = remainingAppWithImports.replace(/(import .*;\n)+/, (match) => {
    return match + allImportsNeeded + '\n';
});

fs.writeFileSync('src/App.tsx', remainingAppWithImports);
console.log('Done!');
