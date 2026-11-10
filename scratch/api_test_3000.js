(async ()=>{
  const base = 'http://localhost:3000';
  const tests = [
    {m:'GET', p:'/api/auth/login'},
    {m:'GET', p:'/api/auth/register'},
    {m:'GET', p:'/api/attendance'},
    {m:'GET', p:'/api/leaves'},
    {m:'GET', p:'/api/meetings'},
    {m:'GET', p:'/api/tasks'},
    {m:'GET', p:'/api/chat'},
    {m:'GET', p:'/api/announcements'},
    {m:'GET', p:'/api/events'},
  ];

  for (const t of tests) {
    try {
      const res = await fetch(base + t.p, { method: t.m });
      const txt = await res.text().catch(() => '');
      console.log(`${t.m} ${t.p} -> ${res.status} ${res.statusText} | ${txt.slice(0,200).replace(/\n/g,' ')}`);
    } catch (e) {
      console.log(`${t.m} ${t.p} -> ERROR ${e.message}`);
    }
  }
})();
