/**
 * 逐路由截图工具：启动 Vite dev server，用无头 Chrome 截取每个一级菜单首页。
 *
 * 为什么脚本化而不是手工截图：静态页面验收的判据是"每一页真的渲染出来了"，
 * 而 13 个分区逐页手点既慢又容易漏。这个脚本把"起服务 → 逐页截图 → 关服务"
 * 收在一次执行里，便于每轮改动后复跑（AGENTS.md 铁律 9：验收凭产物，不凭自报）。
 *
 * 为什么服务与截图必须同一进程：本沙箱会把长驻后台 shell 在 ~2 分钟后回收，
 * 且 Start-Job / Start-Process 被禁用；用 Vite 的编程式 API 自己起服务，
 * 服务存活期恰好覆盖截图期，不依赖任何外部生命周期管理。
 *
 * 用法：
 *   node scripts/screenshot-routes.mjs                  # 截全部一级菜单 → artifacts/screenshots
 *   node scripts/screenshot-routes.mjs /workbench /config
 *   CHROME_PATH=/path/to/chrome node scripts/screenshot-routes.mjs
 *   SHOT_OUT=artifacts/screenshots/v2 node scripts/screenshot-routes.mjs   # 换输出目录，保住旧一套图做前后对比
 *   SHOT_PORT=5175 SHOT_HEIGHT=2000 node scripts/screenshot-routes.mjs
 *   SHOT_WIDTH=1366 node scripts/screenshot-routes.mjs /analytics   # 验断点（CSS 像素，默认 1680）
 *
 * 注意：截图失败**不会**删除该路由上一轮的成功截图（先写临时文件、成功后才替换），
 * 因此输出目录里出现旧图属正常，需按脚本输出的 OK/FAIL 判断本轮结果，不要只看文件在不在。
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
// SHOT_OUT 一律转成绝对路径：本脚本会把它拼进 --user-data-dir 与 --screenshot 传给 Chrome，
// 而 Chrome 对相对路径的处理不可靠（实测相对 SHOT_OUT 会导致 12 个路由全部写不出文件）。
// 更糟的是本脚本在截图前会先删同名旧图，于是"失败"会顺带清掉上一轮的有效产物——
// 必须让路径问题在开跑前就暴露，而不是先毁证据再报错。
const OUT = path.resolve(WEB, process.env.SHOT_OUT ?? path.join('artifacts', 'screenshots'));
const PORT = Number(process.env.SHOT_PORT ?? 5174);

/** 一级菜单 + 工作台子页；与 app/router/modules.ts 的分区列表保持一致 */
const DEFAULT_ROUTES = [
  '/workbench',
  '/workbench/brief',
  '/customer',
  '/lead',
  '/opportunity',
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
/**
 * SHOT_WIDTH / SHOT_HEIGHT 的口径是 **CSS 像素**。
 *
 * 怎么确认的：往页面副标题注入 `window.innerWidth` 截了几张 ——
 * 传 `--window-size=1440` 得到 1418，传 1680 得到 1658，传 1250 得到 1228，
 * 恒定差 22px。也就是说 --window-size 本身就是 CSS 像素，
 * 但其中含约 22px 不参与布局的窗口装饰/滚动条槽。
 *
 * 为什么必须补这 22px：验响应式断点时要的是"页面实际拿到多宽"。
 * 差 22px 平时无所谓，但断点边界上（如 max-width:1240）就会得出相反的结论——
 * 而且截出来的图看起来完全正常，不会有人怀疑。
 *
 * 验断点时用 SHOT_WIDTH 显式指定（如 1366 模拟主流笔记本），
 * 别改默认值：默认 1680 与历史截图保持一致。
 */
const CHROME_CHROME_PX = 22;
const width = Number(process.env.SHOT_WIDTH ?? 1680);

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

/**
 * 截单页。
 *
 * 为什么先写 `.new.png`、成功后再改名覆盖：
 * 若直接截到目标路径，Chrome 失败时会留下**上一轮的旧图**，
 * existsSync 依然为真 → 脚本报 OK，实际拿到的是过期截图（正是"看起来成功的假图"）。
 * 若改成先删目标图再截，Chrome 失败就把上一轮的有效产物一起清掉了，
 * 变成"先毁证据再报错"。故截到临时名，只有拿到新图才替换，两头都不落空。
 */
function shoot(route, file) {
  return new Promise((resolve) => {
    const tmp = `${file}.new.png`;
    if (fs.existsSync(tmp)) {
      fs.unlinkSync(tmp);
    }
    const child = spawn(
      chrome,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--hide-scrollbars',
        `--user-data-dir=${path.join(OUT, '.chrome-profile')}`,
        `--window-size=${width + CHROME_CHROME_PX},${height + CHROME_CHROME_PX}`,
        '--virtual-time-budget=9000',
        `--screenshot=${tmp}`,
        `http://127.0.0.1:${PORT}${route}`,
      ],
      { stdio: 'ignore' },
    );
    child.on('exit', () => {
      const ok = fs.existsSync(tmp);
      if (ok) {
        fs.renameSync(tmp, file);
      }
      console.log(
        `${ok ? 'OK  ' : 'FAIL'} ${route.padEnd(18)} ${ok ? `${(fs.statSync(file).size / 1024).toFixed(0)} KB` : 'nothing written (previous kept)'}`,
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
    if (!(await shoot(route, file))) {
      failed += 1;
    }
  }
} finally {
  await server.close();
}

console.log(failed === 0 ? `\nall ${targets.length} routes captured` : `\n${failed} route(s) failed`);
process.exit(failed === 0 ? 0 : 1);
