const { chromium } = require(process.argv[2] ? process.argv[2] + '/playwright' : 'playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1320, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/planner.html');
  await p.click('#importBox summary');
  for (const f of ['Golden Sun.sav', 'Golden Sun The Lost Age.sav']) {
    await p.setInputFiles('#saveFile', 'testdata/user/' + f);
    await p.waitForSelector('.slotbtn');
    const n = await p.locator('.slotbtn').count();
    console.log(f, '| slots:', (await p.innerText('#saveSlots')).replace(/\s+/g, ' '));
    for (let i = 0; i < n; i++) {
      await p.locator('.slotbtn').nth(i).click();
      console.log('  ', await p.inputValue('#gameSel'), (await p.innerText('#importMsg')).replace(/Each Adept.*?used\)\./s, '').replace(/\s+/g, ' '));
    }
  }
  console.log('errors', errs); await b.close();
})();
