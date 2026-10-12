const { chromium } = require(process.argv[2] ? process.argv[2] + '/playwright' : 'playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1320, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/planner.html');
  const order = () => p.evaluate(() => JSON.parse(localStorage.getItem('tla-planner-v1')).order.map(i => GSDATA.chars[i].name).join(','));
  for (const tab of ['#tabGear', '#tabDjinn', '#tabMods']) {
    await p.click(tab);
    const tid = { '#tabGear': '#gearTable', '#tabDjinn': '#djTable', '#tabMods': '#modTable' }[tab];
    const before = await order();
    const g = await p.locator(`${tid} .grip[data-pos="0"]`).boundingBox();
    const target = await p.locator(`${tid} thead th[data-pos="5"]`).boundingBox();
    await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await p.mouse.down();
    await p.mouse.move(target.x + target.width * 0.75, target.y + 10, { steps: 8 });
    const marker = await p.locator(`${tid} .drop-before, ${tid} .drop-after`).count();
    await p.mouse.up();
    console.log(tab, 'drag col0 -> right half of col5 | marker cells:', marker, '|', before, '=>', await order(), '| toast:', await p.innerText('#toast'));
  }
  // keyboard
  await p.focus('#modTable .grip[data-pos="2"]'); await p.keyboard.press('ArrowLeft');
  console.log('keyboard ArrowLeft on slot 3 =>', await order(), '| focus stays on grip:', await p.evaluate(() => document.activeElement.classList.contains('grip') && document.activeElement.dataset.pos));
  // djinn: drag one Adept's djinni onto another's to swap; dropping into a full column is refused; a click still opens the picker
  await p.click('#tabDjinn'); await p.setViewportSize({ width: 1600, height: 2000 }); await p.waitForTimeout(100);
  const djOwner = () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#djTable .djc')].map(x => [x.textContent.trim(), +x.dataset.ci])));
  const dragTo = async (a, c, dx = 0) => { await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2, { steps: 4 }); await p.mouse.move(c.x + (dx ? c.width - dx : c.width / 2), c.y + c.height / 2, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(150); };
  const first = async col => p.locator('#djTable tbody tr').first().locator('td').nth(col).locator('.djc');
  const A = await first(0), B = await first(1); const an = (await A.innerText()).trim(), bn = (await B.innerText()).trim();
  const before = await djOwner();
  await dragTo(await A.boundingBox(), await B.boundingBox());
  const after = await djOwner();
  console.log(`djinn swap ${an}<->${bn}:`, after[an] === before[bn] && after[bn] === before[an], '| toast:', await p.innerText('#toast'));
  const full = p.locator('#djTable tbody tr').nth(2).locator('td').nth(1);
  const C = p.locator('#djTable tbody tr').nth(3).locator('td').nth(0).locator('.djc'); const cn = (await C.innerText()).trim();
  await dragTo(await C.boundingBox(), await full.boundingBox(), 10);
  console.log('drop into a full column refused:', (await djOwner())[cn] === before[cn], '| toast:', await p.innerText('#toast'));
  await C.click(); await p.waitForTimeout(100);
  console.log('click opens djinn picker:', await p.evaluate(() => !document.getElementById('picker').hidden));
  // the toggle action names the state you'd move to: a Set djinni offers "Put on Standby", a Standby one "Set it again"
  { const label = () => p.evaluate(() => document.querySelector('#picker [data-act="toggle"] b').textContent);
    const set1 = await label(); await p.click('#picker [data-act="toggle"]'); await p.waitForTimeout(100);
    await C.click(); await p.waitForTimeout(100); const set2 = await label();
    console.log('Set/Standby toggle labels:', set1, '->', set2, set1 === 'Put on Standby' && set2 === 'Set it again'); await p.keyboard.press('Escape'); }
  // Adept headers sit in the same place on the Gear, Djinn and Modifiers tabs
  const heads = async () => p.evaluate(() => { const t = [...document.querySelectorAll('.view:not([hidden]) table.gtab thead th')]; return JSON.stringify(t.map(th => { const r = th.getBoundingClientRect(); return [Math.round(r.left + scrollX), Math.round(r.top + scrollY), Math.round(r.width)]; })); });
  const hp = {}; for (const t of ['Gear', 'Djinn', 'Mods']) { await p.click('#tab' + t); await p.waitForTimeout(100); hp[t] = await heads(); }
  console.log('headers static across tabs:', hp.Gear === hp.Djinn && hp.Djinn === hp.Mods); if (hp.Gear !== hp.Djinn || hp.Djinn !== hp.Mods) console.log(hp.Gear.slice(0, 60), '|', hp.Djinn.slice(0, 60), '|', hp.Mods.slice(0, 60));
  // the gear picker leaves out the item already equipped
  await p.click('#tabGear'); await p.click('.gcell[data-ci="4"][data-sl="w"]'); await p.waitForTimeout(100);
  { const now = await p.evaluate(() => (document.querySelector('#picker .pk-head span').textContent.match(/Now: (.*?)\. /) || [])[1]);
    console.log('picker omits equipped (' + now + '):', await p.evaluate(n => ![...document.querySelectorAll('#picker .pk-opt b')].some(b => b.textContent === n), now)); }
  await p.keyboard.press('Escape');
  console.log('errors', errs); await b.close();
})();
