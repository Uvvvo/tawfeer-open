import fs from 'fs';
import path from 'path';

// Order in App.tsx
const orderedComps = [
  'NavItem', 'ConfirmDialog', 'AIInsights', 'Dashboard',
  'AccountHistoryScreen', 'ExpensesScreen', 'Reports',
  'AddScreen', 'AddTransactionForm', 'AddGoalForm',
  'CategoryItem', 'AddDebtForm', 'DebtsScreen',
  'BudgetsScreen', 'SavingsScreen', 'AccountsScreen',
  'SettingsScreen', 'SettingsGroup', 'SettingsItem'
];

let app = fs.readFileSync('src/App.tsx', 'utf-8');

function extractTail(source) {
  // Find the first line starting with ":" or ": any" or ": {"
  const startRegex = /^:\s*([{any])/m;
  const match = source.match(startRegex);
  if (!match) return null;
  
  const startIndex = match.index;
  let braceCount = 0;
  let inFunctionBody = false;
  let endIndex = -1;
  let startedBody = false;
  
  // First, find the "{" that opens the function body!
  // It's the first "{" AFTER the ")" that closes the parameter list.
  // Actually, we can just do normal brace counting, 
  // because the parameter list braces will open and close.
  // BUT the parameter list is already inside the function definition!
  // Wait! The tail starts with ": { active: boolean ... }) {" 
  // So there is an opening { for the parameter type, then }, then ), then { for the body.
  
  for (let i = startIndex; i < source.length; i++) {
    const char = source[i];
    if (char === '{') {
      braceCount++;
      startedBody = true;
    } else if (char === '}') {
      braceCount--;
      if (startedBody && braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  if (endIndex === -1) return null;
  return source.substring(startIndex, endIndex);
}

orderedComps.forEach(comp => {
  const tail = extractTail(app);
  if (!tail) {
    console.log(`Failed to find tail for ${comp}`);
    return;
  }
  
  app = app.replace(tail, ''); // Remove the tail from App.tsx
  
  const fileDir = comp.includes('Screen') || comp === 'Dashboard' || comp === 'Reports' ? 'src/screens' : 'src/components';
  const filePath = path.join(fileDir, comp + '.tsx');
  if (!fs.existsSync(filePath)) {
     console.log(`File missing: ${filePath}`);
     return;
  }
  
  // Append the tail to the component file
  fs.appendFileSync(filePath, tail + '\n');
  console.log(`Restored ${comp}`);
});

fs.writeFileSync('src/App.tsx', app);
console.log('App.tsx repaired!');
