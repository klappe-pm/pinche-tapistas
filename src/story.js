/* ================= STORY ================= */
/* Everything below is computed from the data. Add a day of scores and the numbers, names and sentences change with it. */
const L=a=>a.length<2?(a[0]||''):a.length===2?a.join(' and '):a.slice(0,-1).join(', ')+' and '+a.at(-1);
const nn=(n,w,ws)=>`${n} ${n===1?w:(ws||w+'s')}`;
const sB=t=>`<b>${t}</b>`, sH=t=>`<span class="hl">${t}</span>`;
const sgn=v=>(v>=0?'+':'−')+f0(Math.abs(v));
const ordinal=n=>{const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])};

function storyModel(){
  const days=ALLDAYS,N=days.length;
  const posts=days.map(d=>{
    const rows=ORDER.filter(p=>POSTS[d+'|'+p]!=null).map(p=>({p,s:POSTS[d+'|'+p]})).sort((a,b)=>b.s-a.s);
    return {d,rows,n:rows.length,avg:d3.mean(rows,r=>r.s),top:rows[0],low:rows.at(-1),winners:rows.filter(r=>r.s===rows[0].s).map(r=>r.p)};
  });
  const byDay=new Map(posts.map(x=>[x.d,x]));
  const PS={};
  ORDER.forEach(p=>{
    const ds=days.filter(d=>POSTS[d+'|'+p]!=null),sc=ds.map(d=>POSTS[d+'|'+p]);
    let best=0,run=0,cur=0;
    days.forEach(d=>{if(POSTS[d+'|'+p]!=null){run++;best=Math.max(best,run)}else run=0});
    for(let i=N-1;i>=0&&POSTS[days[i]+'|'+p]!=null;i--)cur++;
    const mine=R.filter(r=>r.player===p);
    PS[p]={p,days:ds.length,first:ds[0],avg:d3.mean(sc),sd:sc.length>1?d3.deviation(sc):0,min:d3.min(sc),max:d3.max(sc),
      minD:ds[d3.minIndex(sc)],maxD:ds[d3.maxIndex(sc)],wins:posts.filter(x=>x.winners.includes(p)).length,streak:best,cur,
      perfects:mine.filter(r=>r.score===100).length,rounds:mine.length};
  });
  const MIN=Math.min(8,Math.ceil(N/3));
  const ranked=ORDER.filter(p=>PS[p].days>=MIN).sort((a,b)=>PS[b].avg-PS[a].avg);
  const rookies=ORDER.filter(p=>PS[p].days<MIN).sort((a,b)=>PS[b].avg-PS[a].avg);

  // first week vs last week
  const wk=Math.max(1,Math.min(7,Math.floor(N/2))),W1=days.slice(0,wk),W2=days.slice(-wk);
  const wkAvg=ds=>d3.mean(ds.flatMap(d=>posts.find(x=>x.d===d).rows.map(r=>r.s)));
  const both=ORDER.filter(p=>W1.some(d=>POSTS[d+'|'+p]!=null)&&W2.some(d=>POSTS[d+'|'+p]!=null));
  const pAvg=(p,ds)=>d3.mean(ds.filter(d=>POSTS[d+'|'+p]!=null).map(d=>POSTS[d+'|'+p]));
  const ret={n:both.length,a:d3.mean(both,p=>pAvg(p,W1)),b:d3.mean(both,p=>pAvg(p,W2))};

  // day extremes (days with a real crowd)
  let pool=posts.filter(x=>x.n>=5);if(pool.length<3)pool=posts.filter(x=>x.n>=3);if(pool.length<3)pool=posts;
  const bestDay=pool.slice().sort((a,b)=>b.avg-a.avg)[0],worstDay=pool.slice().sort((a,b)=>a.avg-b.avg)[0];

  // locations
  const agg=d3.rollup(R,v=>({avg:d3.mean(v,r=>r.score),n:v.length,perfects:v.filter(r=>r.score===100).length,
      best:v.slice().sort((a,b)=>b.score-a.score)[0],worst:v.slice().sort((a,b)=>a.score-b.score)[0]}),r=>r.game_date+'|'+r.round);
  const locs=Object.entries(LOC).map(([k,l])=>({...l,k,...(agg.get(k)||{avg:null,n:0,perfects:0})})).filter(l=>l.n>0);
  const real=locs.filter(l=>l.n>=5).length>=10?locs.filter(l=>l.n>=5):locs;
  const hardest=real.slice().sort((a,b)=>a.avg-b.avg)[0],easiest=real.slice().sort((a,b)=>b.avg-a.avg)[0];
  const dayLocs=d=>[1,2,3,4,5].map(i=>locs.find(l=>l.k===d+'|'+i)).filter(Boolean);
  const conts=d3.rollups(R,v=>({avg:d3.mean(v,r=>r.score),n:v.length}),r=>r.continent).filter(([c,o])=>o.n>=30).sort((a,b)=>b[1].avg-a[1].avg);
  const countries=new Set(R.map(r=>r.country)),mostAced=locs.slice().sort((a,b)=>b.perfects-a.perfects||a.avg-b.avg)[0];
  const perfectsTotal=R.filter(r=>r.score===100).length;
  const lows=R.slice().sort((a,b)=>a.score-b.score||(a.game_date<b.game_date?-1:1)).slice(0,3);

  // rivalry
  const pairs=[];
  for(let i=0;i<ranked.length;i++)for(let j=i+1;j<ranked.length;j++){
    const a=ranked[i],b=ranked[j];let wa=0,wb=0,t=0,sh=0,gap=0,big={g:-1};
    days.forEach(d=>{const x=POSTS[d+'|'+a],y=POSTS[d+'|'+b];if(x==null||y==null)return;sh++;gap+=x-y;if(x>y)wa++;else if(y>x)wb++;else t++;if(Math.abs(x-y)>big.g)big={g:Math.abs(x-y),d,x,y}});
    if(sh>=10)pairs.push({a,b,wa,wb,t,sh,gap:gap/sh,big});
  }
  const maxSh=d3.max(pairs,p=>p.sh)||0,cand=pairs.filter(p=>p.sh>=Math.max(10,Math.round(maxSh*.7)));
  const rival=cand.slice().sort((p,q)=>Math.abs(p.wa-p.wb)-Math.abs(q.wa-q.wb)||q.sh-p.sh)[0]||null;

  const last=posts.at(-1),first=posts[0],prev=posts.at(-2)||null;
  const recordPost=posts.flatMap(x=>x.rows.map(r=>({...r,d:x.d}))).sort((a,b)=>b.s-a.s||(a.d<b.d?-1:1))[0];
  const newFaces=last.rows.filter(r=>PS[r.p].first===last.d&&last.d!==days[0]).map(r=>r.p);
  const everyDay=ORDER.filter(p=>PS[p].days===N);
  const longest=ORDER.slice().sort((a,b)=>PS[b].streak-PS[a].streak||PS[b].days-PS[a].days)[0];
  const peak=posts.slice().sort((a,b)=>b.n-a.n||(a.d<b.d?1:-1))[0];
  return {days,N,posts,byDay,PS,MIN,ranked,rookies,wk,W1,W2,wkA:wkAvg(W1),wkB:wkAvg(W2),ret,bestDay,worstDay,locs,hardest,easiest,dayLocs,conts,countries,mostAced,
    perfectsTotal,lows,pairs,rival,last,first,prev,recordPost,newFaces,everyDay,longest,peak,taps:R.length,players:ORDER.length};
}

/* ---- small html builders ---- */
function sBars(items,{max,fmt=f0}={}){
  const m=max||d3.max(items,d=>d.v)||1;
  return `<div class="st-bars">${items.map(d=>`<div class="row"><span class="nm">${d.label}</span><span class="bar"><i style="width:${Math.max(1.5,d.v/m*100)}%;${d.color?`background:${d.color}`:''}"></i></span><span class="vl">${d.text??fmt(d.v)}</span></div>`).join('')}</div>`;
}
function sCh(num,title,body,viz,cap){
  return `<section class="st-ch"><div class="st-num">Chapter ${num}</div><h2>${title}</h2>${body}${viz?`<div class="st-viz">${viz}</div>`:''}${cap?`<p class="st-cap">${cap}</p>`:''}</section>`;
}

function renderStory(){
  const M=storyModel(),el=$('#story');
  if(!M.N){el.innerHTML='<div class="empty">No scores yet.</div>';return}
  const {PS,posts,first,last,N}=M;
  const nameOf=p=>sB(p);
  const arcUp=M.wkB-M.wkA;

  /* ---------- hero ---------- */
  const heroStats=[
    [f0(d3.mean(posts.flatMap(x=>x.rows.map(r=>r.s)))),'Average final score'],
    [M.perfectsTotal,'Perfect rounds'],
    [M.recordPost.s,`Best day, ${M.recordPost.p}`],
    [M.countries.size,'Countries tapped']];
  let html=`<header class="st-hero">
    <div class="st-eyebrow">MapTap group story · ${dL(first.d)} to ${dL(last.d)}</div>
    <h1 class="st-h1">${nn(N,'day')}.<br><em>${nn(M.players,'player')}. ${M.taps.toLocaleString()} taps.</em></h1>
    <p class="st-lede">It began with ${nn(first.n,'person','people')} and a globe. ${nn(N-1,'day')} later, ${last.n} people posted in a single night, the group was ${arcUp>=0?`<b>${f0(Math.abs(arcUp))} points better</b>`:`<b>${f0(Math.abs(arcUp))} points rougher</b>`} than week one, and ${M.countries.size} countries had been tapped, mostly correctly.</p>
    <div class="st-stats">${heroStats.map(([v,k])=>`<div class="st-stat"><div class="v">${v}</div><div class="k">${k}</div></div>`).join('')}</div>
  </header>`;

  /* ---------- 1. it started small ---------- */
  const growthMax=d3.max(posts,x=>x.n);
  const growth=`<div class="st-cols" role="img" aria-label="Players per day">${posts.map(x=>`<i class="${x===M.peak?'pk':''}" style="height:${x.n/growthMax*100}%" title="${dL(x.d)}: ${nn(x.n,'player')}"></i>`).join('')}</div>
    <div class="st-axis"><span>${dL(first.d)}</span><span>${dL(posts[Math.floor(N/2)].d)}</span><span>${dL(last.d)}</span></div>`;
  html+=sCh(1,'It started small',
    `<p>On ${sB(dLong(first.d))}, ${nn(first.n,'person','people')} posted a score: ${L(first.rows.map(r=>`${nameOf(r.p)} (${r.s})`))}. That was the whole league.</p>
     <p>Then the thread filled up. The crowd hit its high-water mark on ${sB(dLong(M.peak.d))} with ${sH(M.peak.n+' players')}${M.peak.d===last.d?', which is also the most recent night':''}. ${M.newFaces.length?`${L(M.newFaces.map(nameOf))} ${M.newFaces.length>1?'made their debuts':'made a debut'} on the latest day.`:''}</p>`,
    growth,'Players who posted a score each day. The tallest bar is the biggest night.');

  /* ---------- 2. the group got better ---------- */
  const retLine=M.ret.n>=3?`Strip out the new arrivals and it holds up: the ${sH(M.ret.n+' players')} who posted in both the first and last week went from ${sB(f0(M.ret.a))} to ${sB(f0(M.ret.b))} on average (${sgn(M.ret.b-M.ret.a)}). `:'';
  html+=sCh(2,arcUp>=0?'The group got better':'The globe held its ground',
    `<p>In the first ${M.wk} days the group averaged ${sB(f0(M.wkA))}. In the most recent ${M.wk} it averaged ${sB(f0(M.wkB))}, a swing of ${sH(sgn(arcUp)+' points')}. ${retLine}</p>
     <p>The best night was ${sB(dLong(M.bestDay.d))}: ${sH(f0(M.bestDay.avg)+' average')} across ${M.bestDay.n} players. The roughest was ${sB(dLong(M.worstDay.d))}, at ${sH(f0(M.worstDay.avg))}. More on that one in a minute.</p>`,
    `<div id="st-line"></div>`,'Daily group average final score. Dot size is how many people played. The line is a 7-day rolling average.');

  /* ---------- 3. wins aren't averages ---------- */
  const mostWins=M.ranked.slice().sort((a,b)=>PS[b].wins-PS[a].wins||PS[b].avg-PS[a].avg)[0];
  const topAvg=M.ranked[0],steady=M.ranked.slice().sort((a,b)=>PS[a].sd-PS[b].sd)[0],wild=M.ranked.slice().sort((a,b)=>PS[b].sd-PS[a].sd)[0];
  const mwRank=M.ranked.indexOf(mostWins)+1;
  const winsLine=mostWins===topAvg
    ?`${nameOf(mostWins)} leads both lists: the most daily wins (${PS[mostWins].wins}) and the best average (${f0(PS[mostWins].avg)}). That almost never happens.`
    :`${nameOf(mostWins)} has the most daily wins (${PS[mostWins].wins}) but ranks only ${ordinal(mwRank)} on average (${f0(PS[mostWins].avg)}). ${nameOf(topAvg)} owns the best average at ${f0(PS[topAvg].avg)} over ${nn(PS[topAvg].days,'day')}.`;
  const rookie=M.rookies.find(p=>PS[p].avg>PS[topAvg].avg);
  html+=sCh(3,'Wins are not averages',
    `<p>${winsLine}</p>
     <p>The steadiest player is ${nameOf(steady)}, whose daily score only wobbles about ${f0(PS[steady].sd)} points. The wildest is ${nameOf(wild)} at ${f0(PS[wild].sd)}: a ${PS[wild].max} on ${dL(PS[wild].maxD)} and a ${PS[wild].min} on ${dL(PS[wild].minD)}.</p>
     ${rookie?`<p>And ${nameOf(rookie)} is averaging ${f0(PS[rookie].avg)}, but over just ${nn(PS[rookie].days,'day')}, so call it a promising start rather than a ranking.</p>`:''}`,
    `<div id="st-dumb"></div>`,`Each line runs from a player's worst day to their best, with the dot at their average. Players with fewer than ${M.MIN} days are left off.`);

  /* ---------- 4. rivalry ---------- */
  if(M.rival){
    const r=M.rival,lead=r.wa>=r.wb?[r.a,r.wa,r.b,r.wb]:[r.b,r.wb,r.a,r.wa],bigW=r.big.x>r.big.y?r.a:r.b,bigL=bigW===r.a?r.b:r.a;
    const tot=r.wa+r.wb||1;
    html+=sCh(4,'The closest rivalry',
      `<p>Of everyone who has shared ${r.sh>=20?'most':'a lot'} of the same days, ${nameOf(r.a)} and ${nameOf(r.b)} are the most evenly matched. On the ${nn(r.sh,'day')} they both posted, ${r.wa===r.wb?`they each came out ahead ${sH(r.wa)} times`:`${nameOf(lead[0])} came out ahead ${sH(lead[1])} times and ${nameOf(lead[2])} ${sH(lead[3])}`}${r.t?`, with ${nn(r.t,'tie')}`:''}.</p>
       <p>The biggest blowout between them came on ${sB(dLong(r.big.d))}, when ${nameOf(bigW)} posted ${Math.max(r.big.x,r.big.y)} to ${nameOf(bigL)}'s ${Math.min(r.big.x,r.big.y)}. Average gap over the whole run: ${f0(Math.abs(r.gap))} points${Math.abs(r.gap)<1?', which is basically nothing':''}.</p>`,
      `<div class="st-vs"><div><span class="pn">${r.a}</span><span class="pv">${r.wa}</span></div><div class="mid"><div class="split"><i style="width:${r.wa/tot*100}%;background:${col(r.a)}"></i><i style="width:${r.wb/tot*100}%;background:${col(r.b)}"></i></div><span class="small">${nn(r.sh,'shared day')}</span></div><div class="r"><span class="pv">${r.wb}</span><span class="pn">${r.b}</span></div></div>`,
      `Wins on shared days by final score. Every other pairing is in the Civil Warriors tab.`);
  }

  /* ---------- 5. the worst day ---------- */
  const wd=M.worstDay,wl=M.dayLocs(wd.d),wlHard=wl.slice().sort((a,b)=>a.avg-b.avg)[0],wlEasy=wl.slice().sort((a,b)=>b.avg-a.avg)[0];
  html+=sCh(5,'The day the globe won',
    `<p>${sB(dLong(wd.d))} is the lowest-scoring night of the run: ${sH(f0(wd.avg))} average over ${wd.n} players, with ${wd.top.p} on top at ${wd.top.s} and ${wd.low.p} at the bottom with ${wd.low.s}.</p>
     <p>The culprit was ${sB(wlHard.city+', '+wlHard.country)}, where the group averaged ${sH(f0(wlHard.avg))}${wlHard.worst?` and ${wlHard.worst.player} managed a ${wlHard.worst.score}`:''}. ${wlEasy.perfects>=2?`The same day also handed out ${nn(wlEasy.perfects,'perfect 100')} at ${sB(wlEasy.city)}, so it was not for lack of geographers.`:`The easiest spot that day was ${sB(wlEasy.city)} at ${f0(wlEasy.avg)}.`}</p>`,
    sBars(wl.map(l=>({label:`${l.round}. ${l.city}`,v:l.avg,text:`${f0(l.avg)}${l.perfects?` <span class="pf">${l.perfects}×100</span>`:''}`,color:l===wlHard?'#ff6b6b':''})),{max:100}),
    `Group average for each of the five locations that day.`);

  /* ---------- 6. the map ---------- */
  const contsTxt=M.conts.length>1?`By continent, the group is best in ${sB(M.conts[0][0])} (${f0(M.conts[0][1].avg)}) and worst in ${sB(M.conts.at(-1)[0])} (${f0(M.conts.at(-1)[1].avg)}).`:'';
  html+=sCh(6,'Where we have been',
    `<p>${nn(M.locs.length,'location')} so far, spread across ${nn(M.countries.size,'country','countries')}. ${contsTxt}</p>
     <p>The hardest place on the board is ${sB(M.hardest.city+', '+M.hardest.country)}, where the group averaged ${sH(f0(M.hardest.avg))}. The easiest is ${sB(M.easiest.city+', '+M.easiest.country)} at ${sH(f0(M.easiest.avg))}. ${M.hardest.game_date===M.easiest.game_date?`Both came on the same night, ${sB(dL(M.hardest.game_date))}. Make of that what you will.`:'Everyone can find a famous city. The hard ones are small, remote, or both.'}</p>`,
    `<div id="st-map"></div><div class="legend" style="justify-content:center"><span>Low group average</span><span class="ramp">${RAMP.map(c=>`<i style="background:${c}"></i>`).join('')}</span><span>High</span></div>`,
    `Each dot is a location from the daily game, coloured by the group's average score there.`);

  /* ---------- 7. dead on, dead wrong ---------- */
  const perfList=ORDER.filter(p=>PS[p].perfects>0).sort((a,b)=>PS[b].perfects-PS[a].perfects).slice(0,8);
  html+=sCh(7,'Dead on, and dead wrong',
    `<p>The group has landed ${sH(nn(M.perfectsTotal,'perfect 100'))}. ${perfList.length?`${nameOf(perfList[0])} leads with ${PS[perfList[0]].perfects}. `:''}${M.mostAced.perfects>=2?`The most-aced place is ${sB(M.mostAced.city+', '+M.mostAced.country)}, where ${nn(M.mostAced.perfects,'person','people')} hit 100 on the same night.`:''}</p>
     <p>At the other end: ${L(M.lows.map(r=>`${sB(r.player)} with a ${sH(r.score)} at ${r.city}, ${r.country}`))}. Nobody said the globe was fair.</p>`,
    sBars(perfList.map(p=>({label:p,v:PS[p].perfects,color:col(p)})),{}),`Perfect 100 rounds per player.`);

  /* ---------- 8. who shows up ---------- */
  const att=ORDER.slice().sort((a,b)=>PS[b].days-PS[a].days||PS[b].avg-PS[a].avg).slice(0,10);
  const L1=M.longest;
  html+=sCh(8,'Who shows up',
    `<p>${M.everyDay.length?`${L(M.everyDay.map(nameOf))} ${M.everyDay.length>1?'have':'has'} posted every single day: ${nn(N,'day')} out of ${N}.`:`Nobody has posted every single day yet.`} ${PS[L1].streak>1?`The longest streak is ${nameOf(L1)}'s ${nn(PS[L1].streak,'day')} in a row.`:''}</p>
     <p>Altogether the group has posted ${sH(posts.reduce((a,x)=>a+x.n,0).toLocaleString()+' scores')}, and ${nn(M.players-M.ranked.length,'player')} ${M.players-M.ranked.length===1?'is':'are'} still too new to rank.</p>`,
    sBars(att.map(p=>({label:p,v:PS[p].days,text:`${PS[p].days}/${N}`,color:col(p)})),{max:N}),`Days posted out of ${N}.`);

  /* ---------- 9. latest ---------- */
  const lw=last.winners,beats=last.top.s>=M.recordPost.s&&last.d===M.recordPost.d;
  html+=sCh(9,'Last night, and what comes next',
    `<p>${sB(dLong(last.d))}: ${nn(last.n,'player')}, a group average of ${sH(f0(last.avg))}${M.prev?`, ${last.avg>=M.prev.avg?'up':'down'} ${f0(Math.abs(last.avg-M.prev.avg))} from the night before`:''}. ${nameOf(L(lw))} took the day with ${sH(last.top.s)}${beats?`, which is the ${sB('best single-day score of the whole run')}`:''}.</p>
     <p>${beats?'That is the new number to beat.':`The number to beat is ${sH(M.recordPost.s)}, set by ${nameOf(M.recordPost.p)} on ${dL(M.recordPost.d)}.`} This page is written by the data, so it changes when the scores do.</p>`,
    `<div class="st-bars">${last.rows.map(r=>`<div class="row"><span class="nm">${r.p}</span><span class="bar"><i style="width:${r.s/10}%;background:${col(r.p)}"></i></span><span class="vl">${r.s}</span></div>`).join('')}</div>`,
    `Final scores on ${dL(last.d)}. Updated through ${dLong(last.d)}.`);

  html+=`<p class="st-end">Want the raw numbers? Everything above is in the tabs on the left.</p>`;
  el.innerHTML=html;

  /* ---------- charts ---------- */
  storyLine(M);storyDumb(M);storyMap(M);
}

function storyLine(M){
  const el=$('#st-line');if(!el)return;
  const w=W(el),h=230,m={t:16,r:14,b:26,l:38},P=M.posts;
  const x=d3.scalePoint().domain(P.map(p=>p.d)).range([m.l,w-m.r]).padding(.3);
  const lo=Math.floor((d3.min(P,p=>p.avg)-30)/50)*50,hi=Math.min(1000,Math.ceil((d3.max(P,p=>p.avg)+20)/50)*50);
  const y=d3.scaleLinear().domain([lo,hi]).range([h-m.b,m.t]);
  const svg=d3.select(el).append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('width','100%');
  const defs=svg.append('defs');const gr=defs.append('linearGradient').attr('id','stg').attr('x1',0).attr('x2',0).attr('y1',0).attr('y2',1);
  gr.append('stop').attr('offset','0%').attr('stop-color','#44f8fb').attr('stop-opacity',.28);gr.append('stop').attr('offset','100%').attr('stop-color','#44f8fb').attr('stop-opacity',0);
  const ticks=y.ticks(4);
  svg.append('g').attr('class','gridl').selectAll('line').data(ticks).join('line').attr('x1',m.l).attr('x2',w-m.r).attr('y1',y).attr('y2',y);
  svg.append('g').selectAll('text').data(ticks).join('text').attr('x',m.l-8).attr('y',d=>y(d)+4).attr('text-anchor','end').text(d=>d);
  const area=d3.area().x(p=>x(p.d)).y0(h-m.b).y1(p=>y(p.avg)).curve(d3.curveMonotoneX);
  svg.append('path').datum(P).attr('fill','url(#stg)').attr('d',area);
  const roll=P.map((p,i)=>({d:p.d,v:d3.mean(P.slice(Math.max(0,i-6),i+1),q=>q.avg)}));
  svg.append('path').datum(roll).attr('fill','none').attr('stroke','var(--leaf-900)').attr('stroke-width',2.5).attr('stroke-linecap','round').attr('d',d3.line().x(p=>x(p.d)).y(p=>y(p.v)).curve(d3.curveMonotoneX));
  const rad=d3.scaleSqrt().domain([1,d3.max(P,p=>p.n)||1]).range([2.5,7]);
  const dots=svg.append('g').selectAll('circle').data(P).join('circle').attr('class','mark').attr('cx',p=>x(p.d)).attr('cy',p=>y(p.avg)).attr('r',p=>rad(p.n))
    .attr('fill',p=>p===M.worstDay?'#ff6b6b':p===M.bestDay?'var(--leaf-900)':'var(--gray-300)').attr('stroke','var(--bg)').attr('stroke-width',1.5);
  tipOn(dots,p=>`<b>${dLong(p.d)}</b><br>group average <b>${f0(p.avg)}</b> over ${p.n} players<br><span class="m">${p.top.p} won with ${p.top.s}</span>`);
  [[M.worstDay,'roughest'],[M.bestDay,'best']].forEach(([p,t])=>svg.append('text').attr('x',x(p.d)).attr('y',y(p.avg)+(t==='roughest'?20:-12)).attr('text-anchor',x(p.d)>w-60?'end':x(p.d)<60?'start':'middle').style('fill','var(--gray-900)').style('font-weight',600).text(t));
  const xs=[P[0],P[Math.floor(P.length/2)],P.at(-1)];
  svg.append('g').selectAll('text').data(xs).join('text').attr('x',p=>x(p.d)).attr('y',h-6).attr('text-anchor',(p,i)=>i===0?'start':i===2?'end':'middle').text(p=>dL(p.d));
}

function storyDumb(M){
  const el=$('#st-dumb');if(!el)return;
  const rows=M.ranked,PS=M.PS,w=W(el),rh=30,h=rows.length*rh+28,lw=Math.min(96,w*.26),m={r:40};
  const lo=Math.floor((d3.min(rows,p=>PS[p].min)-20)/100)*100;
  const x=d3.scaleLinear().domain([Math.max(0,lo),1000]).range([lw,w-m.r]);
  const svg=d3.select(el).append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('width','100%');
  const tk=x.ticks(5);
  svg.append('g').attr('class','gridl').selectAll('line').data(tk).join('line').attr('x1',x).attr('x2',x).attr('y1',16).attr('y2',h);
  svg.append('g').selectAll('text').data(tk).join('text').attr('x',x).attr('y',10).attr('text-anchor','middle').text(d=>d);
  const g=svg.selectAll('g.r').data(rows).join('g').attr('class','r mark').attr('transform',(p,i)=>`translate(0,${24+i*rh})`);
  g.append('text').attr('class','lbl').attr('x',lw-10).attr('y',rh/2+4).attr('text-anchor','end').text(p=>p);
  g.append('line').attr('x1',p=>x(PS[p].min)).attr('x2',p=>x(PS[p].max)).attr('y1',rh/2).attr('y2',rh/2).attr('stroke',p=>col(p)).attr('stroke-opacity',.45).attr('stroke-width',6).attr('stroke-linecap','round');
  g.append('circle').attr('cx',p=>x(PS[p].avg)).attr('cy',rh/2).attr('r',6).attr('fill',p=>col(p)).attr('stroke','var(--bg)').attr('stroke-width',2);
  g.append('text').attr('class','val').attr('x',w-m.r+8).attr('y',rh/2+4).text(p=>`${PS[p].wins}W`);
  tipOn(g,p=>`<b>${p}</b><br>average <b>${f0(PS[p].avg)}</b> over ${PS[p].days} days<br>best ${PS[p].max} (${dL(PS[p].maxD)}), worst ${PS[p].min} (${dL(PS[p].minD)})<br>${nn(PS[p].wins,'daily win')}`);
}

function storyMap(M){
  const el=$('#st-map');if(!el)return;
  const w=W(el),h=Math.round(w*.5);
  const proj=d3.geoNaturalEarth1().fitExtent([[4,4],[w-4,h-4]],{type:'Sphere'});
  const path=d3.geoPath(proj);
  const svg=d3.select(el).append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('width','100%');
  svg.append('path').attr('class','sphere').attr('d',path({type:'Sphere'}));
  svg.append('g').selectAll('path').data(COUNTRIES.features).join('path').attr('class','land').attr('d',path);
  const rad=d3.scaleSqrt().domain([1,d3.max(M.locs,l=>l.n)||1]).range([3,6.5]);
  const dots=svg.append('g').selectAll('circle').data(M.locs.filter(l=>proj([l.lon,l.lat]))).join('circle').attr('class','mark')
    .attr('cx',l=>proj([l.lon,l.lat])[0]).attr('cy',l=>proj([l.lon,l.lat])[1]).attr('r',l=>rad(l.n))
    .attr('fill',l=>scoreColor(l.avg)).attr('stroke',l=>l===M.hardest?'#ff6b6b':'rgba(255,255,255,.55)').attr('stroke-width',l=>l===M.hardest?2:.8);
  tipOn(dots,l=>`<b>${l.city}</b>, ${l.country}<br><span class="m">${dL(l.game_date)}, round ${l.round}</span><br>group average <b>${f0(l.avg)}</b> from ${l.n} players${l.perfects?`<br>${nn(l.perfects,'perfect 100')}`:''}`);
}
