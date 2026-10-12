const { chromium } = require(process.argv[2] ? process.argv[2] + '/playwright' : 'playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1320, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('file://' + process.cwd() + '/planner.html');
  const txt = async s => (await p.innerText(s)).replace(/\s+/g, ' ').trim();
  console.log('game options:', await p.evaluate(() => [...document.querySelectorAll('#gameSel option')].map(o => o.textContent + (o.disabled ? '(off)' : '')).join(' | ')));
  await p.selectOption('#gameSel', 'gs1');
  console.log('toast:', await txt('#toast'));
  console.log('header:', await txt('header.top p'));
  console.log('strip cards:', await p.locator('#strip .pc').count(), '| strip:', (await txt('#strip')).slice(0, 200));
  await p.click('#tabDjinn');
  console.log('djinn cols:', await p.locator('#djTable thead th').count() - 1, '| pool:', await txt('#djPool'), '| counts:', await txt('#djTable tbody tr:nth-child(5)'));
  await p.click('#btnClear');
  await p.click('.djadd[data-ci="2"]');
  console.log('picker Venus djinn listed:', await p.locator('#picker .pk-opt[data-dj]').count(), '(expect 28)');
  await p.keyboard.press('Escape');
  await p.click('#tabGear');
  console.log('gear rows:', await p.evaluate(() => [...document.querySelectorAll('#gearTable tbody th')].map(t => t.textContent).join(',')));
  await p.click('.gcell[data-ci="0"][data-sl="w"]');
  const wn = await p.evaluate(() => [...document.querySelectorAll('#picker .pk-opt b')].map(b => b.textContent));
  console.log('Isaac weapons:', wn.length, '| has Sol Blade:', wn.includes('Sol Blade'), '| has Excalibur:', wn.includes('Excalibur'), '| has Gaia Blade:', wn.includes('Gaia Blade'));
  await p.keyboard.press('Escape');
  await p.check('#endgameOnly');
  await p.click('.gcell[data-ci="0"][data-sl="w"]');
  console.log('Isaac endgame weapons:', await p.evaluate(() => [...document.querySelectorAll('#picker .pk-opt b')].map(b => b.textContent).join(', ')));
  await p.keyboard.press('Escape');
  await p.click('.gcell[data-ci="3"][data-sl="r"]');
  console.log('Mia endgame rings:', await p.evaluate(() => [...document.querySelectorAll('#picker .pk-opt b')].map(b => b.textContent).join(', ')));
  await p.keyboard.press('Escape');
  // Medium line naming: Ivan with V1 Me1 J0 -> check via setup code
  const st = await p.evaluate(() => JSON.parse(document.getElementById('ioText').value));
  st.dj.forEach(d => d.o = null); [0, 1, 2, 18, 19, 20].forEach(i => st.dj[i] = { o: 2, s: true });
  await p.evaluate(() => document.querySelectorAll('.footer-panel details').forEach(d => d.open = true)); await p.fill('#ioText', JSON.stringify(st)); await p.click('#btnLoad');
  console.log('Ivan class with 3V 3Me:', await p.evaluate(() => document.querySelector('#gearTable thead th:nth-child(4) small').textContent));
  // switch back keeps TLA setup separate
  await p.selectOption('#gameSel', 'tla');
  console.log('TLA strip cards:', await p.locator('#strip .pc').count(), '| TLA endgame toggle:', await p.isChecked('#endgameOnly'));
  await p.selectOption('#gameSel', 'gs1');
  console.log('back to GS1, endgame toggle kept:', await p.isChecked('#endgameOnly'), '| Ivan djinn:', await p.evaluate(() => JSON.parse(localStorage.getItem('gs-planner-gs1-v1')).dj.filter(d => d.o === 2).length));
  // import GS1 save while in TLA mode
  await p.selectOption('#gameSel', 'tla');
  await p.click('#importBox summary');
  await p.setInputFiles('#saveFile', 'testdata/gtc/golden-sun/game-boy-advance/france.sav');
  await p.waitForSelector('.slotbtn');
  console.log('slots:', await txt('#saveSlots'));
  await p.click('.slotbtn');
  console.log('after import game:', await p.inputValue('#gameSel'), '|', await txt('#importMsg'));
  console.log('order:', await p.evaluate(() => JSON.parse(localStorage.getItem('gs-planner-gs1-v1')).order.join(',')));
  await p.click('#btnUndoImport'); console.log('undo game:', await p.inputValue('#gameSel'));
  // TLA save auto-switches back
  await p.setInputFiles('#saveFile', 'testdata/gtc/golden-sun-the-lost-age/game-boy-advance/europeusa.sav');
  await p.waitForSelector('.slotbtn'); await p.click('.slotbtn');
  console.log('TLA import -> game:', await p.inputValue('#gameSel'));
  await p.selectOption('#gameSel', 'gs1');
  await p.click('#tabPlanner');
  await p.screenshot({ path: 'out/gs1_party.png', fullPage: false });
  await p.click('#tabGear'); await p.screenshot({ path: 'out/gs1_gear.png' });
  for (const w of [400, 375]) { await p.setViewportSize({ width: w, height: 900 }); for (const t of ['#tabPlanner', '#tabDjinn', '#tabGear', '#tabMods']) { await p.click(t); const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > w) console.log('overflow', w, t, sw); } }
  console.log('errors', errs);
  await b.close();
})();
