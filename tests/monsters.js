// Monsters tab: both GBA games, one card per monster with a version dropdown, search, sort, Broken Seal copies filter, hidden in Dark Dawn, 400px width.
const { chromium } = require(process.argv[2] ? process.argv[2] + '/playwright' : 'playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 1100 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('file://' + process.cwd() + '/planner.html');
  const cnt = () => p.evaluate(() => document.querySelectorAll('#monList .mon').length);
  await p.selectOption('#gameSel', 'tla'); await p.click('#tabMonsters'); await p.waitForTimeout(200);
  console.log('TLA monsters:', await cnt());
  await p.check('#monCarry'); console.log('without Broken Seal copies:', await cnt()); await p.uncheck('#monCarry');
  await p.fill('#monQ', 'mercury djinni'); await p.waitForTimeout(100);
  const lv = () => p.innerText('#monList .mon .gs-l1').then(t => t.replace(/\s+/g, ' '));
  console.log('Mercury Djinni cards:', await cnt(), '| versions:', await p.evaluate(() => document.querySelector('#monList select[data-mon]').options.length), '| first:', await lv());
  await p.selectOption('#monList select[data-mon]', '5'); await p.waitForTimeout(100);
  console.log('after picking version 6:', await lv(), '| select value:', await p.inputValue('#monList select[data-mon]'));
  await p.fill('#monQ', 'phoenix'); await p.waitForTimeout(100);
  console.log('Phoenix card:', (await p.innerText('#monList .mon')).replace(/\s+/g, ' ').slice(0, 120));
  await p.fill('#monQ', ''); await p.selectOption('#monSort', 'hp'); await p.waitForTimeout(100);
  console.log('highest HP:', (await p.innerText('#monList .mon .gs-l1')).replace(/\s+/g, ' '));
  await p.selectOption('#gameSel', 'gs1'); await p.waitForTimeout(150); await p.click('#tabMonsters'); await p.waitForTimeout(150);
  console.log('GS1 monsters:', await cnt(), '| copies toggle shown:', await p.isVisible('#monCarryBox'));
  await p.selectOption('#gameSel', 'dd'); await p.waitForTimeout(150);
  console.log('DD: Monsters tab hidden:', !(await p.isVisible('#tabMonsters')));
  await p.selectOption('#gameSel', 'tla'); await p.click('#tabMonsters'); await p.setViewportSize({ width: 400, height: 900 }); await p.waitForTimeout(150);
  console.log('scrollWidth @400:', await p.evaluate(() => document.documentElement.scrollWidth), '| cards overflowing:', await p.evaluate(() => [...document.querySelectorAll('#monList .mon')].filter(m => m.scrollWidth > m.clientWidth).length));
  console.log('errors', errs); await b.close();
})();
