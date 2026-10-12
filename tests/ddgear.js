// Dark Dawn gear: slots, who can equip, stat changes, unconfirmed-equip flags, tooltip, GBA slots unchanged.
const { chromium } = require(process.argv[2] ? process.argv[2] + '/playwright' : 'playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1320, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('file://' + process.cwd() + '/planner.html');
  await p.selectOption('#gameSel', 'dd'); await p.waitForTimeout(200);
  console.log('gear tab visible:', await p.isVisible('#tabGear'), '| endgame toggle visible:', await p.isVisible('#endgameOnly'));
  await p.click('#tabGear');
  const rows = await p.evaluate(() => [...document.querySelectorAll('#viewGear tbody th')].map(t => t.textContent.trim()).filter(Boolean));
  console.log('gear rows:', rows.join(', '));
  const kinds = async (ci, sl) => {
    await p.click(`.gcell[data-ci="${ci}"][data-sl="${sl}"]`);
    const r = await p.evaluate(() => [...document.querySelectorAll('#picker .pk-opt b')].map(b => b.textContent).filter(n => !n.startsWith('None')));
    await p.keyboard.press('Escape'); return r;
  };
  const dd = require(process.cwd() + '/dddata.json'), byName = Object.fromEntries(Object.values(dd.items).map(it => [it.n, it]));
  const kindSet = names => [...new Set(names.map(n => byName[n].k))].sort().join('/');
  console.log('Matthew weapons:', kindSet(await kinds(0, 'w')), '| Sveta weapons:', kindSet(await kinds(5, 'w')), '| Amiti weapons:', kindSet(await kinds(4, 'w')));
  console.log('Amiti gets ankhs:', (await kinds(4, 'w')).some(n => /Ankh/.test(n)), '| Rief gets ankhs:', (await kinds(3, 'w')).some(n => /Ankh/.test(n)));
  console.log('Karis body:', kindSet(await kinds(2, 'b')), '| Matthew head:', kindSet(await kinds(0, 'h')));
  // Equip a weapon: ATK should rise by its Attack
  const atk = () => p.evaluate(() => JSON.parse(localStorage.getItem('gs-planner-dd-v1')).chars[0].eq.w);
  const before = await p.evaluate(() => document.querySelector('#viewGear tfoot') ? document.querySelector('#viewGear tfoot').innerText : '');
  await p.click('.gcell[data-ci="0"][data-sl="w"]');
  await p.locator('#picker .pk-opt', { has: p.locator('b', { hasText: /^Gaia Blade$/ }) }).first().click();
  console.log('Matthew weapon:', (await p.innerText('.gcell[data-ci="0"][data-sl="w"]')).trim(), '| saved id:', await atk());
  // Unconfirmed flag shows for Sveta's robes, not Rief's
  await p.click('.gcell[data-ci="5"][data-sl="b"]');
  console.log('Sveta robe flagged:', await p.locator('#picker .pk-opt', { has: p.locator('b', { hasText: /^Silk Robe$/ }) }).first().innerText().then(t => /may not be equippable/.test(t)));
  await p.keyboard.press('Escape');
  await p.click('.gcell[data-ci="3"][data-sl="b"]');
  console.log('Rief robe flagged:', await p.locator('#picker .pk-opt', { has: p.locator('b', { hasText: /^Silk Robe$/ }) }).first().innerText().then(t => /may not be equippable/.test(t)));
  await p.keyboard.press('Escape');
  // Party tab: build facts list the unleashes
  await p.click('#tabPlanner');
  console.log('facts:', (await p.innerText('#sheet .facts')).replace(/\s+/g, ' ').slice(0, 140));
  // Showcase uses Dark Dawn's own Psynergy sprites (GBA icon only where DD has none)
  console.log('DD psy sprites in showcase:', await p.evaluate(() => document.querySelectorAll('#showcase .gs-row img.dd').length > 50), '| GBA psy fallbacks:', await p.evaluate(() => [...document.querySelectorAll('#showcase .gs-row img:not(.dd):not(.star)')].map(i => i.alt).filter(n => !['Venus', 'Mercury', 'Mars', 'Jupiter'].includes(n)).join(',')));
  // The sheet's Psynergy list has an icon on every row (DD sprites)
  await p.locator('#sheet details.sec[data-sec="psy"]').evaluate(d => d.open = true);
  console.log('psy list icons:', await p.evaluate(() => { const r = [...document.querySelectorAll('#sheet table.psy tbody tr')]; return `${r.filter(x => x.querySelector('img.pi.dd')).length}/${r.length} DD`; }));
  await p.setViewportSize({ width: 400, height: 900 }); await p.click('#tabGear');
  console.log('scrollWidth @400:', await p.evaluate(() => document.documentElement.scrollWidth));
  await p.setViewportSize({ width: 1320, height: 1000 }); await p.screenshot({ path: 'out/dd_gear.png' });
  // GBA keeps its Shirt slot and has no Face slot
  await p.selectOption('#gameSel', 'tla'); await p.waitForTimeout(200); await p.click('#tabGear');
  console.log('TLA gear rows:', (await p.evaluate(() => [...document.querySelectorAll('#viewGear tbody th')].map(t => t.textContent.trim()).filter(Boolean))).join(', '));
  console.log('errors', errs); await b.close();
})();
