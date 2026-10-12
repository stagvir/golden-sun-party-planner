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
  console.log('errors', errs); await b.close();
})();
