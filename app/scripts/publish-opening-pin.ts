/**
 * 5/12 morning opening pin — drops the project intro想法 into the
 * 黑客松脑洞补给站 圈子. Per mentor B3 (early posting = more exposure)
 * and A11 (黑客松脑洞补给站 is the recommended ring).
 *
 * Usage (from app/):
 *   pnpm tsx --env-file=.env.local scripts/publish-opening-pin.ts
 *
 * Burns 1 quota call against the publishPin endpoint. Run ONCE on 5/12 早.
 *
 * Requires .env.local with:
 *   ZHIHU_APP_KEY = your 知乎主页 URL suffix
 *   ZHIHU_APP_SECRET = the 32-char HMAC secret issued 5/9
 *   ZHIHU_API_MODE = real (defaults to mock otherwise)
 *
 * Output: pin id on success, full error body on failure.
 */

import { publishPin, DEFAULT_RING_ID } from '../lib/zhihu';

const OPENING_TEXT = `📣【看山书房】黑客松开局帖

知乎答主每天都在打这条战线：找选题 → 翻旧作 → 起草 → 担心 AI 味 → 推演读者 → 合规审。
五六个标签页之间来回切，写一条优质答案要两三个小时。

看山书房把这条链路压成一块屏幕：
🦊 9 只各司其职的狐狸 —— 总管「看山」听一句话就分发，看墨起草、看典翻旧作做语风指纹、看水调研出处、看文/看纹模拟正反读者、看势看热点、看心静默合规审。

不是 AI 替代答主，是把答主的生产力放大 5x。

🔗 试用 (访客模式即可)：https://kanshan.yang9ru.online/
🔗 决赛 demo (cache 模式)：https://kanshan.yang9ru.online/live
🔗 GitHub：https://github.com/tyang4-ai/Kanshan_Study

#知乎黑客松 #灵感引擎 #刘看山`;

async function main(): Promise<void> {
  if (process.env.ZHIHU_API_MODE !== 'real') {
    console.error('✗ Set ZHIHU_API_MODE=real in .env.local before running this script.');
    console.error('  Mock mode would no-op against the real ring.');
    process.exit(1);
  }
  if (!process.env.ZHIHU_APP_KEY || !process.env.ZHIHU_APP_SECRET) {
    console.error('✗ ZHIHU_APP_KEY + ZHIHU_APP_SECRET required in .env.local.');
    process.exit(1);
  }

  console.log(`—— publish opening pin to ring ${DEFAULT_RING_ID} (黑客松脑洞补给站) ——`);
  console.log(`Content: ${OPENING_TEXT.length} chars\n`);
  console.log(OPENING_TEXT);
  console.log('\n—— sending ——');

  const t0 = Date.now();
  try {
    const result = await publishPin(OPENING_TEXT, DEFAULT_RING_ID);
    const ms = Date.now() - t0;
    console.log(`\n✓ posted in ${ms}ms`);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    const ms = Date.now() - t0;
    console.error(`\n✗ failed after ${ms}ms:`);
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('✗ uncaught:', err);
  process.exit(1);
});
