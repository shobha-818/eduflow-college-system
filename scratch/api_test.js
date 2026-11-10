(async ()=>{
  const base = 'http://localhost:3001';
  const tests = [
    {m:'POST', p:'/api/auth/login', b:{email:'test@example.com', password:'password'}},
    {m:'POST', p:'/api/auth/register', b:{email:'test@example.com', password:'password'}},
    {m:'GET', p:'/api/attendance'},
    {m:'POST', p:'/api/attendance', b:{}},
    {m:'GET', p:'/api/leaves'},
    {m:'POST', p:'/api/leaves', b:{}},
    {m:'PUT', p:'/api/leaves', b:{}},
    {m:'GET', p:'/api/meetings'},
    {m:'POST', p:'/api/meetings', b:{}},
    {m:'PUT', p:'/api/meetings', b:{}},
    {m:'DELETE', p:'/api/meetings', b:{}},
    {m:'GET', p:'/api/tasks'},
    {m:'POST', p:'/api/tasks', b:{}},
    {m:'PUT', p:'/api/tasks', b:{}},
    {m:'GET', p:'/api/chat'},
    {m:'POST', p:'/api/chat', b:{}},
    {m:'GET', p:'/api/announcements'},
    {m:'POST', p:'/api/announcements', b:{}},
    {m:'DELETE', p:'/api/announcements', b:{}},
    {m:'GET', p:'/api/events'},
    {m:'POST', p:'/api/events', b:{}},
    {m:'DELETE', p:'/api/events', b:{}},
  ];

  for (const t of tests) {
    try {
      const res = await fetch(base + t.p, {
        method: t.m,
        headers: { 'Content-Type': 'application/json' },
        body: t.b ? JSON.stringify(t.b) : undefined,
      });
      const txt = await res.text().catch(() => '');
      console.log(`${t.m} ${t.p} -> ${res.status} ${res.statusText} | ${txt.slice(0,200).replace(/\n/g,' ')}`);
    } catch (e) {
      console.log(`${t.m} ${t.p} -> ERROR ${e.message}`);
    }
  }
})();
