const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const defaultState = {
  view: 'home',
  mood: null,
  streak: 6,
  best: 11,
  challengeDone: false,
  energy: 125,
  completedChallenges: [],
  championDay: null,
  championCount: 0,
  messages: [
    { role: 'bot', text: "Hi. I'm your Gen Z Champion. Tell me what work has done now." }
  ]
};

let state = { ...defaultState, ...JSON.parse(localStorage.getItem('wlgenz-state') || '{}') };

const CHAMPION_DAILY_LIMIT = 5;
const CHAMPION_LIMIT_MESSAGE = "Respectfully, that’s five. I’ve logged off. I’m your Gen Z Champion, not your personal therapist. Close the laptop. Touch grass. Come back tomorrow. Boundaries, remember?";
const CHAMPION_STATUS_TOAST = `<span class="toast-kicker">STATUS UPDATED</span><strong>Champion: Offline</strong><small>Boundary held. No notes. Back tomorrow.</small>`;

function localDayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function refreshChampionAllowance() {
  const today = localDayKey();
  if (state.championDay !== today) {
    state.championDay = today;
    state.championCount = 0;
    save();
  }
}

function championRemaining() {
  refreshChampionAllowance();
  return Math.max(0, CHAMPION_DAILY_LIMIT - state.championCount);
}

function championIsOffline() {
  refreshChampionAllowance();
  return state.championCount >= CHAMPION_DAILY_LIMIT;
}

function championStatusControl() {
  const offline = championIsOffline();
  return `
    <div class="champion-presence">
      <button class="status-trigger ${offline ? 'offline' : 'online'}" id="championStatusToggle" type="button" aria-expanded="false">
        <span class="presence-dot" aria-hidden="true"></span>
        <span class="presence-copy">
          <strong>${offline ? 'Offline' : 'Available'}</strong>
          <small>${offline ? 'boundary held' : '5 reads. Choose wisely.'}</small>
        </span>
        <span class="status-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="status-menu" id="championStatusMenu" hidden>
        <div class="status-menu-title">CHAMPION STATUS</div>
        <div class="status-option ${!offline ? 'active' : ''}">
          <span class="status-icon available"></span>
          <span><strong>Available</strong><small>For now.</small></span>
        </div>
        <div class="status-option">
          <span class="status-emoji">🎧</span>
          <span><strong>Focus mode</strong><small>Do not @ me.</small></span>
        </div>
        <div class="status-option">
          <span class="status-emoji">☕</span>
          <span><strong>Lunch</strong><small>Away from desk.</small></span>
        </div>
        <div class="status-option">
          <span class="status-emoji">🌱</span>
          <span><strong>Touching grass</strong><small>Literally unavailable.</small></span>
        </div>
        <div class="status-option ${offline ? 'active' : ''}">
          <span class="status-icon offline"></span>
          <span><strong>Offline</strong><small>Boundary held.</small></span>
        </div>
      </div>
    </div>`;
}

function askChampion(text) {
  refreshChampionAllowance();

  if (state.championCount >= CHAMPION_DAILY_LIMIT) {
    const last = state.messages[state.messages.length - 1];
    if (!last || last.text !== CHAMPION_LIMIT_MESSAGE) {
      state.messages.push({ role: 'bot', text: CHAMPION_LIMIT_MESSAGE });
    }
    save();
    return { answered: false, justLoggedOff: false };
  }

  state.championCount += 1;
  state.messages.push(
    { role: 'user', text },
    { role: 'bot', text: championReply(text) }
  );

  const justLoggedOff = state.championCount === CHAMPION_DAILY_LIMIT;
  if (justLoggedOff) {
    state.messages.push({ role: 'bot', text: CHAMPION_LIMIT_MESSAGE });
  }

  save();
  return { answered: true, justLoggedOff };
}

const root = $('#viewRoot');
const modal = $('#actionModal');
const modalContent = $('#modalContent');

function save() { localStorage.setItem('wlgenz-state', JSON.stringify(state)); }
function toast(msg, type='default') {
  const t = $('#toast');
  t.className = `toast ${type === 'status' ? 'status-toast' : ''}`.trim();
  t.innerHTML = msg;
  t.classList.add('show');
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => t.classList.remove('show'), type === 'status' ? 3400 : 1900);
}
function setView(view) {
  state.view = view; save();
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  render(); window.scrollTo({ top: 0, behavior: 'smooth' });
}

const moods = [
  ['fine', '✨', 'FINE ACTUALLY', 'we love that for you'],
  ['much', '😐', 'BIT MUCH', 'send help'],
  ['urgent', '🫨', 'EVERYTHING IS URGENT', 'lol same'],
  ['done', '🔥', "I’M DONE WITH EVERYONE", 'mood']
];

const challengeBank = [
  ['tomorrow', '☕', 'Leave it until tomorrow', "Leave one non-urgent message unanswered until your next working day."],
  ['lunch', '🥪', 'Take the actual lunch', 'Thirty minutes away from your desk. No inbox. No fake productivity.'],
  ['decline', '🚫', 'Decline one thing', "Say no to one meeting, task or favour that doesn't need you."],
  ['sorry', '🫢', 'Delete “sorry”', 'Send one perfectly polite work message without apologising for existing.'],
  ['priority', '🎯', 'Make them choose', 'If two things are urgent, ask which one should come first.']
];

function homeView() {
  return `
    <section class="card mood-card">
      <h2 class="section-title mood-question" aria-label="How’s work feeling today?">
        <span class="highlight-line">
          <span>HOW’S</span><span>WORK</span><span>FEELING</span>
        </span>
        <span class="highlight-line">
          <span>TODAY?</span>
        </span>
        <span class="question-rays" aria-hidden="true"><i></i><i></i><i></i></span>
      </h2>
      <p class="micro">No wrong answers. Some concerning ones.</p>
      <div class="mood-grid">
        ${moods.map(([id,face,title,sub]) => `<button class="mood ${state.mood===id?'selected':''}" data-mood="${id}"><span class="face">${face}</span><strong>${title}</strong><small>${sub}</small></button>`).join('')}
      </div>
    </section>

    <section class="card streak-card">
      <div class="streak-row">
        <div>
          <div class="micro">🔥 NO PEOPLE PLEASING STREAK</div>
          <div class="streak-number">${state.streak} <span>DAYS</span></div>
          <div class="micro">Personal best: ${state.best} days</div>
        </div>
        <div class="sticky">people<br>pleasing<br>is so 2010.<small>♡</small></div>
      </div>
    </section>

    <section class="card champion-card">
      <div class="champion-card-heading">
        <h2 class="section-title">ASK YOUR<br>GEN Z CHAMPION</h2>
        <span class="mini-presence ${championIsOffline() ? 'offline' : 'online'}">
          <i></i>${championIsOffline() ? 'OFFLINE' : 'AVAILABLE'}
        </span>
      </div>
      <p>Drop the situation. We’ll separate the actual problem from the millennial guilt spiral.</p>
      <p class="micro">${championRemaining()} of ${CHAMPION_DAILY_LIMIT} Champion reads left today. Boundaries apply to her too.</p>
      <div class="chat-entry">
        <input id="homeChat" placeholder="${championIsOffline() ? 'Champion is offline. You’ve got this until tomorrow.' : 'My boss just messaged me at 7pm…'}" autocomplete="off" ${championIsOffline() ? 'disabled' : ''} />
        <button class="send-btn" id="homeSend" aria-label="Send" ${championIsOffline() ? 'disabled' : ''}>${championIsOffline() ? '✓' : '›'}</button>
      </div>
    </section>

    <div class="quick-grid">
      <button class="quick" data-action="yes"><span class="icon">☏</span><b>SHOULD I SAY YES?</b><small>help me decide</small></button>
      <button class="quick" data-action="rewrite"><span class="icon">✎</span><b>REWRITE THIS FOR ME</b><small>make it clear, not cringe</small></button>
      <button class="quick" data-action="urgent"><span class="icon">⌕</span><b>IS THIS ACTUALLY URGENT?</b><small>let's be real</small></button>
    </div>

    <section class="card challenge">
      <span class="challenge-kicker">TODAY’S BOUNDARY CHALLENGE</span>
      <h3>Leave one message until tomorrow that doesn’t need answering today.</h3>
      <p>+25 main character energy ⚡</p>
      <button id="dailyChallenge" class="${state.challengeDone?'done':''}">${state.challengeDone?'✓ DONE. ICONIC.':'MARK IT DONE'}</button>
    </section>

    <section class="card brain-card">
      <div><div class="brain-label">YOUR MILLENNIAL BRAIN:</div><div class="brain-copy">They might think I’m not committed.</div></div>
      <div class="divider"></div>
      <div><div class="brain-label gen">YOUR GEN Z CHAMPION:</div><div class="brain-copy">You’ve worked there for six years, Hannah.</div></div>
    </section>`;
}

function championView() {
  return `
    <section class="card">
      <div class="micro">YOUR GEN Z CHAMPION</div>
      <h2 class="hero-copy">Corporate nonsense in.<br><span style="color:var(--acid)">Boundaries out.</span></h2>
      ${championStatusControl()}
      <p class="subcopy">Prototype mode: responses are simulated locally, so you can test the interaction without an AI connection.</p>
      <span class="pill">${championRemaining()} / ${CHAMPION_DAILY_LIMIT} reads left today</span>
      <div class="chat-list" id="chatList">
        ${state.messages.map(m => {
          const isLimit = m.role === 'bot' && m.text === CHAMPION_LIMIT_MESSAGE;
          return `<div class="bubble ${m.role} ${isLimit ? 'limit-bubble' : ''}">${m.role==='bot' ? `${isLimit ? '<span class="limit-chip">STATUS: OFFLINE UNTIL TOMORROW</span>' : ''}<b>Champion:</b><br>` : ''}${escapeHtml(m.text)}</div>`;
        }).join('')}
      </div>
      <div class="stack">
        <textarea class="screen-input" id="championInput" rows="3" placeholder="${championIsOffline() ? 'Champion is offline. Trust the boundary muscle you’re building.' : 'E.g. ‘My manager asked if I can just squeeze in one more thing…’'}" ${championIsOffline() ? 'disabled' : ''}></textarea>
        <button class="primary ${championIsOffline() ? 'offline-button' : ''}" id="championSend" ${championIsOffline() ? 'disabled' : ''}>${championIsOffline() ? '○ OFFLINE • BACK TOMORROW' : 'GET THE GEN Z READ →'}</button>
      </div>
    </section>`;
}

function challengesView() {
  return `
    <section class="card">
      <div class="micro">BOUNDARY BOOTCAMP</div>
      <h2 class="hero-copy">Tiny acts of<br><span style="color:var(--acid)">professional rebellion.</span></h2>
      <p class="subcopy">Do the useful bits of Gen Z work culture without getting fired in the process.</p>
    </section>
    <section class="challenge-list">
      ${challengeBank.map(([id, emoji, title, copy]) => {
        const done = state.completedChallenges.includes(id);
        return `<article class="challenge-item ${done?'complete':''}"><div class="emoji">${emoji}</div><div><h3>${title}</h3><p>${copy}</p></div><button data-challenge="${id}">${done?'✓':'+'}</button></article>`;
      }).join('')}
    </section>`;
}

function streaksView() {
  const boundaryScore = Math.min(100, 42 + state.streak*4 + state.completedChallenges.length*5 + (state.challengeDone?5:0));
  return `
    <section class="card">
      <div class="micro">YOUR BOUNDARY ERA</div>
      <h2 class="hero-copy">${state.streak} days of choosing<br><span style="color:var(--acid)">yourself occasionally.</span></h2>
      <p class="subcopy">Which, culturally speaking, is huge.</p>
    </section>
    <section class="card">
      <div class="streak-stat"><span>No people pleasing</span><strong>${state.streak}d</strong></div>
      <div class="streak-stat"><span>Personal best</span><strong>${state.best}d</strong></div>
      <div class="streak-stat"><span>Boundary score</span><strong>${boundaryScore}</strong></div>
      <div class="streak-stat"><span>Main character energy</span><strong>${state.energy}</strong></div>
    </section>
    <section class="card">
      <h2 class="section-title">Streak rules</h2>
      <p class="subcopy">A day counts when you log a boundary win. Saying no, not over-explaining, protecting lunch, asking someone to prioritise, or simply not replying at 22:14 all qualify.</p>
      <div class="button-row"><button class="primary" id="logWin">LOG A BOUNDARY WIN</button><button class="secondary" id="resetDemo">RESET DEMO</button></div>
    </section>`;
}

function youView() {
  const score = Math.min(100, 42 + state.streak*4 + state.completedChallenges.length*5 + (state.challengeDone?5:0));
  return `
    <section class="card" style="display:flex;gap:18px;align-items:center">
      <div class="profile-ring"></div>
      <div><div class="micro">YOUR CURRENT ERA</div><h2 class="section-title" style="margin-top:5px">Recovering<br>people pleaser</h2><span class="pill">Boundary score ${score}</span></div>
    </section>
    <section class="card">
      <h2 class="section-title">Your work settings</h2>
      <div class="setting-row"><span>After-hours replies</span><span class="pill">not my circus</span></div>
      <div class="setting-row"><span>Meeting tolerance</span><span class="pill">low</span></div>
      <div class="setting-row"><span>Annual leave guilt</span><span class="pill">deprogramming</span></div>
      <div class="setting-row"><span>Corporate jargon</span><span class="pill">allergic</span></div>
    </section>
    <section class="card">
      <h2 class="section-title">Prototype notes</h2>
      <p class="subcopy">This build stores your demo state on this device using local storage. A production version could connect the Champion to an AI model, add authentication, notifications, streak rules and personalised coaching.</p>
    </section>`;
}

function render() {
  root.innerHTML = state.view === 'home' ? homeView() : state.view === 'champion' ? championView() : state.view === 'challenges' ? challengesView() : state.view === 'streaks' ? streaksView() : youView();
  bindView();
}

function escapeHtml(s='') { return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function championReply(text) {
  const t = text.toLowerCase();
  if (/7pm|8pm|9pm|10pm|after hours|tonight|evening|weekend/.test(t)) return "Unless there’s a genuine emergency or you’re explicitly on call, this can probably wait until your working hours. Your employment contract did not come with 24/7 emotional availability.";
  if (/urgent|asap|immediately|today/.test(t)) return "Ask what breaks if this waits. If nobody can name a real consequence, congratulations: you have discovered fake urgency.";
  if (/sorry|apolog/.test(t)) return "You may be about to apologise for something that requires information, not remorse. Try removing ‘sorry’ and send the sentence again.";
  if (/meeting|call|calendar/.test(t)) return "Ask: what decision needs me in the room? If the answer is ‘visibility’, that is not a meeting agenda.";
  if (/can you|favour|favor|extra|squeeze|quick/.test(t)) return "Before saying yes, ask what should move. Capacity is maths, not a personality test.";
  if (/holiday|leave|pto|annual leave|vacation/.test(t)) return "Take the leave. Your out-of-office is information, not an apology letter.";
  return "My read: separate the actual request from the fear of disappointing someone. What is being asked, when is it genuinely due, and what would need to move for you to do it? Start there.";
}

function openAction(type) {
  if (type === 'rewrite') {
    modalContent.innerHTML = `<h2>Rewrite this for me</h2><p>Paste the over-explained version. We’ll remove the apology tour.</p><textarea id="rewriteText" placeholder="Sorry to bother you, I just wondered if maybe…"></textarea><div class="button-row"><button type="button" class="primary" id="doRewrite">DE-MILLENNIALISE IT</button></div><div id="actionAnswer"></div>`;
    modal.showModal();
    $('#doRewrite').onclick = () => {
      const raw = $('#rewriteText').value.trim(); if (!raw) return toast('Give me the corporate essay first.');
      let cleaned = raw.replace(/\b(sorry to bother you|sorry for bothering you|sorry|just wanted to|just wondering if|I was just wondering if|maybe|if that’s okay|if that's okay)\b[,.]?/gi, '').replace(/\s{2,}/g,' ').trim();
      cleaned = cleaned.charAt(0).toUpperCase()+cleaned.slice(1);
      $('#actionAnswer').innerHTML = `<div class="answer"><strong>Gen Z edit:</strong><br>${escapeHtml(cleaned || 'Could you confirm the priority and deadline for this?')}</div>`;
    };
  }
  if (type === 'urgent') {
    modalContent.innerHTML = `<h2>Is this actually urgent?</h2><p>Paste the request. Fake urgency hates follow-up questions.</p><textarea id="urgentText" placeholder="Need this ASAP!!!"></textarea><div class="button-row"><button type="button" class="primary" id="doUrgent">REALITY CHECK</button></div><div id="actionAnswer"></div>`;
    modal.showModal();
    $('#doUrgent').onclick = () => {
      const v=$('#urgentText').value.trim(); if(!v) return toast('Paste the “urgent” thing first.');
      const high=/client live|production|safety|legal deadline|payroll|outage|incident|today by|deadline today/i.test(v);
      $('#actionAnswer').innerHTML=`<div class="answer"><strong>${high?'Possibly genuinely urgent.':'Urgency status: suspicious.'}</strong><br>${high?'Confirm the consequence, owner and exact deadline before dropping everything.':'Ask: “What is the impact if this is completed tomorrow?” If nobody can answer, keep your nervous system out of it.'}</div>`;
    };
  }
  if (type === 'yes') {
    modalContent.innerHTML = `<h2>Should I say yes?</h2><p>Three questions. No martyrdom.</p><div class="stack"><label>Is this part of your role?<select id="roleQ" class="screen-input"><option value="yes">Yes</option><option value="sorta">Sort of</option><option value="no">No</option></select></label><label>Do you have capacity without dropping something?<select id="capQ" class="screen-input"><option value="yes">Yes</option><option value="no">No</option></select></label><label>Will saying yes help something you actually care about?<select id="careQ" class="screen-input"><option value="yes">Yes</option><option value="no">No</option></select></label></div><div class="button-row"><button type="button" class="primary" id="doYes">GIVE ME THE VERDICT</button></div><div id="actionAnswer"></div>`;
    modal.showModal();
    $('#doYes').onclick=()=>{
      const role=$('#roleQ').value, cap=$('#capQ').value, care=$('#careQ').value;
      let out = cap==='no' ? "Not yet. Ask what should be deprioritised before you accept it." : (role==='no' && care==='no') ? "That sounds like somebody else’s opportunity to grow." : "You can say yes, but give it a boundary: scope, deadline and what success actually means.";
      $('#actionAnswer').innerHTML=`<div class="answer"><strong>Verdict:</strong><br>${out}</div>`;
    };
  }
}

function bindView() {
  $$('[data-mood]').forEach(btn => btn.onclick = () => { state.mood=btn.dataset.mood; save(); render(); toast({fine:'Protect this energy.',much:'Noted. We reduce chaos.',urgent:'Fake urgency detector: ON.',done:'The laptop is on thin ice.'}[state.mood]); });
  $$('[data-action]').forEach(btn => btn.onclick = () => openAction(btn.dataset.action));
  const statusToggle=$('#championStatusToggle');
  const statusMenu=$('#championStatusMenu');
  if(statusToggle && statusMenu) statusToggle.onclick=()=>{
    const opening=statusMenu.hidden;
    statusMenu.hidden=!opening;
    statusToggle.setAttribute('aria-expanded', String(opening));
  };
  const dc=$('#dailyChallenge'); if(dc) dc.onclick=()=>{ if(!state.challengeDone){state.challengeDone=true;state.energy+=25;state.streak+=1;state.best=Math.max(state.best,state.streak);save();render();toast('+25 main character energy');} };
  const hs=$('#homeSend'); if(hs) hs.onclick=()=>{const i=$('#homeChat'); const text=i.value.trim(); if(!text)return; const result=askChampion(text); setView('champion'); if(result.justLoggedOff || !result.answered) toast(CHAMPION_STATUS_TOAST, 'status');};
  const cs=$('#championSend'); if(cs) cs.onclick=()=>{const i=$('#championInput'); const text=i.value.trim(); if(!text)return toast('Tell me what they did.'); const result=askChampion(text); render(); if(result.justLoggedOff || !result.answered) toast(CHAMPION_STATUS_TOAST, 'status'); setTimeout(()=>{const c=$('#chatList'); if(c)c.scrollTop=c.scrollHeight;},20);};
  $$('[data-challenge]').forEach(b=>b.onclick=()=>{const id=b.dataset.challenge; if(state.completedChallenges.includes(id)){state.completedChallenges=state.completedChallenges.filter(x=>x!==id);}else{state.completedChallenges.push(id);state.energy+=15;} save();render();});
  const lw=$('#logWin'); if(lw) lw.onclick=()=>{state.streak+=1;state.best=Math.max(state.best,state.streak);state.energy+=10;save();render();toast('Boundary win logged 🔥');};
  const rd=$('#resetDemo'); if(rd) rd.onclick=()=>{localStorage.removeItem('wlgenz-state');state={...defaultState,messages:[...defaultState.messages],championDay:localDayKey(),championCount:0};render();toast('Demo reset');};
}

$$('.nav-item').forEach(btn => btn.onclick = () => setView(btn.dataset.view));
$('#championBadge').onclick = () => setView('champion');

refreshChampionAllowance();
render();
