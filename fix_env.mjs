import fs from 'fs';

let content = fs.readFileSync('.env', 'utf8');

// Remove all lines containing NEXT_PUBLIC_ADMIN_EMAILS
content = content.split('\n').filter(line => !line.includes('NEXT_PUBLIC_ADMIN_EMAILS')).join('\n');

// Add the clean variable at the top
content = 'NEXT_PUBLIC_ADMIN_EMAILS="23pa1a1238@vishnu.edu.in,23pa1a1238@vishnu.edu.inc,doitclub@vishnu.edu.in"\n' + content;

fs.writeFileSync('.env', content.trim());
console.log('Fixed .env');
