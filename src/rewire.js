import fs from 'fs';
import path from 'path';

const orderedComps = [
  'NavItem', 'ConfirmDialog', 'AIInsights', 'Dashboard',
  'AccountHistoryScreen', 'ExpensesScreen', 'Reports',
  'AddScreen', 'AddTransactionForm', 'AddGoalForm',
  'CategoryItem', 'AddDebtForm', 'DebtsScreen',
  'BudgetsScreen', 'SavingsScreen', 'AccountsScreen',
  'SettingsScreen', 'SettingsGroup', 'SettingsItem'
];

let app = fs.readFileSync('src/App.tsx', 'utf-8');

// The bad script removed the head (starting with `function CompName( ...`).
// We have the heads stored in the extracted files!
// The extracted files contain exactly the head, but with `export ` added.
// And `App.tsx` has the tails starting with `) {` or `: any) {` etc.

// Let's get the heads!
const heads = [];
orderedComps.forEach(comp => {
  const fileDir = comp.includes('Screen') || comp === 'Dashboard' || comp === 'Reports' ? 'src/screens' : 'src/components';
  const filePath = path.join(fileDir, comp + '.tsx');
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const exportLineIndex = lines.findIndex(l => l.startsWith('export function'));
  const head = lines.slice(exportLineIndex).join('\n').replace('export function ', 'function ');
  heads.push(head);
});

// Since the bad script did exactly:
// remainingApp = remainingApp.replace(body, '');
// And now we want to put `body` back! But we only know `body` is `head`.
// Wait, `remainingApp` had the `body` removed at specific places!
// Where? Exactly at the tails!
// The tails are currently in `App.tsx`.
// They look like `) {` or `: any) {` or `: { `.
// Oh wait, if we just search for the tails in App.tsx, we can insert the head right before the tail!
// But wait, the tails are literally JUST what followed the head!
// So if we find the occurrences of the exact tails? No, tails are very generic like `) {`.
// BUT they appear in exactly the same order as `orderedComps`!

// Let's just use `grep` logic: find lines starting with `) {` or `: ` that match the parameter continuation.
// Actually, I can use a simpler approach! The heads are known! 
// Oh wait! The text was replaced with `''`. It left the next line!
// So in App.tsx, the line *above* the tail is just an empty line (or whatever preceded the function).
// Let's look at `App.tsx`:
// 2038:   );
// 2039: }
// 2040: 
// 2041: ) {

// It's ALWAYS `\n\n) {` or `\n\n: {` etc.
// Let's use a regex to find all these missing spots!
// Regex for tail start: `^\s*(?:\)|:\s*\{|:\s*any\)) \s*\{`
