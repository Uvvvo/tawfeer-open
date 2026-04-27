import fs from 'fs';
import path from 'path';

const orderedComps = [
  'NavItem', 'ConfirmDialog', 'AIInsights',
  'AccountHistoryScreen', 'ExpensesScreen', 'Reports',
  'AddScreen', 'AddTransactionForm', 'AddGoalForm',
  'AddDebtForm', 'DebtsScreen',
  'BudgetsScreen', 'AccountsScreen',
  'SettingsScreen', 'SettingsGroup'
];

const bodyMarkers = {
  'NavItem': `) {\n  return (\n    <button \n      onClick={onClick}`,
  'ConfirmDialog': `) {\n  const isDanger = variant === 'danger';`,
  'AIInsights': `) {\n  const [insight, setInsight] = useState<string>('');`,
  'AccountHistoryScreen': `) {\n  if (!account) return null;`,
  'ExpensesScreen': `) {\n  const [searchQuery, setSearchQuery] = useState('');\n  const [selectedCategory, setSelectedCategory] = useState`,
  'Reports': `) {\n  const [timeFilter, setTimeFilter] = useState<'day' | 'week'`,
  'AddScreen': `) {\n  return (\n    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">\n      <div className="flex justify-between items-center px-1">\n        <h2 className="font-display font-black text-2xl bg-gradient-to-l`,
  'AddTransactionForm': `) {\n  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');`,
  'AddGoalForm': `) {\n  const [title, setTitle] = useState('');\n  const [target, setTarget] = useState('');`,
  'AddDebtForm': `) {\n  const [personName, setPersonName] = useState('');\n  const [amount, setAmount] = useState('');`,
  'DebtsScreen': `) {\n  const [showAddModal, setShowAddModal] = useState(false);\n  const [paymentModalData`,
  'BudgetsScreen': `) {\n  const [showAddModal, setShowAddModal] = useState(false);\n  const [selectedCategory`,
  'AccountsScreen': `) {\n  const [showAddAccount, setShowAddAccount] = useState(false);\n  const [newAccountName`,
  'SettingsScreen': `) {\n  const [showAddCategory, setShowAddCategory] = useState(false);\n  const [newCatLabel`,
  'SettingsGroup': `) {\n  return (\n    <div className="space-y-3">\n      <h3 className="text-[10px] font-black `
};

let app = fs.readFileSync('src/App.tsx', 'utf-8');

// First, clean up the giant pile of heads we accidentally created earlier!
// It's located right before NavItem body.
// Wait! I can just use a regex to delete EVERYTHING between:
// `2039: }` and `2242: ) {`
// Let's accurately pinpoint it.
const startPile = '} \n\nfunction NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }\nfunction ConfirmDialog';
const endPile = 'function SettingsGroup({ title, children }: { title: string, children: React.ReactNode }';
// Actually, it's safer to just replace `function NavItem( ... )` to `function SettingsGroup( ... )` with nothing!
// Let me use strict regex matching to wipe out this block.
app = app.replace(/function NavItem\(\{[^]*?function SettingsGroup\(\{[^\n]*\n/m, '');

orderedComps.forEach(comp => {
  const fileDir = comp.includes('Screen') || comp === 'Reports' ? 'src/screens' : 'src/components';
  const headLines = fs.readFileSync(`${fileDir}/${comp}.tsx`, 'utf-8').split('\n');
  const exportLineIndex = headLines.findIndex(l => l.startsWith('export function'));
  const head = headLines.slice(exportLineIndex).join('\n').replace('export function ', 'function ');
  
  const marker = bodyMarkers[comp];
  if (!marker) {
    console.log(`No marker for ${comp}`);
    return;
  }
  
  if (app.includes(marker)) {
    // Append the head exactly where the body marker starts!
    // But since the marker includes `) {`, and the head might NOT include `) {` (or it might have it inside `head`?),
    // wait! The head is EXACTLY `function NavItem({...` and MISSING `) {`.
    // And the marker IS `) {\n  return ...`.
    // So if we replace `marker` with `head + marker`, it will be:
    // `function NavItem({...` + `) {\n  return ...`
    // PERFECT!
    app = app.replace(marker, head + marker);
    console.log(`Successfully merged ${comp}`);
  } else {
    // maybe it was `:\s*{` ? No, I grabbed the exact tails from grep before!
    console.log(`Failed to find body for ${comp}`);
  }
});

fs.writeFileSync('src/App.tsx', app);
console.log('App.tsx merged!');
