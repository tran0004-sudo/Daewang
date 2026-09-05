(()=>{
const AUTO_FIREBASE_CONFIG={
 apiKey:'AIzaSyDfAUpbzd_tB6Da-6kRedtuz9G5u7Km7E0',
 databaseURL:'https://daewang-radio-e1370-default-rtdb.asia-southeast1.firebasedatabase.app',
 projectId:'daewang-radio-e1370',
 authDomain:'daewang-radio-e1370.firebaseapp.com',
 appId:'1:56169646168:web:16e5dc67b7acdfa5b1e22d'
};
try{
 const saved=cfg();
 if(!saved||saved.projectId!==AUTO_FIREBASE_CONFIG.projectId||saved.databaseURL!==AUTO_FIREBASE_CONFIG.databaseURL){
  localStorage.setItem(CFGKEY,JSON.stringify(AUTO_FIREBASE_CONFIG));
 }
}catch(e){
 try{localStorage.setItem(CFGKEY,JSON.stringify(AUTO_FIREBASE_CONFIG))}catch(_){}
}
const SELF_KEY='daewang_radio_self_driver_v3';
let syncSession=null,syncRef=null,autoBusy=false;
const esc2=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const selfId=()=>+(localStorage.getItem(SELF_KEY)||0)||0;
const selectedObj=list=>{const o={};list.forEach(d=>o[d.id]={id:d.id,name:d.name,vno:d.vno,team:d.team});return o};
const rootRef=()=>db.ref(`radio/${ROOM}`);
function ready(){if(!firebaseReady())return false;watchSession();return true}
function watchSession(){
 if(!db||syncRef)return;
 syncRef=rootRef().child('session');
 syncRef.on('value',s=>{syncSession=s.val()||null;renderInvite();autoJoin();if((!syncSession||!syncSession.active)&&me)leaveRadio()});
}
function invited(id){return !!(syncSession&&syncSession.active&&syncSession.selected&&syncSession.selected[id])}
function liveUi(d){
 openSheet(`<h2>📻 ${esc2(d.name)} 무전 연결</h2><div class="sub">관리자가 선택한 무전 대상입니다. 같은 방에 자동 연동합니다.</div><select id="self" style="display:none"><option value="${d.id}" selected>${esc2(d.name)}</option></select><button id="join" style="display:none"></button><div id="live"><div class="status" id="status">자동 연결 중…</div><div class="chips" id="members"></div><button class="ptt" id="ptt">누르고<br>말하기</button><button class="ghost" onclick="leaveRadio();closeSheet()">무전방 나가기</button></div>`);
}
async function autoJoin(){
 const id=selfId();if(autoBusy||me||!id||!invited(id)||!db)return;
 const d=state.drivers.find(x=>x.id===id);if(!d)return;
 autoBusy=true;
 try{liveUi(d);toast(`${d.name}님 무전 대상 · 자동 연결 중`);await window.joinRadio()}
 catch(e){console.warn(e);toast('자동 연결이 안 되면 📻 무전에서 참가를 눌러주세요')}
 finally{autoBusy=false}
}
function renderInvite(){
 const box=document.querySelector('#syncInviteBox');if(!box)return;
 const id=selfId(),d=state.drivers.find(x=>x.id===id);
 if(!id){box.innerHTML='<div class="warn">기사 휴대폰에서는 아래에서 본인을 한 번 저장하세요.</div>';return}
 box.innerHTML=invited(id)?`<div class="status">✅ ${esc2(d?.name||'기사')}님은 현재 무전 대상입니다.</div><button class="primary" onclick="radioSyncManualJoin()">무전방 참가</button>`:`<div class="status">${esc2(d?.name||'기사')} · 현재 무전 대상 아님</div>`;
}
window.radioSyncSaveSelf=()=>{
 const id=+document.querySelector('#syncSelf').value;localStorage.setItem(SELF_KEY,String(id));const d=state.drivers.find(x=>x.id===id);toast(`${d?.name||'기사'} 휴대폰으로 저장됨`);renderInvite();autoJoin();
};
window.radioSyncManualJoin=()=>{const id=selfId(),d=state.drivers.find(x=>x.id===id);if(!d||!invited(id))return toast('현재 무전 대상이 아닙니다');liveUi(d);window.joinRadio()};
window.radioSyncStart=async()=>{
 if(!ready())return toast('Firebase 자동 연결에 실패했습니다. 새로고침 후 다시 시도하세요.');
 const list=state.drivers.filter(d=>d.done);if(!list.length)return toast('무전할 기사를 먼저 체크하세요');
 try{
  const root=rootRef();
  await Promise.all([root.child('members').remove(),root.child('offers').remove(),root.child('answers').remove(),root.child('cand').remove()]);
  await root.child('session').set({active:true,sessionId:'s_'+Date.now().toString(36),startedAt:firebase.database.ServerValue.TIMESTAMP,selected:selectedObj(list)});
  toast(`무전방 시작 · ${list.length}명`)
 }catch(e){console.error(e);toast('무전방 시작 실패')}
};
window.radioSyncEnd=async()=>{
 if(!ready())return;
 try{const root=rootRef();await root.child('session').set({active:false,endedAt:firebase.database.ServerValue.TIMESTAMP,selected:{}});await Promise.all([root.child('members').remove(),root.child('offers').remove(),root.child('answers').remove(),root.child('cand').remove()]);await leaveRadio();toast('무전방 종료됨')}catch(e){console.error(e);toast('무전방 종료 실패')}
};
function syncOpenRadio(){
 if(!ready())return toast('Firebase 자동 연결에 실패했습니다. 새로고침 후 다시 시도하세요.');
 const checked=state.drivers.filter(d=>d.done),saved=selfId();
 const opts=state.drivers.map(d=>`<option value="${d.id}" ${d.id===saved?'selected':''}>${esc2(d.name)} · ${esc2(d.vno)} (${d.team}조)</option>`).join('');
 const live=syncSession&&syncSession.active?Object.values(syncSession.selected||{}):[];
 openSheet(`<h2>📻 실시간 무전</h2><div class="sub"><b>관리자:</b> 기사 체크 후 무전방 시작.<br><b>기사:</b> 본인 이름을 한 번 저장하면 초대될 때 자동 연동됩니다.</div><div class="status" style="margin-bottom:12px">✅ Firebase 자동 설정 완료</div><div class="warn"><b>관리자 체크 ${checked.length}명</b><br>${checked.map(d=>esc2(d.name)).join(', ')||'체크된 기사 없음'}</div><button class="primary" onclick="radioSyncStart()" ${checked.length?'':'disabled'}>체크 명단으로 무전방 시작</button><button class="ghost" onclick="radioSyncEnd()">현재 무전방 종료</button><div class="field" style="margin-top:16px"><label>이 휴대폰의 기사</label><select id="syncSelf">${opts}</select></div><button class="primary" onclick="radioSyncSaveSelf()">내 기사 저장</button><div class="status" style="margin-top:12px">${live.length?`현재 무전 대상 ${live.length}명 · ${live.map(x=>esc2(x.name)).join(', ')}`:'현재 열린 무전방 없음'}</div><div id="syncInviteBox" style="margin-top:12px"></div><button class="ghost" onclick="closeSheet()">닫기</button>`);
 renderInvite();
}
window.openRadio=syncOpenRadio;
const rb=document.querySelector('#radioBtn');if(rb)rb.onclick=syncOpenRadio;
ready();
})();