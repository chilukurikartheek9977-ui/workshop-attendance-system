import fs from 'fs';

let content = fs.readFileSync('.env', 'utf8');

// Replace the line
content = content.replace(
  /NEXT_PUBLIC_ADMIN_EMAILS=".*"/,
  'NEXT_PUBLIC_ADMIN_EMAILS="23pa1a1238@vishnu.edu.in,23pa1a1238@vishnu.edu.inc,doitclub@vishnu.edu.in,testadmin@example.com"'
);

fs.writeFileSync('.env', content.trim());
console.log('Added testadmin@example.com to .env');
