const { chromium } = require(process.argv[2] ? process.argv[2] + '/playwright' : 'playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1320, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('file://' + process.cwd() + '/planner.html');
  const txt = async s => (await p.innerText(s)).replace(/\s+/g, ' ').trim();
  // Party tab
  console.log('tabs:', await txt('.tabs'), '| sheet sections:', await p.evaluate(() => [...document.querySelectorAll('#sheet details.sec')].map(d => d.dataset.sec).join(',')));
  await p.click('#sheet [data-goto="djinn"]'); console.log('edit-djinn link opens:', await p.isVisible('#djTable'));
  // Djinn tab
  await p.click('#btnClear');
  const felixAdd = (e) => `.djadd[data-ci="4"]`;
  const pickDj = async (name) => { await p.locator('#picker .pk-opt', { has: p.locator('b', { hasText: new RegExp('^' + name + '$') }) }).first().click(); };
  await p.click(felixAdd(3)); console.log('Felix add-Jupiter picker head:', await txt('#picker .pk-head'));
  const gustRow = await txt('#picker .pk-opt[data-dj="54"]'); console.log('Gust option row:', gustRow);
  await pickDj('Gust');
  for (const n of ['Breeze', 'Zephyr', 'Smog', 'Kite']) { await p.click(felixAdd(3)); await pickDj(n); }
  for (const n of ['Forge', 'Fever', 'Corona', 'Scorch']) { await p.click(felixAdd(2)); await pickDj(n); }
  console.log('Felix after 5J4Ma:', await txt('#djTable thead th:nth-child(2)'), '| count row:', await p.locator('#djTable tbody tr').nth(9).locator('td').first().innerText());
  console.log('Felix + buttons left (full):', await p.locator('.djadd[data-ci="4"]').count());
  // the picker lists only unassigned djinn; taking one from another Adept is a drag
  await p.click('.djadd[data-ci="0"]'); console.log('picker lists only unassigned djinn:', await p.evaluate(() => [...document.querySelectorAll('#picker .pk-opt[data-dj]')].every(o => !document.querySelector(`#djTable .djc[data-dj="${o.dataset.dj}"]`))));
  await p.keyboard.press('Escape');
  const dragTo = async (from, to) => { const a = await p.locator(from).boundingBox(), c = await p.locator(to).boundingBox();
    await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2, { steps: 4 });
    await p.mouse.move(c.x + c.width / 2, c.y + c.height / 2, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(100); };
  // Isaac (reserve col) takes Gust from Felix: drag it onto Isaac's empty slot
  await dragTo('.djc[data-dj="54"]', '.djadd[data-ci="0"]');
  console.log('toast:', await txt('#toast'), '| Felix class now:', await txt('#djTable thead th:nth-child(2)'));
  // swap: drag Felix's Breeze onto Isaac's Gust -> Felix gets Gust back
  await dragTo('.djc[data-dj="55"]', '.djc[data-dj="54"]'); console.log('swap toast:', await txt('#toast'));
  // standby toggle
  await p.click('.djc[data-dj="55"]'); await p.click('#picker [data-act="toggle"]');
  console.log('Breeze standby class:', await p.getAttribute('.djc[data-dj="55"]', 'class'));
  // Mods tab: multi-digit typing
  await p.click('#tabMods');
  await p.click('#mlv-4', { clickCount: 3 }); await p.keyboard.type('41');
  console.log('Felix level input after typing 41:', await p.inputValue('#mlv-4'), '| state lv:', await p.evaluate(() => JSON.parse(localStorage.getItem('tla-planner-v1')).chars[4].lv));
  await p.click('#mmod-4-2', { clickCount: 3 }); await p.keyboard.type('-12');
  console.log('ATK correction typed -12:', await p.inputValue('#mmod-4-2'), '| hint:', await p.innerText('#mmod-4-2 + small'));
  await p.fill('#mbst-4-2', '3'); await p.dispatchEvent('#mbst-4-2', 'input');
  console.log('mods foot ATK row:', (await txt('#modTable tfoot tr:nth-child(3)')).slice(0, 80));
  // baseline: revert mods only keeps djinn
  await p.click('#viewMods [data-revert="mods"]');
  console.log('after revert mods -> Felix lv', await p.inputValue('#mlv-4'), '| djinn still on Felix:', await p.evaluate(() => JSON.parse(localStorage.getItem('tla-planner-v1')).dj.filter(d => d.o === 4).length));
  // Gear tab still works
  await p.click('#tabGear'); await p.click('.gcell[data-ci="4"][data-sl="w"]');
  await p.locator('#picker .pk-opt', { has: p.locator('b', { hasText: /^Sol Blade$/ }) }).first().click();
  console.log('gear Felix weapon:', await txt('.gcell[data-ci="4"][data-sl="w"]'));
  // one-of-a-kind gear moves between Adepts; forged gear (Excalibur: Orihalcon, a Sky Dragon drop) can be on both
  { const give = async (ci, n) => { await p.click(`.gcell[data-ci="${ci}"][data-sl="w"]`); await p.locator('#picker .pk-opt', { has: p.locator('b', { hasText: new RegExp('^' + n + '$') }) }).first().click(); };
    const w = ci => txt(`.gcell[data-ci="${ci}"][data-sl="w"]`);
    await give(0, 'Sol Blade'); console.log('Sol Blade taken from Felix:', (await w(0)).includes('Sol Blade') && !(await w(4)).includes('Sol Blade'));
    await give(4, 'Excalibur'); await give(0, 'Excalibur'); console.log('two Excaliburs:', (await w(0)).includes('Excalibur') && (await w(4)).includes('Excalibur'));
    await p.hover('.gcell[data-ci="0"][data-sl="w"]'); await p.waitForTimeout(400); console.log('Excalibur tooltip:', (await p.evaluate(() => [...document.querySelectorAll('.foot')].map(e => e.innerText).filter(Boolean).join(' | ')))); }
  // Party tab shows build line
  await p.click('#tabPlanner'); console.log('sheet build line:', (await txt('#sheet details.sec[data-sec="build"]')).slice(0, 120));
  // import still works
  await p.click('#importBox summary');
  await p.setInputFiles('#saveFile', 'testdata/gtc/golden-sun-the-lost-age/game-boy-advance/europeusa.sav');
  await p.waitForSelector('.slotbtn'); await p.click('.slotbtn');
  console.log('import msg:', (await txt('#importMsg')).slice(0, 90));
  await p.click('#tabMods'); console.log('Jenna lv after import:', await p.inputValue('#mlv-5'), '| Jenna HP corr:', await p.inputValue('#mmod-5-0'));
  await p.screenshot({ path: 'out/tab_mods.png' });
  await p.click('#tabDjinn'); await p.screenshot({ path: 'out/tab_djinn.png' });
  const psyCounts = sel => p.evaluate(s => [...document.querySelectorAll(s + ' tr.psyrow td')].map(td => td.querySelectorAll('.psyl li').length).join(','), sel);
  console.log('known Psynergy, Djinn tab:', await psyCounts('#djTable'), '| Mods tab has none:', !(await p.$('#modTable tr.psyrow')));
  await p.click('#tabGear'); console.log('known Psynergy, Gear tab:', await psyCounts('#gearTable')); await p.click('#tabDjinn');
  // Standby all; right-click removes a djinni (Djinn tab) or takes gear off (Gear tab)
  { await p.click('#tabDjinn'); await p.click('#btnStandbyAll');
    console.log('standby all leaves no Set djinn:', await p.evaluate(() => document.querySelectorAll('#djTable .djc:not(.stby)').length === 0));
    await p.click('#btnSetAll'); const n0 = await p.evaluate(() => document.querySelectorAll('#djTable .djc').length);
    await p.locator('#djTable .djc').first().click({ button: 'right' });
    console.log('right-click removes a djinni:', n0 - 1 === await p.evaluate(() => document.querySelectorAll('#djTable .djc').length));
    await p.click('#tabGear'); await p.click('.gcell[data-ci="0"][data-sl="w"]'); await p.locator('#picker .pk-opt').nth(1).click();
    await p.locator('.gcell[data-ci="0"][data-sl="w"]').click({ button: 'right' });
    console.log('right-click takes gear off:', (await p.innerText('.gcell[data-ci="0"][data-sl="w"]')).trim() === '—');
    await p.click('#btnReset'); await p.click('#tabDjinn'); }
  // 76 djinn mod: four extra djinn join the pool (unassigned) and leave it again
  { await p.click('#tabDjinn'); await p.check('#djMod'); const on = await p.innerText('#djPool'); await p.uncheck('#djMod');
    console.log('76 djinn mod:', on, '| off again:', await p.innerText('#djPool')); }
  // Compose: pick every Adept's class in turn (the last option each time), each step keeps the rest completable; apply sets the djinn
  { await p.click('#tabCompose'); const steps = [];
    for (let k = 0; k < 8; k++) { const who = p.locator('#cmpNext .cmp-who button'); if (!(await who.count())) break;
      await who.first().click(); steps.push(await p.locator('.cmp-opt').count() + (await p.locator('#cmpNext p.warn').count() ? '!' : ''));
      await p.locator('.cmp-opt').last().click(); }
    const full = await p.evaluate(() => document.querySelectorAll('#cmpPicks .cls').length);
    await p.click('#cmpApply'); await p.click('#tabDjinn');
    console.log('compose: options per step', steps.join(','), '| fully levelled', full, '| djinn assigned after apply', await p.evaluate(() => document.querySelectorAll('#djTable .djc').length));
    await p.click('#btnReset'); }
  // Options: window colour (game maths), wraps, survives a reload, default restores the built-in skin
  { const surf = () => p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--surface').trim());
    await p.click('#btnOptions'); const s0 = await surf();
    for (let i = 0; i < 3; i++) await p.keyboard.press('ArrowRight');
    const s1 = await surf(); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowLeft');
    console.log('options: default', s0, '-> hue 4', s1, '| brightness row help:', await p.innerText('#optHelp'));
    await p.keyboard.press('Escape'); console.log('options closed:', await p.evaluate(() => document.getElementById('optBack').hidden));
    await p.reload(); console.log('window colour kept after reload:', (await surf()) !== s0);
    await p.click('#btnOptions'); for (let i = 0; i < 3; i++) await p.keyboard.press('ArrowLeft');
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('Escape');
    console.log('back to default:', (await surf()) === s0); await p.evaluate(() => localStorage.removeItem('gspp-window')); await p.reload(); await p.click('#tabDjinn'); }
  await p.setViewportSize({ width: 400, height: 900 }); console.log('scrollWidth @400:', await p.evaluate(() => document.documentElement.scrollWidth));
  console.log('errors', errs);
  await b.close();
})();
