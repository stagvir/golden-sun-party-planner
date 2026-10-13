const { chromium } = require(process.argv[2] ? process.argv[2] + '/playwright' : 'playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1320, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + process.cwd() + '/planner.html');
  const txt = async s => (await p.innerText(s)).replace(/\s+/g, ' ').trim();
  await p.selectOption('#gameSel', 'dd');
  console.log('tabs:', await txt('.tabs'), '| gear tab hidden:', await p.isHidden('#tabGear'), '| endgame hidden:', await p.isHidden('#endgameOnly'));
  console.log('strip:', (await txt('#strip')).slice(0, 400));
  console.log('sheet:', (await txt('#sheet')).slice(0, 900));
  await p.click('#tabDjinn');
  console.log('djinn head:', await txt('#djTable thead'), '| pool:', await txt('#djPool'));
  // Matthew: give 6 Mercury -> Shaman (Water Seer)
  await p.click('#btnClear');
  const add = async (ci, e, name) => { await p.click(`.djadd[data-ci="${ci}"]`); await p.locator('#picker .pk-opt', { has: p.locator('b', { hasText: new RegExp('^' + name + '$') }) }).first().click(); };
  for (const n of ['Chill', 'Sleet', 'Surge', 'Mist', 'Mellow', 'Claw']) await add(0, 1, n);
  console.log('Matthew 6 Me ->', await p.evaluate(() => document.querySelector('#djTable thead th:nth-child(2) small').textContent));
  await add(0, 0, 'Flint');
  console.log('Matthew 6 Me 1 V ->', await p.evaluate(() => document.querySelector('#djTable thead th:nth-child(2) small').textContent));
  await p.click('#tabMods');
  console.log('mods note visible:', await p.isVisible('#ddModsNote'));
  // status screen back-solve for Matthew
  const vals = [400, 150, 180, 90, 120, 3];
  for (let k = 0; k < 6; k++) await p.fill(`#mshow-0-${k}`, String(vals[k]));
  await p.click('[data-solve="0"]');
  console.log('toast:', await txt('#toast'));
  console.log('Matthew base:', await p.evaluate(() => [0,1,2,3,4,5].map(k => document.getElementById('mmod-0-' + k).value).join(',')));
  console.log('foot:', (await txt('#modTable tfoot')).slice(0, 200));
  await p.click('#tabPlanner');
  console.log('psy sample:', (await txt('#sheet details.sec[data-sec="psy"]')).slice(0, 400));
  // back to TLA, gear still works
  await p.selectOption('#gameSel', 'tla');
  console.log('TLA tabs:', await txt('.tabs'), '| TLA endgame list size check:');
  await p.click('#tabGear'); await p.check('#endgameOnly'); await p.click('.gcell[data-sl="w"] >> nth=0');
  console.log('TLA endgame weapons:', await p.locator('#picker .pk-opt').count());
  await p.keyboard.press('Escape');
  // reload with DD active (init path with D = DDDATA)
  await p.selectOption('#gameSel', 'dd'); await p.reload();
  console.log('after reload game:', await p.inputValue('#gameSel'), '| strip first:', (await txt('#strip .pc')).slice(0, 60));
  await p.selectOption('#gameSel', 'tla'); await p.click('#tabGear'); await p.hover('.gcell[data-sl="w"] >> nth=0'); await p.waitForTimeout(400);
  console.log('tooltip after DD-first load:', (await txt('#tip')).slice(0, 80));
  await p.selectOption('#gameSel', 'dd');
  for (const w of [400]) { await p.setViewportSize({ width: w, height: 900 }); for (const t of ['#tabPlanner', '#tabDjinn', '#tabMods']) { await p.click(t); const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > w) console.log('overflow', w, t, sw); } }
  await p.setViewportSize({ width: 1320, height: 1000 }); await p.click('#tabPlanner'); await p.screenshot({ path: 'out/dd_party.png' });
  await p.click('#tabMods'); await p.screenshot({ path: 'out/dd_mods.png' });
  await p.click('#tabDjinn'); console.log('DD known Psynergy (Djinn tab):', await p.evaluate(() => [...document.querySelectorAll('#djTable tr.psyrow td')].map(td => td.querySelectorAll('.psyl li').length).join(',')));
  console.log('errors', errs); await b.close();
})();
