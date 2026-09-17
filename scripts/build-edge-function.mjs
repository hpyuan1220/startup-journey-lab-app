// 產生 Dashboard 用的單一檔案版本 Edge Function。
// 用法：node scripts/build-edge-function.mjs
// CLI 部署用 index.ts + validate.ts 兩個檔案；Dashboard 貼上產生出來的 index.bundled.ts。
import fs from 'node:fs';
import path from 'node:path';

const dir = 'supabase/functions/ai-feedback';
const validate = fs.readFileSync(path.join(dir, 'validate.ts'), 'utf8');
const index = fs.readFileSync(path.join(dir, 'index.ts'), 'utf8');

// 移除 index.ts 對 ./validate.ts 的 import（整段合併後不需要）。
const withoutImport = index.replace(/import \{[^{}]*\} from '\.\/validate\.ts';\n/, '');
if (withoutImport === index) throw new Error('找不到 ./validate.ts 的 import，請檢查 index.ts');

const banner = [
  '// 自動產生，請勿直接編輯。',
  '// 來源：supabase/functions/ai-feedback/validate.ts + index.ts',
  '// 重新產生：node scripts/build-edge-function.mjs',
  '// 這個檔案是給 Supabase Dashboard 單檔貼上用的；CLI 部署請用原本的兩個檔案。',
  '',
].join('\n');

fs.writeFileSync(path.join(dir, 'index.bundled.ts'), banner + validate + '\n' + withoutImport);
console.log('已產生 ' + path.join(dir, 'index.bundled.ts'));
