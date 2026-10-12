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
  const felixAdd = (e) => `.djadd[data-ci="4"][data-add="${e}"]`;
  const pickDj = async (name) => { await p.locator('#picker .pk-opt', { has: p.locator('b', { hasText: new RegExp('^' + name + '$') }) }).first().click(); };
  await p.click(felixAdd(3)); console.log('Felix add-Jupiter picker head:', await txt('#picker .pk-head'));
  const gustRow = await txt('#picker .pk-opt[data-dj="54"]'); console.log('Gust option row:', gustRow);
  await pickDj('Gust');
  for (const n of ['Breeze', 'Zephyr', 'Smog', 'Kite']) { await p.click(felixAdd(3)); await pickDj(n); }
  for (const n of ['Forge', 'Fever', 'Corona', 'Scorch']) { await p.click(felixAdd(2)); await pickDj(n); }
  console.log('Felix after 5J4Ma:', await txt('#djTable thead th:nth-child(2)'), '| count row:', await p.locator('#djTable tbody tr').nth(4).locator('td').first().innerText());
  console.log('Felix + buttons left (full):', await p.locator('.djadd[data-ci="4"]').count());
  // Isaac (reserve col) takes Gust from Felix
  await p.click('.djadd[data-ci="0"][data-add="3"]'); await pickDj('Gust');
  console.log('toast:', await txt('#toast'), '| Felix class now:', await txt('#djTable thead th:nth-child(2)'));
  // replace: click Isaac's Gust chip -> swap with Breeze (on Felix) -> Felix gets Gust back
  await p.click('.djc[data-dj="54"]'); console.log('chip picker head:', await txt('#picker .pk-head'));
  await pickDj('Breeze'); console.log('swap toast:', await txt('#toast'));
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
  await p.setViewportSize({ width: 400, height: 900 }); console.log('scrollWidth @400:', await p.evaluate(() => document.documentElement.scrollWidth));
  console.log('errors', errs);
  await b.close();
})();
