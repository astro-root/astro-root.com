const firebaseConfig = {
  apiKey: "AIzaSyA3xtGLVJwij2BTiiOk7DsNeF9hIOuZCyI",
  authDomain: "q-room-fe8a6.firebaseapp.com",
  databaseURL: "https://q-room-fe8a6-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "q-room-fe8a6",
  storageBucket: "q-room-fe8a6.firebasestorage.app",
  messagingSenderId: "151049149394",
  appId: "1:151049149394:web:7a3ea6406454f6a87d460b"
};

let db = null, myId = null, rId = null, rRef = null, rCb = null;
let roomData = null;
let chatRef = null, chatCb = null, chatOpen = false, chatUnread = 0, lastSeenMsgTs = 0;
let serverTimeOffset = 0;

const STAMPS = ['👍','🎉','😂','🔥','😮','💪','🤔','👏','❤️','😭','✨','🙏'];

const DEF_CONF = {
  survival: {m:5, n:2}, free: {}, newyork: {m:1, n:1, win:10, lose:-10}, rentou: {m:5, n:2, mode:'fast'}, updown: {m:5, n:2},
  by: {m:5, n:3}, freeze: {m:5, n:0}, m_n_rest: {m:5, n:3},
  swedish: {m:10, n:10}, ren_wrong: {m:5, n:3},
  divide: {init:10, add:10, win:100}, combo: {win:10, lose:3},
  attack_surv: {life:20, dmg_to_oth:1, heal:0, dmg_to_me:2, surv:1},
  lucky: {win:50, lose:-20, max:10}, spiral: {up:1, down:1, top_req:3, btm_req:3},
  time_race: {limit:5, correct_pt:1, wrong_pt:1},
  board_quiz: {m:10, n:3, x:1, y:10, z:5, a:15}
};

window.onload = () => {
  const params = new URLSearchParams(window.location.search);
  const qRoom = params.get('r');
  const pathRoom = window.location.pathname.match(/\/q-room\/(\d{5})/);
  const roomId = qRoom || (pathRoom && pathRoom[1]);
  if(roomId) document.getElementById('in-room').value = roomId;
  const savedName = localStorage.getItem('qr_name');
  if(savedName) document.getElementById('in-name').value = savedName;
};

function initFB() {
  if(!db){ 
    try {
      firebase.initializeApp(firebaseConfig); 
      db = firebase.database(); 
      db.ref('.info/serverTimeOffset').on('value', snap => {
        serverTimeOffset = snap.val() || 0;
      });
    } catch(e) {
      console.error(e);
      throw new Error("データベース接続に失敗しました。");
    }
  }
}

function getServerTime() {
  return Date.now() + serverTimeOffset;
}

function getMyId() {
  let id = localStorage.getItem('qr_id');
  if(!id){ id = 'p_'+Date.now().toString(36); localStorage.setItem('qr_id',id); }
  return id;
}

function err(m){ const e=document.getElementById('top-err'); e.innerText=m; e.style.display='block'; setTimeout(()=>e.style.display='none',3000); }
function toast(m){ const t=document.getElementById('toast'); t.innerText=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2500); }
function show(id){ 
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); 
  document.getElementById('screen-'+id).classList.add('active');
}

async function handleCreate() {
  try {
    initFB();
    const n = document.getElementById('in-name').value.trim();
    const r = document.getElementById('in-room').value.trim() || String(Math.floor(10000+Math.random()*90000));
    if(!n) return err('名前を入力してください');
    if(!/^\d{5}$/.test(r)) return err('IDは5桁の数字です');

    const s = await db.ref('rooms/'+r).once('value');
    if(s.exists()) {
      const d = s.val();
      const players = d.players || {};
      const hasPlayers = Object.keys(players).length > 0;
      if(hasPlayers) return err('そのIDは使用中です');
      const lastActive = d.lastActiveAt || d.createdAt || 0;
      if(Date.now() - lastActive < 5*60*1000) return err('そのIDは使用中です');
      await db.ref('rooms/'+r).remove();
    }

    localStorage.setItem('qr_name', n);
    myId = getMyId(); rId = r;
    await db.ref('rooms/'+r).set({
      status: 'playing', rule: 'survival', conf: DEF_CONF.survival,
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      lastActiveAt: firebase.database.ServerValue.TIMESTAMP,
      players: { [myId]: newPlayer(n) }
    });
    enterRoom(true, n);
  } catch(e) {
    console.error(e);
    err('エラーが発生しました。通信状態を確認してください。');
  }
}

async function handleJoin() {
  try {
    initFB();
    const n = document.getElementById('in-name').value.trim();
    const r = document.getElementById('in-room').value.trim();
    if(!n) return err('名前を入力してください');
    if(!/^\d{5}$/.test(r)) return err('IDは5桁の数字です');

    const s = await db.ref('rooms/'+r).once('value');
    if(!s.exists()) return err('部屋が見つかりません');

    const d = s.val();
    const players = d.players || {};
    const hasPlayers = Object.keys(players).length > 0;
    if(!hasPlayers) {
      const lastActive = d.lastActiveAt || d.createdAt || 0;
      if(Date.now() - lastActive >= 5*60*1000) return err('このIDは期限切れです（5分以上誰もいませんでした）');
    }

    localStorage.setItem('qr_name', n);
    myId = getMyId(); rId = r;
    if(!players[myId]) await db.ref(`rooms/${r}/players/${myId}`).set(newPlayer(n));
    enterRoom(false, n);
  } catch(e) {
    console.error(e);
    err('エラーが発生しました。通信状態を確認してください。');
  }
}

function newPlayer(name) {
  return { name, st: 'active', c:0, w:0, sc:0, rst:0, str:0, adv:0, joined: Date.now(), statsAt: Date.now(), winAt: 0, hist: [] };
}

function enterRoom(isCreate=false, playerName='') {
  try {
    if (window.location.protocol !== 'file:') {
      const base = window.location.pathname.replace(/\/q-room\/.*/, '/q-room/').replace(/([^/])$/, '$1/');
      window.history.replaceState({}, '', `${base}?r=${rId}`);
    }
  } catch(e) {
    console.warn("History API replaced failed.");
  }

  db.ref(`rooms/${rId}/lastActiveAt`).set(firebase.database.ServerValue.TIMESTAMP);

  const playerRef = db.ref(`rooms/${rId}/players/${myId}`);
  db.ref(`rooms/${rId}/lastActiveAt`).onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);

  document.getElementById('game-rid').innerText = rId;
  show('room');
  showRoomInfo(isCreate);
  initChat(playerName);
  initTimerListener();

  if(rRef) rRef.off('value', rCb);
  rRef = db.ref('rooms/'+rId);
  rCb = rRef.on('value', snap => {
    roomData = snap.val();
    if(!roomData) return leaveRoom();
    if(roomData.status === 'finished') return renderResult();
    
    show('room');
    
    const r = roomData.rule;
    document.getElementById('sel-rule').value = r;
    document.getElementById('game-rule').innerText = document.getElementById('sel-rule').options[document.getElementById('sel-rule').selectedIndex].text;
    changeRuleUI(true);
    renderPlayers();
    
    if(r !== 'board_quiz') {
      const hostBtn = document.getElementById('btn-board-host');
      if(hostBtn) hostBtn.remove();
    }
    
    const me = roomData.players && roomData.players[myId];
    document.getElementById('btn-undo').disabled = !(me && me.hist && me.hist.length > 0);
  });
}

async function leaveRoom() {
  if(rRef) { rRef.off('value', rCb); rRef = null; }
  if(chatRef) { chatRef.off('child_added', chatCb); chatRef = null; }
  if(db && rId && myId) {
    const myName = getMyName();
    await pushSysMsg(`${myName} が退室しました`);
    const playerRef = db.ref(`rooms/${rId}/players/${myId}`);
    await playerRef.remove();
    await db.ref(`rooms/${rId}/lastActiveAt`).set(firebase.database.ServerValue.TIMESTAMP);
  }
  window.location.href = 'https://astro-root.com/q-room/';
}

async function backToRoom() {
  await db.ref(`rooms/${rId}/status`).set('playing');
}

function openModal(){ document.getElementById('modal').classList.add('active'); }
function closeModal(){ document.getElementById('modal').classList.remove('active'); updateConf(); }

function openFeedback(){ document.getElementById('modal-feedback').classList.add('active'); }
function closeFeedback(){ document.getElementById('modal-feedback').classList.remove('active'); }

function getRoomUrl() {
  if(window.location.protocol === 'file:') return `https://astro-root.com/q-room/?r=${rId}`;
  const base = window.location.origin + window.location.pathname.replace(/\/q-room\/.*/, '/q-room/').replace(/([^/])$/, '$1/');
  return `${base}?r=${rId}`;
}

function showRoomInfo(isCreate) {
  document.getElementById('room-info-title').innerText = isCreate ? 'ROOM CREATED' : 'ROOM JOINED';
  document.getElementById('share-room-id').innerText = rId;
  const url = getRoomUrl();
  document.getElementById('share-room-url').innerText = url;
  document.getElementById('btn-native-share').style.display = (navigator.share ? 'flex' : 'none');
  document.getElementById('modal-room-info').classList.add('active');
}

function closeRoomInfo() { document.getElementById('modal-room-info').classList.remove('active'); }

function copyShareId() {
  navigator.clipboard.writeText(rId);
  const btn = document.getElementById('btn-copy-id');
  btn.innerText = 'COPIED!'; btn.classList.add('copied');
  setTimeout(() => { btn.innerText = 'COPY'; btn.classList.remove('copied'); }, 2000);
}

function copyShareUrl() {
  navigator.clipboard.writeText(getRoomUrl());
  const btn = document.getElementById('btn-copy-url');
  btn.innerText = 'COPIED!'; btn.classList.add('copied');
  setTimeout(() => { btn.innerText = 'COPY'; btn.classList.remove('copied'); }, 2000);
}

function nativeShare() {
  if(!navigator.share) return;
  navigator.share({
    title: 'Q-Room クイズ対戦しよう！',
    text: `🎮 Q-Roomでクイズ対戦しよう！\nRoom ID: ${rId}\n名前を入力して参加してね👇`,
    url: getRoomUrl()
  }).catch(() => {});
}

function changeRuleUI(skipRender=false) {
  const r = document.getElementById('sel-rule').value;
  const c = (roomData && roomData.rule === r && roomData.conf) ? roomData.conf : DEF_CONF[r];
  let h = '';
  const mkn = (id,lbl,v) => `<div class="field"><label>${lbl}</label><input type="number" id="c_${id}" value="${v !== undefined ? v : ''}"></div>`;
  const mks = (id,lbl,v,opts) => `<div class="field"><label>${lbl}</label><select id="c_${id}">${opts.map(o=>`<option value="${o.v}" ${v===o.v?'selected':''}>${o.l}</option>`).join('')}</select></div>`;
  
  if(r==='survival'||r==='updown'||r==='ren_wrong') h = `<div class="s-grid">${mkn('m','勝ち抜け',c.m)}${mkn('n','失格',c.n)}</div>`;
  else if(r==='rentou') h = `<div class="s-grid">${mkn('m','勝ち抜け',c.m)}${mkn('n','失格',c.n)}</div>${mks('mode','連答モード',c.mode||'fast',[{v:'fast',l:'加速'},{v:'const',l:'等速'}])}`;
  else if(r==='free') h = '';
  else if(r==='newyork') h = `<div class="s-grid">${mkn('m','正解加点',c.m)}${mkn('n','誤答減点',c.n)}</div><div class="s-grid">${mkn('win','勝ち抜け',c.win)}${mkn('lose','失格',c.lose)}</div>`;
  else if(r==='by') h = `<div class="s-grid">${mkn('m','初期誤答pt/定数',c.m)}${mkn('n','失格回数',c.n)}</div>`;
  else if(r==='freeze'||r==='m_n_rest') h = `<div class="s-grid">${mkn('m','勝ち抜け',c.m)}${mkn('n',r==='freeze'?'失格':'休み数',c.n)}</div>`;
  else if(r==='swedish') h = `<div class="s-grid">${mkn('m','勝ち抜け',c.m)}${mkn('n','失格×数',c.n)}</div>`;
  else if(r==='divide') h = `<div class="s-grid">${mkn('init','初期値',c.init)}${mkn('add','正解加点',c.add)}</div><div class="field">${mkn('win','勝ち抜け',c.win)}</div>`;
  else if(r==='combo') h = `<div class="s-grid">${mkn('win','勝ち抜け',c.win)}${mkn('lose','失格',c.lose)}</div>`;
  else if(r==='attack_surv') h = `<div class="s-grid">${mkn('life','初期ライフ',c.life)}${mkn('dmg_to_oth','自正解時他減',c.dmg_to_oth)}${mkn('heal','自正解時自加',c.heal)}${mkn('dmg_to_me','自誤時自減',c.dmg_to_me)}</div><div class="field">${mkn('surv','終了人数',c.surv)}</div>`;
  else if(r==='lucky') h = `<div class="s-grid">${mkn('win','勝ち抜け',c.win)}${mkn('lose','失格',c.lose)}</div><div class="field">${mkn('max','乱数最大',c.max)}</div>`;
  else if(r==='spiral') h = `<div class="s-grid">${mkn('up','正解上昇',c.up)}${mkn('down','誤答下降',c.down)}${mkn('top_req','最上位要正解',c.top_req)}${mkn('btm_req','最下位要誤答',c.btm_req)}</div>`;
  else if(r==='time_race') h = `<div class="s-grid">${mkn('limit','制限時間(分)',c.limit)}${mkn('correct_pt','正解 +pt',c.correct_pt)}${mkn('wrong_pt','誤答 -pt',c.wrong_pt)}</div>`;
  else if(r==='board_quiz') h = `
    <div class="s-grid">${mkn('m','正解 +pt',c.m)}${mkn('n','誤答 -pt',c.n)}</div>
    <div class="s-grid">${mkn('x','少数正解閾値(人以下)',c.x)}${mkn('y','少数ボーナス +pt',c.y)}</div>
    <div class="s-grid">${mkn('a','ボタン押し正解 +pt',c.a)}${mkn('z','ボタン押し誤答 -pt',c.z)}</div>
    <div style="margin-top:4px;padding:12px 16px;background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.25);border-radius:12px;font-size:0.82rem;color:var(--text-muted);line-height:1.6;">
      ① 司会者は「🎙 HOST」ボタンで担当を設定<br>
      ② プレイヤーは回答を入力 → 「📝 提出」<br>
      ③ 司会者が「解答オープン」→ 各プレイヤーを◯/✕判定<br>
      ④「次の問題」で回答をリセット・少数正解ボーナスを適用
    </div>`;

  
  document.getElementById('config-area').innerHTML = h;
  if(!skipRender && roomData && r !== roomData.rule) {
    db.ref('rooms/'+rId).update({rule: r, conf: DEF_CONF[r]});
    if(r === 'time_race') {
      const lm = (DEF_CONF.time_race.limit) * 60 * 1000;
      db.ref(`rooms/${rId}/timer`).set({state:'idle', limitMs:lm, remaining:lm, startAt:null, cdStartAt:null});
    }
    if(r === 'board_quiz') {
      db.ref(`rooms/${rId}/board_phase`).set('input');
      db.ref(`rooms/${rId}/board_host`).remove();
    }
  }
}

function updateConf() {
  if(!roomData) return;
  let nc = {};
  document.querySelectorAll('#config-area input').forEach(el => nc[el.id.replace('c_','')] = parseInt(el.value)||0);
  document.querySelectorAll('#config-area select').forEach(el => nc[el.id.replace('c_','')] = el.value);
  if(Object.keys(nc).length > 0) {
    db.ref(`rooms/${rId}/conf`).update(nc);
    if(roomData.rule === 'time_race' && nc.limit !== undefined) {
      const limitMs = nc.limit * 60 * 1000;
      db.ref(`rooms/${rId}/timer`).transaction(cur => {
        if(!cur) return cur;
        if(cur.limitMs !== limitMs) {
          const oldLimit = cur.limitMs || limitMs;
          cur.limitMs = limitMs;
          if(cur.state === 'idle') {
            cur.remaining = limitMs;
          } else if(cur.state === 'paused') {
            const elapsed = oldLimit - (cur.remaining || oldLimit);
            cur.remaining = Math.max(0, limitMs - Math.max(0, elapsed));
          }
        }
        return cur;
      });
    }
  }
}

function sortPlayers(pl, rule) {
  return Object.entries(pl).sort((a,b) => {
    const p1=a[1], p2=b[1];
    const rs = v=>v==='win'?0:v==='active'?1:v==='lose'?2:3;
    if(rs(p1.st) !== rs(p2.st)) return rs(p1.st) - rs(p2.st);
    if(p1.st === 'win' && p2.st === 'win') return (p1.winAt||0) - (p2.winAt||0);
    let m1=p1.sc||0, m2=p2.sc||0;
    if(['survival','free','freeze','m_n_rest','swedish','ren_wrong'].includes(rule)){ m1=p1.c; m2=p2.c; }
    else if(rule==='by') { m1=p1.sc; m2=p2.sc; }
    else if(rule==='board_quiz') { m1=p1.sc||0; m2=p2.sc||0; }
    if(m1 !== m2) return m2 - m1;
    if(p1.w !== p2.w) return p1.w - p2.w;
    return (p1.statsAt||p1.joined||0) - (p2.statsAt||p2.joined||0);
  });
}

function calcRanks(sorted) {
  const ranks = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      ranks.push(1);
    } else {
      const prev = sorted[i-1][1];
      const cur  = sorted[i][1];
      if (prev.st === cur.st && prev.c === cur.c && prev.w === cur.w) {
        ranks.push(ranks[i-1]);
      } else {
        ranks.push(i + 1);
      }
    }
  }
  return ranks;
}

function renderPlayers() {
  const pl = roomData.players || {};
  const r = roomData.rule;
  const sorted = sortPlayers(pl, r);
  
  document.getElementById('timer-panel').classList.toggle('visible', r === 'time_race');
  
  const isHostMe = r === 'board_quiz' && roomData.board_host === myId;
  const boardPhase = roomData.board_phase || 'input';
  
  let h = '';
  const ranks = calcRanks(sorted);
  sorted.forEach(([id, p], idx) => {
    const isMe = id===myId;
    let cls = p.st==='win'?'win':p.st==='lose'?'lose':p.st==='spec'?'spec':'';
    if(isMe && !cls) cls = 'me';
    let sv = p.sc||0;
    if(['survival','free','freeze','m_n_rest','swedish','ren_wrong'].includes(r)) sv = p.c;
    else if(r==='by') sv = p.sc||0;
    else if(r==='time_race') sv = p.sc||0;
    else if(r==='board_quiz') sv = p.sc||0;
    
    let wtxt = p.w;
    if(r==='swedish'||r==='ren_wrong') wtxt = p.w + '×';
    
    let sub = '';
    if(p.rst > 0) sub += `<span style="color:var(--yellow)">休:${p.rst}</span> `;
    if(p.str > 0) sub += `<span style="color:var(--cyan)">連:${p.str}</span> `;
    if(p.adv > 0) sub += `<span style="color:var(--red)">DAdv!</span> `;
    if(r==='board_quiz' && roomData.board_host===id) sub += `<span style="color:var(--magenta)">🎙HOST</span> `;
    
    let boardSection = '';
    if(r === 'board_quiz') {
      if(isHostMe && id !== myId && p.st === 'active') {
        if(boardPhase === 'open') {
          const ans = p.board_ans || '';
          const buzzMark = p.board_btn ? ' <span class="board-buzz-mark">🔔BUZZ</span>' : '';
          const judged = p.board_judged;
          if(!judged) {
            boardSection = `
              <div class="board-row">
                <div class="board-ans-host">${esc(ans) || '<em style="opacity:.4">（未回答）</em>'}${buzzMark}</div>
                <div class="board-judge-btns">
                  <button class="board-judge-o" onclick="boardJudge('${id}',true)">◯</button>
                  <button class="board-judge-x" onclick="boardJudge('${id}',false)">✕</button>
                </div>
              </div>`;
          } else {
            boardSection = `
              <div class="board-row">
                <div class="board-ans-host ${judged==='correct'?'board-judged-correct':'board-judged-wrong'}">${esc(ans) || '（未回答）'}${buzzMark} → ${judged==='correct'?'◯':'✕'}</div>
              </div>`;
          }
        } else {
          const submitted = !!(p.board_ans);
          boardSection = `<div class="board-row"><div class="board-phase-hint">${submitted ? '✅ 回答済み' : '⏳ 未回答'}</div></div>`;
        }
      } else if(!isHostMe && isMe && p.st === 'active') {
        const myAns = p.board_ans || '';
        const buzOn = !!p.board_btn;
        boardSection = `<div class="board-row board-my-row">
          <span class="board-my-ans">${myAns ? esc(myAns) : '<em style="opacity:.4">未提出</em>'}</span>
          ${buzOn ? '<span class="board-buzz-on">🔔 BUZZ中</span>' : ''}
          ${p.board_judged==='correct'?'<span class="board-result-o">◯</span>':p.board_judged==='wrong'?'<span class="board-result-x">✕</span>':''}
        </div>`;
      } else if(!isHostMe && !isMe && boardPhase === 'open') {
        const ans = p.board_ans || '';
        const judged = p.board_judged;
        boardSection = `<div class="board-row">
          <div class="board-ans-open">${esc(ans) || '<em style="opacity:.4">（未回答）</em>'}</div>
          ${judged==='correct'?'<span class="board-result-o">◯</span>':judged==='wrong'?'<span class="board-result-x">✕</span>':''}
        </div>`;
      }
    }
    
    h += `
    <div class="pcard ${cls}">
      <div class="rank-num">${ranks[idx]}</div>
      <div class="p-main">
        <div class="p-name">${esc(p.name)} ${isMe?'<span class="badge b-you">YOU</span>':''}</div>
        <div class="p-stats">
          <span class="c">◯ ${p.c}</span>
          <span class="w">✕ ${wtxt}</span>
        </div>
        ${boardSection}
      </div>
      <div class="score-box">
        <div class="score-val">${sv}</div>
        <div class="score-sub">${p.st==='win'?'<span class="st-win">WIN</span>':p.st==='lose'?'<span class="st-lose">LOSE</span>':sub}</div>
      </div>
    </div>`;
  });
  document.getElementById('plist').innerHTML = h;
  
  const me = pl[myId];
  if(me) {
    document.getElementById('btn-role').innerText = me.st==='spec'?'🎮 JOIN':'👀 WATCH';
    const ox = document.getElementById('ox-grid');
    if(r === 'board_quiz') {
      renderBoardQuizPanel(me, boardPhase, isHostMe);
    } else {
      if(me.st==='spec' || me.st==='win' || me.st==='lose') ox.style.display = 'none';
      else {
        ox.style.display = 'grid';
        if(me.rst > 0) ox.innerHTML = `<button class="ox-btn btn-rest" onclick="sendAction('rest')">休み消化 (${me.rst})</button>`;
        else ox.innerHTML = `<button class="ox-btn btn-o" onclick="sendAction('correct')">◯</button><button class="ox-btn btn-x" onclick="sendAction('wrong')">✕</button>`;
      }
    }
  }
}

let boardAnsDebounce = null;

function renderBoardQuizPanel(me, boardPhase, isHostMe) {
  const ox = document.getElementById('ox-grid');
  if(isHostMe) {
    ox.style.display = 'grid';
    ox.style.gridTemplateColumns = '1fr';
    if(boardPhase === 'input') {
      ox.innerHTML = `<button class="ox-btn btn-board-open" onclick="boardOpenPhase()">📋 解答オープン</button>`;
    } else {
      ox.innerHTML = `<button class="ox-btn btn-board-next" onclick="boardNextQuestion()">▶ 次の問題</button>`;
    }
  } else if(me.st === 'spec' || me.st === 'win' || me.st === 'lose') {
    ox.style.display = 'none';
    ox.style.gridTemplateColumns = '';
  } else {
    ox.style.display = 'grid';
    ox.style.gridTemplateColumns = '1fr 1fr';
    const buzOn = !!me.board_btn;
    const judged = me.board_judged;
    const currentAns = me.board_ans || '';
    if(judged) {
      ox.innerHTML = `<div class="board-judged-msg" style="grid-column:1/-1">${judged==='correct'?'◯ 正解！':'✕ 不正解'}</div>`;
    } else {
      ox.innerHTML = `
        <div class="board-input-wrap" style="grid-column:1/-1">
          <input type="text" id="board-ans-input" class="board-ans-field" placeholder="回答を入力…" value="${esc(currentAns)}" maxlength="80" autocomplete="off"
            oninput="boardDebouncedUpdate(this.value)"
            onkeydown="if(event.key==='Enter')boardSubmitAns()">
        </div>
        <button class="ox-btn btn-board-submit" onclick="boardSubmitAns()">📝 提出</button>
        <button class="ox-btn ${buzOn?'btn-board-buzz-on':'btn-board-buzz'}" onclick="boardToggleBuzz()">${buzOn?'🔔 BUZZ中':'🔔 BUZZ'}</button>`;
    }
  }
  const subActions = document.querySelector('.sub-actions');
  if(subActions) {
    const hostBtn = subActions.querySelector('#btn-board-host');
    if(!hostBtn) {
      const btn = document.createElement('button');
      btn.className = 'sub-btn';
      btn.id = 'btn-board-host';
      btn.onclick = boardSetHost;
      subActions.insertBefore(btn, subActions.firstChild);
    }
    const bh = subActions.querySelector('#btn-board-host');
    const isCurrentHost = roomData.board_host === myId;
    bh.innerText = isCurrentHost ? '🎙 HOST解除' : '🎙 HOSTになる';
  }
}

function boardDebouncedUpdate(val) {
  clearTimeout(boardAnsDebounce);
  boardAnsDebounce = setTimeout(() => {
    if(rId && db) db.ref(`rooms/${rId}/players/${myId}/board_ans`).set(val);
  }, 400);
}

async function boardSubmitAns() {
  const input = document.getElementById('board-ans-input');
  if(!input) return;
  const val = input.value.trim();
  await db.ref(`rooms/${rId}/players/${myId}/board_ans`).set(val);
  toast('📝 提出しました');
}

async function boardToggleBuzz() {
  const me = roomData.players[myId];
  const cur = me.board_btn || false;
  await db.ref(`rooms/${rId}/players/${myId}/board_btn`).set(!cur);
}

async function boardSetHost() {
  const isCurrentHost = roomData.board_host === myId;
  if(isCurrentHost) {
    await db.ref(`rooms/${rId}/board_host`).remove();
    await db.ref(`rooms/${rId}/players/${myId}/st`).set('active');
    toast('ホストを解除しました');
  } else {
    const prevHost = roomData.board_host;
    if(prevHost && roomData.players[prevHost]) {
      await db.ref(`rooms/${rId}/players/${prevHost}/st`).set('active');
    }
    await db.ref(`rooms/${rId}/board_host`).set(myId);
    await db.ref(`rooms/${rId}/players/${myId}/st`).set('spec');
    toast('🎙 ホストになりました');
  }
}

async function boardOpenPhase() {
  if(roomData.board_host !== myId) return;
  await db.ref(`rooms/${rId}/board_phase`).set('open');
  toast('📋 解答オープン！');
}

async function boardJudge(pid, isCorrect) {
  if(roomData.board_host !== myId) return;
  const pData = JSON.parse(JSON.stringify(roomData.players));
  const p = pData[pid];
  if(!p || p.st === 'spec') return;
  const c = roomData.conf || DEF_CONF.board_quiz;
  const mePrev = JSON.stringify({c:p.c, w:p.w, sc:p.sc, st:p.st});
  
  if(isCorrect) {
    p.c++;
    const pts = p.board_btn ? (c.a || 15) : (c.m || 10);
    p.sc = (p.sc || 0) + pts;
    p.board_judged = 'correct';
    p.statsAt = Date.now();
    toast(`◯ ${p.name} +${pts}pt`);
  } else {
    p.w++;
    const pts = p.board_btn ? (c.z || 5) : (c.n || 3);
    p.sc = (p.sc || 0) - pts;
    p.board_judged = 'wrong';
    p.statsAt = Date.now();
    toast(`✕ ${p.name} -${pts}pt`);
  }
  p.hist = p.hist || [];
  p.hist.unshift(mePrev);
  if(p.hist.length > 5) p.hist.length = 5;
  await db.ref(`rooms/${rId}/players`).update(pData);
}

async function boardNextQuestion() {
  if(roomData.board_host !== myId) return;
  if(!confirm('次の問題へ進みますか？（少数正解ボーナスを適用し、回答をリセットします）')) return;
  const pData = JSON.parse(JSON.stringify(roomData.players));
  const c = roomData.conf || DEF_CONF.board_quiz;
  
  const correctPlayers = Object.keys(pData).filter(pid => pData[pid].board_judged === 'correct');
  const threshold = c.x !== undefined ? c.x : 1;
  const bonus = c.y !== undefined ? c.y : 10;
  if(correctPlayers.length > 0 && correctPlayers.length <= threshold) {
    correctPlayers.forEach(pid => {
      pData[pid].sc = (pData[pid].sc || 0) + bonus;
    });
    toast(`🌟 少数正解ボーナス +${bonus}pt（${correctPlayers.length}人）`);
  }
  
  Object.keys(pData).forEach(pid => {
    pData[pid].board_ans = '';
    pData[pid].board_btn = false;
    pData[pid].board_judged = null;
  });
  await db.ref(`rooms/${rId}/players`).update(pData);
  await db.ref(`rooms/${rId}/board_phase`).set('input');
}

async function sendAction(type) {
  if(!roomData || !roomData.players || !roomData.players[myId]) return;
  const pData = JSON.parse(JSON.stringify(roomData.players));
  const me = pData[myId];
  if(me.st !== 'active') return;

  const r = roomData.rule;
  
  if(r === 'time_race') {
    if(!timerData || timerData.state !== 'running') {
      toast('タイマーが動いている間のみ回答できます');
      return;
    }
  }
  
  const mePrev = JSON.stringify({c:me.c, w:me.w, sc:me.sc, rst:me.rst, str:me.str, adv:me.adv, st:me.st});
  
  const c = roomData.conf || DEF_CONF[r];
  
  if(type === 'rest') {
    me.rst--;
  } else if(type === 'correct') {
    me.c++;
    if(r==='survival') { if(me.c >= c.m) me.st='win'; }
    else if(r==='newyork') { me.sc = (me.sc||0) + c.m; if(me.sc >= c.win) me.st='win'; }
    else if(r==='rentou') {
      if (c.mode === 'const') {
        me.sc = (me.sc||0) + (me.str>0?2:1);
        const pStr = me.str;
        me.str = pStr > 0 ? 0 : 1;
        Object.keys(pData).forEach(id => {
          if(id !== myId) pData[id].str = 0;
        });
      } else {
        me.sc = (me.sc||0) + (me.str>0?2:1);
        me.str++;
      }
      if(me.sc>=c.m) me.st='win';
    }
    else if(r==='updown') { me.sc = (me.sc||0) + 1; if(me.sc>=c.m) me.st='win'; }
    else if(r==='by') { me.sc = me.c * (c.m - me.w); if(me.sc >= c.m*c.m) me.st='win'; }
    else if(r==='freeze') { if(me.c >= c.m) me.st='win'; }
    else if(r==='m_n_rest') { if(me.c >= c.m) me.st='win'; }
    else if(r==='swedish') { if(me.c >= c.m) me.st='win'; }
    else if(r==='ren_wrong') { me.adv = 0; if(me.c >= c.m) me.st='win'; }
    else if(r==='divide') { me.sc = (me.sc||c.init)+c.add; if(me.sc>=c.win) me.st='win'; }
    else if(r==='combo') { me.str++; me.sc = (me.sc||0) + me.str; if(me.sc>=c.win) me.st='win'; }
    else if(r==='attack_surv') {
      me.sc = (me.sc||c.life)+c.heal;
      Object.keys(pData).forEach(id => {
        if(id!==myId && pData[id].st==='active') {
          pData[id].sc = (pData[id].sc||c.life)-c.dmg_to_oth;
          if(pData[id].sc<=0) pData[id].st='lose';
        }
      });
    }
    else if(r==='lucky') { me.sc = (me.sc||0) + Math.floor(Math.random()*c.max)+1; if(me.sc>=c.win) me.st='win'; }
    else if(r==='spiral') {
      let maxStep = Math.max(...Object.values(pData).filter(p=>p.st==='active').map(p=>p.sc||0));
      if((me.sc||0) >= maxStep) me.str++; else me.str=0;
      me.sc = (me.sc||0)+c.up;
      if(me.str >= c.top_req) me.st='win';
    }
    else if(r==='time_race') { me.sc = (me.sc||0) + (c.correct_pt||1); }
  } else if(type === 'wrong') {
    me.w++;
    if(r==='survival') { if(c.n > 0 && me.w >= c.n) me.st='lose'; }
    else if(r==='newyork') { me.sc = (me.sc||0) - c.n; if(me.sc <= c.lose) me.st='lose'; }
    else if(r==='rentou') { me.str=0; if(c.n > 0 && me.w >= c.n) me.st='lose'; }
    else if(r==='updown') { me.sc=0; if(c.n > 0 && me.w >= c.n) me.st='lose'; }
    else if(r==='by') { me.sc = me.c * (c.m - me.w); if(c.n > 0 && me.w >= c.n) me.st='lose'; }
    else if(r==='freeze') { me.rst += me.w; if(c.n > 0 && me.w >= c.n) me.st='lose'; }
    else if(r==='m_n_rest') { me.rst += c.n; }
    else if(r==='swedish') {
      const batsu = Math.floor((Math.sqrt(8*me.c+1)-1)/2)+1;
      me.w = (me.w-1)+batsu; 
      if(c.n > 0 && me.w >= c.n) me.st='lose';
    }
    else if(r==='ren_wrong') {
      me.w = (me.w-1) + (me.adv>0?2:1); me.adv=1;
      if(c.n > 0 && me.w >= c.n) me.st='lose';
    }
    else if(r==='divide') {
      me.sc = Math.floor((me.sc||c.init)/me.w);
      if(me.sc < 1) me.st='lose';
    }
    else if(r==='combo') { me.str=0; if(c.lose > 0 && me.w >= c.lose) me.st='lose'; }
    else if(r==='attack_surv') {
      me.sc = (me.sc||c.life)-c.dmg_to_me;
      if(me.sc<=0) me.st='lose';
    }
    else if(r==='lucky') { me.sc = (me.sc||0) - Math.floor(Math.random()*c.max)-1; if(me.sc<=c.lose) me.st='lose'; }
    else if(r==='spiral') {
      let minStep = Math.min(...Object.values(pData).filter(p=>p.st==='active').map(p=>p.sc||0));
      if((me.sc||0) <= minStep) me.adv++; else me.adv=0;
      me.sc = (me.sc||0)-c.down;
      if(me.adv >= c.btm_req) me.st='lose';
    }
    else if(r==='time_race') { me.sc = (me.sc||0) - (c.wrong_pt||1); }
  }

  me.hist = me.hist || [];
  me.hist.unshift(mePrev);
  if(me.hist.length > 5) me.hist.length = 5;

  const prevParsed = JSON.parse(mePrev);
  if (me.c !== prevParsed.c || me.w !== prevParsed.w) {
    me.statsAt = Date.now();
  }
  if (me.st === 'win' && prevParsed.st !== 'win') {
    me.winAt = Date.now();
  }

  await db.ref(`rooms/${rId}/players`).update(pData);
  
  if(r==='attack_surv') {
    const act = Object.values(pData).filter(p=>p.st==='active').length;
    if(act <= c.surv) await db.ref(`rooms/${rId}/status`).set('finished');
  }
}

async function reqUndo() {
  if(!roomData || !roomData.players || !roomData.players[myId]) return;
  const me = roomData.players[myId];
  if(!me.hist || me.hist.length === 0) return;
  
  const hist = [...me.hist];
  const prevState = JSON.parse(hist.shift());
  prevState.hist = hist;
  
  await db.ref(`rooms/${rId}/players/${myId}`).update(prevState);
  toast('↩ UNDO done!');
}

async function toggleRole() {
  const me = roomData.players[myId];
  await db.ref(`rooms/${rId}/players/${myId}/st`).set(me.st==='spec'?'active':'spec');
}

async function resetPoints() {
  if(!confirm('全員のスコアをリセットしますか？')) return;
  const pData = JSON.parse(JSON.stringify(roomData.players));
  
  const c = roomData.conf || {};
  const sc = roomData.rule==='divide' ? (c.init || 10) : roomData.rule==='attack_surv' ? (c.life || 20) : 0;
  
  Object.keys(pData).forEach(k => {
    pData[k] = { ...pData[k], c:0, w:0, sc:sc, rst:0, str:0, adv:0, hist:[], winAt:0, statsAt:Date.now() };
    if(pData[k].st !== 'spec') pData[k].st = 'active';
    if(roomData.rule === 'board_quiz') {
      pData[k].board_ans = '';
      pData[k].board_btn = false;
      pData[k].board_judged = null;
    }
  });
  await db.ref(`rooms/${rId}/players`).set(pData);
  if(roomData.rule === 'time_race') {
    const c = roomData.conf || DEF_CONF.time_race;
    const lm = (c.limit||5) * 60 * 1000;
    await db.ref(`rooms/${rId}/timer`).set({state:'idle', limitMs:lm, remaining:lm, startAt:null, cdStartAt:null});
  }
  closeModal(); toast('リセットしました');
}

async function endGame() {
  if(confirm('ゲームを終了しますか？')) {
    await db.ref(`rooms/${rId}/status`).set('finished');
    closeModal();
  }
}

function renderResult() {
  show('result');
  const pl = roomData.players || {};
  const r = roomData.rule;
  const sorted = sortPlayers(pl, r).filter(x => x[1].st !== 'spec');
  const ranks = calcRanks(sorted);
  let h = '';
  sorted.forEach(([id, p], idx) => {
    let sv = p.sc||0;
    if(['survival','free','freeze','m_n_rest','swedish','ren_wrong'].includes(r)) sv = p.c;
    else if(r==='by') sv = p.sc||0;
    else if(r==='time_race') sv = p.sc||0;
    let mst = p.st==='win'?'WIN':p.st==='lose'?'LOSE':'-';
    h += `
    <div class="pcard ${p.st==='win'?'win':p.st==='lose'?'lose':''}">
      <div class="rank-num">${ranks[idx]}</div>
      <div class="p-main">
        <div class="p-name">${esc(p.name)}</div>
        <div class="p-stats"><span class="c">◯ ${p.c}</span><span class="w">✕ ${p.w}</span></div>
      </div>
      <div class="score-box">
        <div class="score-val">${sv}</div>
        <div class="score-sub" style="color:${p.st==='win'?'var(--green)':p.st==='lose'?'var(--red)':''}">${mst}</div>
      </div>
    </div>`;
  });
  document.getElementById('rlist').innerHTML = h;
}

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function copyUrl(){ 
  navigator.clipboard.writeText(getRoomUrl()); 
  toast('URL copied'); 
}
function copyId(){ navigator.clipboard.writeText(rId); toast('ID copied'); }

function getMyName(fallback='') {
  if(roomData && roomData.players && roomData.players[myId] && roomData.players[myId].name)
    return roomData.players[myId].name;
  return fallback || localStorage.getItem('qr_name') || 'Player';
}

function initChat(playerName='') {
  const stampsEl = document.getElementById('chat-stamps');
  stampsEl.innerHTML = STAMPS.map(s =>
    `<button class="stamp-btn" onclick="sendStamp('${s}')">${s}</button>`
  ).join('');

  if(chatRef) chatRef.off('child_added', chatCb);
  lastSeenMsgTs = Date.now();
  chatRef = db.ref(`rooms/${rId}/chat`).limitToLast(100);
  chatCb = chatRef.on('child_added', snap => {
    const msg = snap.val();
    renderChatMsg(msg);
    if(!chatOpen && msg.ts > lastSeenMsgTs && msg.playerId !== myId) {
      chatUnread++;
      updateChatBadge();
    }
  });

  const name = playerName || getMyName();
  pushSysMsg(`${name} が入室しました`);
}

function toggleChat() {
  chatOpen = !chatOpen;
  document.getElementById('chat-drawer').classList.toggle('open', chatOpen);
  document.getElementById('chat-overlay').classList.toggle('show', chatOpen);
  if(chatOpen) {
    chatUnread = 0;
    lastSeenMsgTs = Date.now();
    updateChatBadge();
    setTimeout(() => {
      const el = document.getElementById('chat-messages');
      el.scrollTop = el.scrollHeight;
      document.getElementById('chat-input').focus();
    }, 50);
  }
}

function updateChatBadge() {
  const badge = document.getElementById('chat-badge');
  if(chatUnread > 0) {
    badge.textContent = chatUnread > 99 ? '99+' : chatUnread;
    badge.classList.add('show');
  } else {
    badge.classList.remove('show');
  }
}

function renderChatMsg(msg) {
  const el = document.getElementById('chat-messages');
  const div = document.createElement('div');
  if(msg.type === 'system') {
    div.className = 'chat-sys';
    div.textContent = msg.text;
  } else {
    const isMe = msg.playerId === myId;
    const isStamp = msg.stamp;
    div.className = `chat-msg ${isMe ? 'me' : 'other'}`;
    div.innerHTML = `
      <div class="chat-msg-name">${esc(msg.playerName)}</div>
      <div class="${isStamp ? 'chat-msg-stamp' : 'chat-msg-bubble'}">${esc(msg.text)}</div>
    `;
  }
  el.appendChild(div);
  if(chatOpen || msg.playerId === myId) el.scrollTop = el.scrollHeight;
}

async function sendChatMsg() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if(!text || !rId) return;
  input.value = '';
  await db.ref(`rooms/${rId}/chat`).push({
    type: 'msg', playerId: myId, playerName: getMyName(),
    text, stamp: false, ts: firebase.database.ServerValue.TIMESTAMP
  });
}

async function sendStamp(emoji) {
  if(!rId) return;
  await db.ref(`rooms/${rId}/chat`).push({
    type: 'msg', playerId: myId, playerName: getMyName(),
    text: emoji, stamp: true, ts: firebase.database.ServerValue.TIMESTAMP
  });
}

async function pushSysMsg(text) {
  if(!rId || !db) return;
  await db.ref(`rooms/${rId}/chat`).push({
    type: 'system', text, ts: firebase.database.ServerValue.TIMESTAMP
  });
}

let timerInterval = null;
let timerData = null;
let timerRef = null;
let timerCb = null;
let cdInterval = null;
let cdStartTimeout = null;

function initTimerListener() {
  if(timerRef) { timerRef.off('value', timerCb); timerRef = null; }
  timerRef = db.ref(`rooms/${rId}/timer`);
  timerCb = timerRef.on('value', snap => {
    timerData = snap.val();
    updateTimerDisplay();
  });
}

function formatMs(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function updateTimerDisplay() {
  if(!timerData) return;
  const disp = document.getElementById('timer-display');
  const btnStart = document.getElementById('timer-btn-start');
  const btnStop = document.getElementById('timer-btn-stop');
  const co = document.getElementById('countdown-overlay');
  if(!disp) return;

  const { state, startAt, remaining, limitMs, cdStartAt } = timerData;

  clearInterval(timerInterval); timerInterval = null;
  clearInterval(cdInterval); cdInterval = null;

  if(state === 'countdown') {
    co.classList.add('show');
    btnStart.disabled = true;
    btnStop.disabled = false;
    disp.textContent = formatMs(remaining !== undefined ? remaining : limitMs);
    disp.className = 'timer-display';
    const tick = () => {
      if(!cdStartAt) return;
      const elapsed = getServerTime() - cdStartAt;
      let left = Math.ceil((5000 - elapsed) / 1000);
      if(left > 5) left = 5;
      if(left <= 0) {
        document.getElementById('countdown-num').textContent = 'GO!';
        document.getElementById('countdown-num').style.animation = 'none';
        void document.getElementById('countdown-num').offsetWidth;
        document.getElementById('countdown-num').style.animation = 'cdPop 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
        setTimeout(() => { co.classList.remove('show'); }, 700);
        clearInterval(cdInterval);
        return;
      }
      const numEl = document.getElementById('countdown-num');
      if(numEl.textContent !== String(left)) {
        numEl.textContent = left;
        numEl.style.animation = 'none';
        void numEl.offsetWidth;
        numEl.style.animation = 'cdPop 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
      }
    };
    tick();
    cdInterval = setInterval(tick, 100);

  } else if(state === 'running') {
    if (document.getElementById('countdown-num').textContent !== 'GO!') {
      co.classList.remove('show');
    }
    btnStart.disabled = true;
    btnStop.disabled = false;
    const tick = () => {
      if(!startAt || remaining === undefined) return;
      const elapsed = getServerTime() - startAt;
      const left = Math.max(0, remaining - elapsed);
      disp.textContent = formatMs(left);
      if(left <= 30000) disp.className = 'timer-display danger';
      else if(left <= 60000) disp.className = 'timer-display warning';
      else disp.className = 'timer-display';
      if(left <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        db.ref(`rooms/${rId}/timer/state`).transaction(cur => {
          if(cur === 'running') return 'finished';
          return undefined;
        }).then(res => {
          if(res && res.committed) finishTimeRace();
        });
      }
    };
    tick();
    timerInterval = setInterval(tick, 100);

  } else if(state === 'paused' || state === 'idle') {
    co.classList.remove('show');
    btnStart.disabled = false;
    btnStop.disabled = true;
    const rem = (state === 'paused') ? (remaining !== undefined ? remaining : 0) : (limitMs || 300000);
    disp.textContent = formatMs(rem);
    if(rem <= 30000) disp.className = 'timer-display danger';
    else if(rem <= 60000) disp.className = 'timer-display warning';
    else disp.className = 'timer-display';

  } else if(state === 'finished') {
    co.classList.remove('show');
    disp.textContent = '00:00';
    disp.className = 'timer-display danger';
    btnStart.disabled = true;
    btnStop.disabled = true;
  }
}

async function timerAction(action) {
  if(!rId || !db) return;
  
  let confirmMsg = '';
  if(action === 'start') confirmMsg = 'タイマーをスタート（再開）しますか？';
  else if(action === 'stop') confirmMsg = 'タイマーをストップ（一時停止）しますか？';
  else if(action === 'reset') confirmMsg = 'タイマーをリセットしますか？';
  
  if(!confirm(confirmMsg)) return;

  const conf = (roomData && roomData.conf) ? roomData.conf : DEF_CONF.time_race;
  const limitMs = (conf.limit || 5) * 60 * 1000;
  const td = timerData || {};

  if(action === 'start') {
    if(td.state === 'running' || td.state === 'countdown') return;
    const currentRemaining = (td.state === 'paused') ? (td.remaining !== undefined ? td.remaining : limitMs) : limitMs;
    await db.ref(`rooms/${rId}/timer`).set({
      state: 'countdown',
      cdStartAt: firebase.database.ServerValue.TIMESTAMP,
      remaining: currentRemaining,
      limitMs: td.limitMs || limitMs,
      startAt: null
    });
    clearTimeout(cdStartTimeout);
    cdStartTimeout = setTimeout(async () => {
      const snap = await db.ref(`rooms/${rId}/timer/state`).once('value');
      if(snap.val() === 'countdown') {
        const remSnap = await db.ref(`rooms/${rId}/timer/remaining`).once('value');
        await db.ref(`rooms/${rId}/timer`).update({
          state: 'running',
          startAt: firebase.database.ServerValue.TIMESTAMP,
          remaining: remSnap.val() !== null ? remSnap.val() : currentRemaining
        });
      }
    }, 5000);

  } else if(action === 'stop') {
    clearTimeout(cdStartTimeout);
    if(td.state === 'countdown') {
      await db.ref(`rooms/${rId}/timer`).update({ state: 'paused' });
      return;
    }
    if(td.state !== 'running') return;
    const elapsed = td.startAt ? getServerTime() - td.startAt : 0;
    const currentRemaining = Math.max(0, (td.remaining !== undefined ? td.remaining : limitMs) - elapsed);
    await db.ref(`rooms/${rId}/timer`).update({ state: 'paused', remaining: currentRemaining });

  } else if(action === 'reset') {
    clearTimeout(cdStartTimeout);
    clearInterval(timerInterval); timerInterval = null;
    clearInterval(cdInterval); cdInterval = null;
    const conf2 = (roomData && roomData.conf) ? roomData.conf : DEF_CONF.time_race;
    const lm = (conf2.limit || 5) * 60 * 1000;
    await db.ref(`rooms/${rId}/timer`).set({
      state: 'idle', limitMs: lm, remaining: lm, startAt: null, cdStartAt: null
    });
  }
}

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') !== 'light';
  const newTheme = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  const icon = newTheme === 'light' ? '🌙' : '☀️';
  document.getElementById('theme-icon').textContent = icon;
  const roomIcon = document.getElementById('theme-icon-room');
  if(roomIcon) roomIcon.textContent = icon;
  try { localStorage.setItem('q-room-theme', newTheme); } catch(e) {}
}
(function() {
  try {
    const saved = localStorage.getItem('q-room-theme');
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      document.addEventListener('DOMContentLoaded', () => {
        const icon = document.getElementById('theme-icon');
        if (icon) icon.textContent = '🌙';
        const roomIcon = document.getElementById('theme-icon-room');
        if (roomIcon) roomIcon.textContent = '🌙';
      });
    }
  } catch(e) {}
})();

async function finishTimeRace() {
  if(!roomData || !roomData.players) return;
  const pData = JSON.parse(JSON.stringify(roomData.players));
  const actives = Object.values(pData).filter(p => p.st === 'active');
  if(actives.length === 0) return;
  const maxSc = Math.max(...actives.map(p => p.sc || 0));
  Object.keys(pData).forEach(k => {
    if(pData[k].st === 'active') {
      pData[k].st = (pData[k].sc || 0) >= maxSc ? 'win' : 'lose';
    }
  });
  await db.ref(`rooms/${rId}/players`).update(pData);
  await db.ref(`rooms/${rId}/status`).set('finished');
}
