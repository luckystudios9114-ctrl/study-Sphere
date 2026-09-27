const SUBJECTS = [
  {id:'bot11',emoji:'🌱',name:'Botany',cls:'Class 11',live:true},
  {id:'bot12',emoji:'🌱',name:'Botany',cls:'Class 12',live:false},
  {id:'zoo11',emoji:'🫀',name:'Zoology',cls:'Class 11',live:false},
  {id:'zoo12',emoji:'🫀',name:'Zoology',cls:'Class 12',live:false},
  {id:'gen11',emoji:'🧬',name:'Genetics/Molecular Biology',cls:'Class 11',live:false},
  {id:'gen12',emoji:'🧬',name:'Genetics/Molecular Biology',cls:'Class 12',live:false},
];
let currentSubject=null, currentUser=null, dbApi=null, sampleApi=null, downloadsApi=null;
let guestStart=Date.now(), guestExpired=false;

// hide splash loader once page is ready
window.addEventListener('load',()=>{
  setTimeout(()=>document.getElementById('loader').classList.add('hide'),700);
});

function go(view,arg){
  document.querySelectorAll('main section').forEach(s=>s.classList.add('hidden'));
  const el=document.getElementById('view-'+view);
  el.classList.remove('hidden');
  // restart entrance animation each time the view is shown
  el.classList.remove('view'); void el.offsetWidth; el.classList.add('view');
  if(view==='subjects') renderSubjects();
  if(view==='chapters') renderChapters(arg);
  if(view==='dashboard') renderDashboard();
}

function renderSubjects(){
  const g=document.getElementById('subjectGrid'); g.innerHTML='';
  SUBJECTS.forEach(s=>{
    const d=document.createElement('div'); d.className='card';
    d.innerHTML=`<span class="tag ${s.live?'':'lock'}">${s.live?'Live':'Coming soon'}</span><h3>${s.emoji} ${s.name}</h3><p>${s.cls}</p>`;
    d.onclick=()=>go('chapters',s);
    g.appendChild(d);
  });
}

function renderChapters(s){
  currentSubject=s;
  document.getElementById('chapTitle').textContent=`${s.emoji} ${s.name} — ${s.cls}`;
  const g=document.getElementById('chapterGrid'); g.innerHTML='';
  const chapters = s.id==='bot11' ? [
    {n:'The Living World', live:false},{n:'Biological Classification', live:false},
    {n:'The Cell: The Unit of Life', live:true},{n:'Cell Cycle & Division', live:false},
  ] : [{n:'Chapter content coming soon', live:false}];
  chapters.forEach(c=>{
    const d=document.createElement('div'); d.className='card';
    d.innerHTML=`<span class="tag ${c.live?'':'lock'}">${c.live?'Open':'Coming soon'}</span><h3>${c.n}</h3>`;
    d.onclick=()=>{ if(c.live) go('chapter'); };
    g.appendChild(d);
  });
}

function setTab(t,el){
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');
  ['notes','neet','diagram','quiz'].forEach(x=>document.getElementById('tab-'+x).classList.add('hidden'));
  const panel=document.getElementById('tab-'+t);
  panel.classList.remove('hidden');
  panel.classList.remove('fade-panel'); void panel.offsetWidth; panel.classList.add('fade-panel');
  if(t==='quiz' && !document.getElementById('quizArea').dataset.init) initQuiz();
}

document.querySelectorAll('.diagram .part').forEach(p=>{
  p.addEventListener('click',()=>{
    document.querySelectorAll('.diagram .part').forEach(x=>x.classList.remove('sel'));
    p.classList.add('sel');
    document.getElementById('partLabel').textContent=p.dataset.name;
  });
});

const QUIZ=[
 {q:"Which scientist proposed that all cells arise from pre-existing cells?",o:["Schleiden","Schwann","Virchow","Robert Hooke"],a:2},
 {q:"The fluid mosaic model describes the structure of the:",o:["Cell wall","Plasma membrane","Nucleolus","Golgi body"],a:1},
 {q:"Which organelle is called the 'powerhouse of the cell'?",o:["Ribosome","Lysosome","Mitochondria","Peroxisome"],a:2},
 {q:"Which of these lacks a membrane-bound nucleus?",o:["Amoeba","E. coli (bacterium)","Human RBC precursor","Yeast"],a:1},
 {q:"The nucleolus is:",o:["Membrane-bound","Not membrane-bound","Absent in eukaryotes","Same as nucleus"],a:1},
];
let qIdx=0, qScore=0, qAnswers=[];

function initQuiz(){
  document.getElementById('quizArea').dataset.init=1;
  qIdx=0;qScore=0;qAnswers=[];
  showQ();
}
function showQ(){
  const area=document.getElementById('quizArea');
  if(qIdx>=QUIZ.length){ return showResult(); }
  const item=QUIZ[qIdx];
  area.innerHTML=`<div class="progress"><div style="width:${(qIdx/QUIZ.length)*100}%"></div></div>
  <div class="quizq" oncontextmenu="return false" onselectstart="return false">
    <p style="color:var(--muted);font-size:.8rem">Question ${qIdx+1} of ${QUIZ.length}</p>
    <h3>${item.q}</h3>
    <div id="opts"></div>
  </div>`;
  const opts=document.getElementById('opts');
  item.o.forEach((o,i)=>{
    const b=document.createElement('button'); b.className='opt'; b.textContent=o;
    b.onclick=()=>selectOpt(i,b);
    opts.appendChild(b);
  });
}
function selectOpt(i,btn){
  const item=QUIZ[qIdx];
  document.querySelectorAll('#opts .opt').forEach(b=>b.onclick=null);
  document.querySelectorAll('#opts .opt')[item.a].classList.add('correct');
  if(i!==item.a) btn.classList.add('wrong'); else qScore++;
  qAnswers.push(i===item.a);
  setTimeout(()=>{qIdx++;showQ();},900);
}
async function showResult(){
  const pct=Math.round((qScore/QUIZ.length)*100);
  const area=document.getElementById('quizArea');
  area.innerHTML=`<div class="resultBox">
   <div class="score">${qScore}/${QUIZ.length}</div>
   <p style="color:var(--muted)">Accuracy: ${pct}%</p>
   <div class="statgrid">
     <div class="stat"><b>${qScore}</b>Correct</div>
     <div class="stat"><b>${QUIZ.length-qScore}</b>Incorrect</div>
     <div class="stat"><b>${pct}%</b>Score</div>
   </div>
   <button class="cta" onclick="downloadResult(${qScore},${pct})">⬇ Download Result</button>
   <div class="small" onclick="initQuiz()">Retake quiz</div>
  </div>`;
  if(dbApi && currentUser){
    try{ await dbApi.collection('quizHistory').add({email:currentUser.email,chapter:'The Cell',score:qScore,total:QUIZ.length,pct,ts:Date.now()});}catch(e){}
  }
}
function downloadResult(score,pct){
  const c=document.createElement('canvas'); c.width=600;c.height=400;
  const ctx=c.getContext('2d');
  const grad=ctx.createLinearGradient(0,0,600,400); grad.addColorStop(0,'#070d1f');grad.addColorStop(1,'#0b1530');
  ctx.fillStyle=grad; ctx.fillRect(0,0,600,400);
  ctx.fillStyle='#22d3ee'; ctx.font='bold 28px sans-serif'; ctx.fillText('Studysphere — Test Result',30,60);
  ctx.fillStyle='#e8edf7'; ctx.font='20px sans-serif'; ctx.fillText('Chapter: The Cell — Unit of Life',30,110);
  ctx.font='bold 60px sans-serif'; ctx.fillStyle='#34d399'; ctx.fillText(score+'/'+QUIZ.length,30,200);
  ctx.font='20px sans-serif'; ctx.fillStyle='#e8edf7'; ctx.fillText('Accuracy: '+pct+'%',30,240);
  ctx.font='14px sans-serif'; ctx.fillStyle='#94a3c2'; ctx.fillText('evaluated by lucky studios with love and care',30,370);
  c.toBlob(async(blob)=>{
    if(downloadsApi){ try{await downloadsApi.save({filename:'studysphere-result.png',data:blob});return;}catch(e){} }
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='studysphere-result.png'; a.click();
  });
}

// Lucky AI
function toggleLucky(){
  const p=document.getElementById('lucky-panel');
  p.classList.toggle('open');
  if(p.classList.contains('open')) requestAnimationFrame(()=>p.classList.add('show'));
  else p.classList.remove('show');
}
async function askLucky(){
  const inp=document.getElementById('luckyInput'); const q=inp.value.trim(); if(!q)return;
  const msgs=document.getElementById('lucky-msgs');
  msgs.innerHTML+=`<div class="msg user">${escapeHtml(q)}</div>`; inp.value='';
  const thinkId='think'+Date.now();
  msgs.innerHTML+=`<div class="msg bot" id="${thinkId}">Thinking...</div>`;
  msgs.scrollTop=msgs.scrollHeight;
  if(!sampleApi){ document.getElementById(thinkId).textContent="Lucky isn't available in this preview yet."; return; }
  try{
    const res=await sampleApi(`You are Lucky, a friendly, encouraging Biology tutor for NEET/Class 11-12 students. Answer clearly and concisely (max ~120 words). Question: ${q}`,{modelTier:'quick'});
    document.getElementById(thinkId).textContent=res.text;
  }catch(e){ document.getElementById(thinkId).textContent="Sorry, I couldn't process that right now."; }
  msgs.scrollTop=msgs.scrollHeight;
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

// Auth
function openAuth(){ document.getElementById('authOverlay').classList.add('open'); }
function closeAuth(){ if(!guestExpired) document.getElementById('authOverlay').classList.remove('open'); }
async function doAuth(){
  const name=document.getElementById('authName').value.trim();
  const email=document.getElementById('authEmail').value.trim();
  if(!name||!email){alert('Please fill name and email');return;}
  currentUser={name,email};
  document.getElementById('authBtn').textContent=name.split(' ')[0];
  guestExpired=false;
  document.getElementById('timerBadge').classList.add('hidden');
  document.getElementById('authOverlay').classList.remove('open');
  if(dbApi){ try{await dbApi.collection('users').add({name,email,ts:Date.now()});}catch(e){} }
}
function renderDashboard(){
  document.getElementById('dashStreak').textContent = currentUser ? `Welcome back, ${currentUser.name}!` : 'Log in to track streaks.';
}

// Guest 20-minute timer
const GUEST_LIMIT = 20*60;
function tickGuest(){
  if(currentUser) return;
  const elapsed=Math.floor((Date.now()-guestStart)/1000);
  const left=GUEST_LIMIT-elapsed;
  document.getElementById('timerBadge').classList.remove('hidden');
  const m=Math.max(0,Math.floor(left/60)), s=Math.max(0,left%60);
  document.getElementById('timeLeft').textContent=`${m}:${s.toString().padStart(2,'0')}`;
  if(left<=0 && !guestExpired){ guestExpired=true; document.getElementById('authTitle').textContent='Your guest session ended — continue with an account'; openAuth(); }
}
setInterval(tickGuest,1000);

// Init platform capabilities (only available when hosted inside the Claude artifact viewer)
(async()=>{
  try{ dbApi = await claude.use('db'); }catch(e){}
  try{ sampleApi = await claude.use('sample'); }catch(e){}
  try{ downloadsApi = await claude.use('downloads'); }catch(e){}
})();
