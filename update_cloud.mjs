import fs from 'fs';
import path from 'path';

const dirs = ['functions/src/admin', 'functions/src/student'];

for (const dir of dirs) {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      if (file.endsWith('.ts')) {
        const p = path.join(dir, file);
        let content = fs.readFileSync(p, 'utf8');
        content = content.replace(/context\.auth\.token\.role !== 'admin' && context\.auth\.token\.email !== '23pa1a1238@vishnu\.edu\.in' && context\.auth\.token\.email !== 'doitclub@vishnu\.edu\.in'/g, "context.auth.token.role !== 'admin' && context.auth.token.email !== '23pa1a1238@vishnu.edu.in' && context.auth.token.email !== '23pa1a1238@vishnu.edu.inc' && context.auth.token.email !== 'doitclub@vishnu.edu.in'");
        content = content.replace(/context\.auth\.token\.role !== 'admin'/g, "context.auth.token.role !== 'admin' && context.auth.token.email !== '23pa1a1238@vishnu.edu.in' && context.auth.token.email !== '23pa1a1238@vishnu.edu.inc' && context.auth.token.email !== 'doitclub@vishnu.edu.in'");
        fs.writeFileSync(p, content);
      }
    });
  }
}
