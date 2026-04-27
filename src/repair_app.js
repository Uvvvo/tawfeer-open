import fs from 'fs';

const compsWithBrokenTails = [
  'NavItem', 'ConfirmDialog', 'AIInsights',
  'AccountHistoryScreen', 'ExpensesScreen', 'Reports',
  'AddScreen', 'AddTransactionForm', 'AddGoalForm',
  'AddDebtForm', 'DebtsScreen',
  'BudgetsScreen', 'AccountsScreen',
  'SettingsScreen', 'SettingsGroup'
];

let app = fs.readFileSync('src/App.tsx', 'utf-8');

compsWithBrokenTails.forEach(comp => {
  const fileDir = comp.includes('Screen') || comp === 'Reports' ? 'src/screens' : 'src/components';
  const headLines = fs.readFileSync(`${fileDir}/${comp}.tsx`, 'utf-8').split('\n');
  const exportLineIndex = headLines.findIndex(l => l.startsWith('export function'));
  const head = headLines.slice(exportLineIndex).join('\n').replace('export function ', 'function ');
  
  // Find the first occurrence of `\n) {` or `\n: {`
  const tailMatch = app.match(/\n(:\s*[\{a-zA-Z].*\)|\)) {/);
  if (!tailMatch) {
    console.log(`Could not find tail for ${comp}`);
    return;
  }
  
  const insertIndex = tailMatch.index + 1; // position of the `)` or `:` after the newline
  
  // The head ends with a `{` or `(` or something.
  // Wait, the tail is literally just the chopped second half of the signature.
  // For `NavItem`, head is: `function NavItem({ active, onClick, icon, label }`
  // And tail is: `) {`
  // Wait!! NavItem tail is `: { active: boolean, onClick: () => void, icon: any, label: string }) {`
  // And `tailMatch[1]` is `: { active...`
  // So replacing the tail match with our reconstructed fully formed function body inside the file!
  
  // Actually, we don't even need to touch the tail!
  // The head was removed from right BEFORE the tail.
  // So if we just insert the head right before the tail!
  app = app.substring(0, insertIndex) + head + app.substring(insertIndex);
  
  console.log(`Repaired ${comp} in App.tsx`);
});

fs.writeFileSync('src/App.tsx', app);
