// Monsters tab: both GBA games, one card per monster with a version dropdown, search, sort, Broken Seal copies filter, hidden in Dark Dawn, 400px width.
const { chromium } = require(process.argv[2] ? process.argv[2] + '/playwright' : 'playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 1100 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('file://' + process.cwd() + '/planner.html');
  const cnt = () => p.evaluate(() => document.querySelectorAll('#monList .mon').length);
  await p.selectOption('#gameSel', 'tla'); await p.click('#tabMonsters'); await p.waitForTimeout(200);
  console.log('TLA monsters:', await cnt(), '| without a sprite:', await p.evaluate(() => [...document.querySelectorAll('#monList .mon')].filter(c => !c.querySelector('.mon-spr img')).map(c => c.getAttribute('aria-label')).join(', ')));
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
  console.log('GS1 monsters:', await cnt(), '| copies toggle shown:', await p.isVisible('#monCarryBox'), '| without a sprite:', await p.evaluate(() => document.querySelectorAll('#monList .mon:not(:has(.mon-spr img))').length));
  await p.fill('#monQ', 'kobold'); await p.waitForTimeout(100);
  const koboldSrc = await p.getAttribute('#monList .mon .mon-spr img', 'src'); await p.fill('#monQ', '');
  await p.selectOption('#gameSel', 'tla'); await p.waitForTimeout(150); await p.click('#tabMonsters'); await p.fill('#monQ', 'kobold'); await p.waitForTimeout(100);
  console.log('Kobold picture differs between the games:', koboldSrc !== await p.getAttribute('#monList .mon .mon-spr img', 'src')); await p.fill('#monQ', '');
  // Battle: line-up in order, aim, spread falloff (Quake: neighbours at 80%), drag to reorder, right-click to remove
  await p.click('#tabBattle'); await p.waitForTimeout(100);
  for (const q of ['Gillman', 'Merman', 'Sea Dragon']) { await p.fill('#batQ', q); await p.locator('#batHits button').first().click(); }
  await p.locator('.foe').nth(1).click();
  const row = n => p.evaluate(n => { const r = [...document.querySelectorAll('#batTable tbody tr')].find(r => r.cells[0].textContent.startsWith(n)); return r && [...r.cells].slice(1).map(c => c.textContent).join(' ; '); }, n);
  console.log('Battle line-up:', await p.evaluate(() => [...document.querySelectorAll('.foe')].map(f => (f.classList.contains('centre') ? '>' : '') + f.querySelector('.nm').textContent).join(' | ')), '| Attack:', await row('Attack'), '| Quake:', await row('Quake'));
  { const a = await p.locator('.foe').nth(0).boundingBox(), c = await p.locator('.foe').nth(2).boundingBox();
    await p.mouse.move(a.x + a.width / 2, a.y + 40); await p.mouse.down(); await p.mouse.move(a.x + a.width / 2 + 30, a.y + 40, { steps: 3 }); await p.mouse.move(c.x + c.width / 2, c.y + 40, { steps: 6 }); await p.mouse.up(); }
  await p.locator('.foe').nth(0).click({ button: 'right' });
  console.log('after drag and right-click:', await p.evaluate(() => [...document.querySelectorAll('.foe')].map(f => f.querySelector('.nm').textContent).join(' | ')));
  await p.click('#batClear');
  // Classes reference: one table per series by group; Ninja matches the published table (Venus Adepts 3+3, 4+4, 4+5; Jupiter Adepts only Ninja)
  await p.click('#tabClasses'); await p.waitForSelector('.cls-tab');
  console.log('Classes (TLA):', await p.evaluate(() => [...document.querySelectorAll('.cls-grp')].map(g => g.textContent + ' ' + g.nextElementSibling.children.length).join(' | ')));
  console.log('Ninja series:', await p.evaluate(() => { const t = [...document.querySelectorAll('.cls-tab')].find(x => x.caption.textContent.startsWith('Ninja'));
    return [...t.querySelectorAll('thead tr:nth-child(2) th')].map(th => th.textContent).join('/') + ' | ' + [...t.tBodies[0].rows].map(r => [...r.cells].slice(0, 4).map(c => c.textContent.replace(/\s+/g, '')).join(' ')).join(' ; '); }));
  await p.selectOption('#gameSel', 'dd'); await p.waitForTimeout(150);
  console.log('DD: Monsters tab hidden:', !(await p.isVisible('#tabMonsters')));
  await p.selectOption('#gameSel', 'tla'); await p.click('#tabMonsters'); await p.setViewportSize({ width: 400, height: 900 }); await p.waitForTimeout(150);
  console.log('scrollWidth @400:', await p.evaluate(() => document.documentElement.scrollWidth), '| cards overflowing:', await p.evaluate(() => [...document.querySelectorAll('#monList .mon')].filter(m => m.scrollWidth > m.clientWidth).length));
  console.log('errors', errs); await b.close();
})();
