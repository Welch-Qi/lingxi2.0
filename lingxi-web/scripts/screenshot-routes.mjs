/**
 * 逐路由截图工具：启动 Vite dev server，用无头 Chrome 截取每个一级菜单首页。
 *
 * 为什么脚本化而不是手工截图：静态页面验收的判据是"每一页真的渲染出来了"，
 * 而 11 个分区逐页手点既慢又容易漏。这个脚本把"起服务 → 逐页截图 → 关服务"
 * 收在一次执行里，便于每轮改动后复跑（AGENTS.md 铁律 9：验收凭产物，不凭自报）。
 *
 * 为什么服务与截图必须同一进程：本沙箱会把长驻后台 shell 在 ~2 分钟后回收，
 * 且 Start-Job / Start-Process 被禁用；用 Vite 的编程式 API 自己起服务，
 * 服务存活期恰好覆盖截图期，不依赖任何外部生命周期管理。
 *
 * 用法：
 *   node scripts/screenshot-routes.mjs                  # 截全部一级菜单
 *   node scripts/screenshot-routes.mjs /workbench /config
 *   CHROME_PATH=/path/to/chrome node scripts/screenshot-routes.mjs
 *
 * ⚠️ 运行前请清空 NODE_OPTIONS（本环境会注入 language shim，干扰子进程）：
 *     PowerShell:  $env:NODE_OPTIONS = ''
 *     bash:        NODE_OPTIONS= node scripts/screenshot-routes.mjs
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(import.meta.dirname, '..');
const APP = path.join(WEB, 'apps', 'lingxi-web');
const OUT = process.env.SHOT_OUT ?? path.join(WEB, 'artifacts', 'screenshots');
const PORT = Number(process.env.SHOT_PORT ?? 5174);

/** 一级菜单 + 工作台子页；与 app/router/modules.ts 的分区列表保持一致 */
const DEFAULT_ROUTES = [
  '/workbench',
  '/workbench/brief',
  '/customer',
  '/product',
  '/order',
  '/service',
  '/marketing',
  '/intel',
  '/analytics',
  '/agent',
  '/knowledge',
  '/config',
];

function findChrome() {
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  const hit = candidates.find((p) => fs.existsSync(p));
  if (!hit) {
    throw new Error('No Chrome/Edge found. Set CHROME_PATH to a Chromium-based browser.');
  }
  return hit;
}

const routes = process.argv.slice(2).filter((a) => a.startsWith('/'));
const targets = routes.length > 0 ? routes : DEFAULT_ROUTES;
const chrome = findChrome();
const height = Number(process.env.SHOT_HEIGHT ?? 1500);

fs.mkdirSync(OUT, { recursive: true });

/**
 * 解析 vite 的编程式入口。
 *
 * 为什么不能写死 node_modules/vite/dist/node/index.js：
 * 本仓 pnpm 用默认的 isolated 布局，vite 是 apps/lingxi-web 的直接依赖，
 * 只存在于 apps/lingxi-web/node_modules/ 下，仓库根 node_modules 里并没有它
 * （根目录只放 workspace 的直接依赖与 publicHoistPattern 命中的包）。
 * 写死根路径会直接 ERR_MODULE_NOT_FOUND。而换成 hoisted 布局时它又确实在根目录——
 * 两种布局都可能出现，所以按候选顺序探测，而不是赌某一种。
 */
function resolveViteEntry() {
  if (process.env.VITE_ENTRY) {
    return process.env.VITE_ENTRY;
  }
  const candidates = [
    path.join(APP, 'node_modules', 'vite', 'dist', 'node', 'index.js'),
    path.join(WEB, 'node_modules', 'vite', 'dist', 'node', 'index.js'),
  ];
  const hit = candidates.find((p) => fs.existsSync(p));
  if (hit) {
    return hit;
  }
  try {
    const req = createRequire(path.join(APP, 'package.json'));
    return path.join(path.dirname(req.resolve('vite/package.json')), 'dist', 'node', 'index.js');
  } catch {
    throw new Error(
      `找不到 vite 入口。已尝试：\n${candidates.map((c) => `  - ${c}`).join('\n')}\n可用 VITE_ENTRY 环境变量显式指定。`,
    );
  }
}

const viteEntry = resolveViteEntry();
const { createServer } = await import(pathToFileURL(viteEntry).href);

const server = await createServer({
  root: APP,
  configFile: path.join(APP, 'vite.config.ts'),
  server: { port: PORT, host: '127.0.0.1', strictPort: true },
  logLevel: 'warn',
});
await server.listen();
console.log(`dev server on http://127.0.0.1:${PORT}  (out: ${path.relative(WEB, OUT)})`);

function shoot(route, file) {
  return new Promise((resolve) => {
    const child = spawn(
      chrome,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--hide-scrollbars',
        `--user-data-dir=${path.join(OUT, '.chrome-profile')}`,
        `--window-size=1680,${height}`,
        '--virtual-time-budget=9000',
        `--screenshot=${file}`,
        `http://127.0.0.1:${PORT}${route}`,
      ],
      { stdio: 'ignore' },
    );
    child.on('exit', () => {
      const ok = fs.existsSync(file);
      console.log(
        `${ok ? 'OK  ' : 'FAIL'} ${route.padEnd(18)} ${ok ? `${(fs.statSync(file).size / 1024).toFixed(0)} KB` : ''}`,
      );
      resolve(ok);
    });
  });
}

let failed = 0;
try {
  for (const route of targets) {
    const name = route.replace(/^\//, '').replace(/\//g, '-') || 'root';
    const file = path.join(OUT, `${name}.png`);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
    if (!(await shoot(route, file))) {
      failed += 1;
    }
  }
} finally {
  await server.close();
}

console.log(failed === 0 ? `\nall ${targets.length} routes captured` : `\n${failed} route(s) failed`);
process.exit(failed === 0 ? 0 : 1);
