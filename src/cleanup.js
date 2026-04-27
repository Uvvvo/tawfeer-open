import fs from 'fs';

const files = [
  'src/components/AddDebtForm.tsx', 'src/components/AddGoalForm.tsx',
  'src/components/AddTransactionForm.tsx', 'src/components/ConfirmDialog.tsx',
  'src/components/NavItem.tsx', 'src/components/SettingsGroup.tsx',
  'src/screens/AccountHistoryScreen.tsx', 'src/screens/AccountsScreen.tsx',
  'src/screens/AddScreen.tsx', 'src/screens/BudgetsScreen.tsx',
  'src/screens/DebtsScreen.tsx', 'src/screens/ExpensesScreen.tsx',
  'src/screens/Reports.tsx', 'src/screens/SettingsScreen.tsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) fs.unlinkSync(f);
});

// We also need to remove the broken imports from App.tsx!
let app = fs.readFileSync('src/App.tsx', 'utf-8');
const brokenComps = [
  'NavItem', 'ConfirmDialog', 'AIInsights',
  'AccountHistoryScreen', 'ExpensesScreen', 'Reports',
  'AddScreen', 'AddTransactionForm', 'AddGoalForm',
  'AddDebtForm', 'DebtsScreen',
  'BudgetsScreen', 'AccountsScreen',
  'SettingsScreen', 'SettingsGroup'
];
brokenComps.forEach(comp => {
  const fileDir = comp.includes('Screen') || comp === 'Reports' ? './screens' : './components';
  const importLine = `import { ${comp} } from '${fileDir}/${comp}';\n`;
  app = app.replace(importLine, '');
});

fs.writeFileSync('src/App.tsx', app);
