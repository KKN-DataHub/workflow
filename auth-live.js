import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,onAuthStateChanged,setPersistence,browserSessionPersistence,signInWithPopup,signOut} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,collection,query,where,onSnapshot,runTransaction,writeBatch,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import {isAdmin,hasPermission,canAct,validateTask,validLink} from './workspace-policy.mjs';
const app=initializeApp({apiKey:'AIzaSyBPNnNYLd7_p0v3K4NdVCTPwrnfrHRItw0',authDomain:'wichakarn-flow.firebaseapp.com',projectId:'wichakarn-flow',storageBucket:'wichakarn-flow.firebasestorage.app',messagingSenderId:'870384603024',appId:'1:870384603024:web:a68634bbc6325b5318ed15'});
const auth=getAuth(app),db=getFirestore(app),provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
const el=id=>document.getElementById(id),frame=el('projectFlowApp'),ids=['bootCard','signedOutCard','pendingCard','suspendedCard','setupErrorCard'];
let user=null,member=null,stopMember=null,stops=[],signature='',state={};
const send=data=>frame.contentWindow?.postMessage(data,'*');
const show=id=>{el('appSurface').hidden=true;el('authSurface').hidden=false;ids.forEach(i=>el(i).hidden=i!==id);};
const toast=text=>{el('toast').textContent=text;el('toast').hidden=false;};
const fail=message=>{throw Error(message);},active=()=>user&&member?.status==='active';
function reset(){stops.forEach(s=>s());stops=[];signature='';state={};send({type:'PF_CLEAR'});}
function publish(){if(active())send({type:'PF_STATE',user:{uid:user.uid,name:member.displayName||user.displayName||user.email,email:user.email},member,state,taskId:new URL(location.href).searchParams.get('task')});}
frame.addEventListener('load',publish);
function watch(name,q){stops.push(onSnapshot(q,s=>{state[name]=s.docs.map(d=>({...d.data(),id:d.id}));if(state.errors)delete state.errors[name];publish();},e=>{state.errors={...state.errors,[name]:e.code};publish();}));}
function openWorkspace(){
 el('authSurface').hidden=true;el('appSurface').hidden=false;
 const next=JSON.stringify([user.uid,member.roles,member.teams,member.permissions]);
 if(next!==signature){reset();signature=next;const admin=isAdmin(member);
  for(const name of ['tasks','events'])watch(name,admin?collection(db,name):query(collection(db,name),where('visibleTo','array-contains',user.uid)));
  watch('trips',admin||member.roles?.some(r=>['fleet','payroll'].includes(r))?collection(db,'trips'):query(collection(db,'trips'),where('visibleTo','array-contains',user.uid)));
  for(const name of ['teams','directory','vehicles'])watch(name,collection(db,name));
  watch('receipts',collection(db,'members',user.uid,'receipts'));if(admin)watch('members',collection(db,'members'));
 }publish();
}
async function connectMembership(u){
 stopMember?.();reset();member=null;user=u;if(!u){show('signedOutCard');return;}show('bootCard');
 try{const ref=doc(db,'members',u.uid),snap=await getDoc(ref);
  if(!snap.exists())await setDoc(ref,{uid:u.uid,email:u.email||'',displayName:u.displayName||'',photoURL:u.photoURL||'',status:'pending',roles:[],teams:[],notify:u.email||'',requestedTeam:'A',requestedUnit:'',requestReason:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  stopMember=onSnapshot(ref,s=>{member=s.data()||null;if(member?.status==='active'&&member.roles?.length){openWorkspace();setDoc(doc(db,'directory',u.uid),{name:member.displayName||u.displayName||'',email:u.email||'',roles:member.roles,teams:member.teams||[],status:member.status}).catch(()=>{});return;}reset();el('pendingText').textContent=(u.email||'')+' · ผู้ดูแลจะกำหนดหน้าที่และทีมให้ คุณไม่ต้องกรอกข้อมูลเพิ่มเติม';show(member?.status==='suspended'?'suspendedCard':'pendingCard');},membershipError);
 }catch(e){membershipError(e);}
}
function membershipError(e){reset();el('setupErrorTitle').textContent='ยังตรวจสอบสิทธิ์ไม่ได้';el('setupErrorText').textContent='กรุณาติดต่อผู้ดูแลระบบ ('+(e.code||'connection-error')+')';show('setupErrorCard');}
const now=()=>new Date().toISOString(),uniq=a=>[...new Set(a.filter(Boolean))];
const allowed=p=>{if(!hasPermission(member,p))fail('คุณไม่มีสิทธิ์ทำรายการนี้');},adminOnly=()=>{if(!isAdmin(member))fail('เฉพาะผู้ดูแลระบบ');};
async function operate(op,p){
 if(!active())fail('กรุณาเข้าสู่ระบบใหม่');
 if(op==='refresh'){signature='';openWorkspace();return;}
 if(op==='member'){
  adminOnly();const old=await getDoc(doc(db,'members',p.id));if(!old.exists())fail('ให้บุคคลนี้ล็อกอินครั้งแรกก่อน');
  if(p.id===user.uid&&(!p.roles.includes('admin')||p.status!=='active'))fail('ไม่สามารถปิดสิทธิ์ผู้ดูแลของบัญชีที่กำลังใช้อยู่');
  const data={status:p.status,roles:p.roles,permissions:p.permissions,teams:p.teams,displayName:String(p.displayName||'').slice(0,100),updatedAt:serverTimestamp()};
  const batch=writeBatch(db);batch.update(doc(db,'members',p.id),data);batch.set(doc(db,'directory',p.id),{name:data.displayName,email:old.data().email||'',roles:p.roles,teams:p.teams,status:p.status});await batch.commit();return;
 }
 if(op==='team'){adminOnly();if(!p.name?.trim())fail('กรอกชื่อทีม');await setDoc(p.id?doc(db,'teams',p.id):doc(collection(db,'teams')),{name:p.name.trim().slice(0,100),capacity:Math.max(0,Number(p.capacity)||0),updatedAt:serverTimestamp()});return;}
 if(op==='vehicle'){adminOnly();if(!p.plate?.trim())fail('กรอกทะเบียนรถ');await setDoc(p.id?doc(db,'vehicles',p.id):doc(collection(db,'vehicles')),{plate:p.plate.trim(),name:String(p.name||''),meter:Math.max(0,Number(p.meter)||0)},{merge:true});return;}
 if(op==='taskCreate'){
  allowed(p.kind==='plan'?'createPlan':'createJob');validateTask(p);
  for(const [id,role] of [[p.ownerId,'staff'],[p.reviewerId,'reviewer'],[p.approverId,'approver']]){if(!id)continue;const d=await getDoc(doc(db,'directory',id));if(!d.exists()||d.data().status!=='active'||!d.data().roles.includes(role))fail('ผู้รับมอบหมายต้องมีหน้าที่ตรงกับงานและเปิดใช้งานอยู่');}
  const ref=doc(collection(db,'tasks')),at=now();await setDoc(ref,{title:p.title.trim(),kind:p.kind,stage:p.stage,teamId:p.teamId,ownerId:p.ownerId,reviewerId:p.reviewerId||'',approverId:p.approverId||'',visibleTo:uniq([user.uid,p.ownerId,p.reviewerId,p.approverId]),createdBy:user.uid,due:p.due,priority:p.priority,hours:p.hours,status:'working',progress:0,reason:'',note:'',drawing:'',boq:'',checks:[false,false,false],revision:1,history:[{id:crypto.randomUUID(),action:'มอบหมายงาน',by:user.uid,to:[p.ownerId],at,note:''}],createdAt:at,updatedAt:at});return ref.id;
 }
 if(op==='taskAction'){
  const ref=doc(db,'tasks',p.id);await runTransaction(db,async tx=>{
   const s=await tx.get(ref);if(!s.exists())fail('ไม่พบงาน');const t=s.data(),update={updatedAt:now()},h={id:crypto.randomUUID(),at:now(),by:user.uid,note:String(p.note||'').slice(0,2000),to:[]};
   if(p.action==='edit'){
    if(!canAct(member,user.uid,t,'edit'))fail('ไม่มีสิทธิ์แก้ไขงานในขั้นตอนนี้');const progress=Number(p.progress);if(!Number.isFinite(progress)||progress<0||progress>100)fail('ความก้าวหน้า 0–100%');
    Object.assign(update,{progress,reason:String(p.reason||'').slice(0,1000),drawing:validLink(p.drawing),boq:validLink(p.boq),checks:p.checks,status:p.blocked?'blocked':'working',revision:t.status==='revision'?t.revision+1:t.revision});h.action='อัปเดตความก้าวหน้า';
   }else if(p.action==='submit'){
    if(!canAct(member,user.uid,t,'submit'))fail('ไม่มีสิทธิ์ส่งงาน');
    if(!t.reviewerId||!t.approverId||t.reviewerId===t.ownerId||t.approverId===t.ownerId||t.reviewerId===t.approverId)fail('กำหนดผู้จัดทำ ผู้ตรวจ และผู้อนุมัติคนละคนให้ครบ');
    if(!t.checks?.every(Boolean)||t.checks.length!==3)fail('เช็กลิสต์ยังไม่ครบ');if(['ออกแบบ','ประมาณราคา'].includes(t.stage)&&!t.drawing)fail('เพิ่มลิงก์แบบ PDF ก่อนส่งตรวจ');if(t.stage==='ประมาณราคา'&&!t.boq)fail('เพิ่มลิงก์ BOQ ก่อนส่งตรวจ');
    update.status='review';h.action='ส่งตรวจ';h.to=[t.reviewerId];
   }else if(['pass','return'].includes(p.action)){
    if(!canAct(member,user.uid,t,'review'))fail('ไม่มีสิทธิ์ตรวจงานนี้');if(p.action==='return'&&!h.note.trim())fail('ระบุข้อแก้ไข');Object.assign(update,{status:p.action==='pass'?'approval':'revision',note:h.note});h.action=p.action==='pass'?'ผ่านตรวจ รออนุมัติ':'ส่งกลับแก้ไข';h.to=p.action==='pass'?[t.approverId]:[t.ownerId];
   }else if(p.action==='approve'){
    if(!canAct(member,user.uid,t,'approve'))fail('ไม่มีสิทธิ์อนุมัติงานนี้');Object.assign(update,{status:'done',progress:100});h.action='อนุมัติแล้ว';h.to=uniq([t.ownerId,t.reviewerId]);
   }else fail('คำสั่งไม่ถูกต้อง');update.history=[...(t.history||[]),h].slice(-100);tx.update(ref,update);
  });return;
 }
 if(op==='taskAssign'){
  const ref=doc(db,'tasks',p.id);await runTransaction(db,async tx=>{
   const s=await tx.get(ref),t=s.data();if(!t)fail('ไม่พบงาน');if(!(isAdmin(member)||(t.createdBy===user.uid&&hasPermission(member,t.kind==='plan'?'createPlan':'createJob'))))fail('ไม่มีสิทธิ์มอบหมาย');
   if(['review','approval','done'].includes(t.status))fail('งานอยู่ระหว่างตรวจหรือปิดแล้ว');
   const next={...t,ownerId:p.ownerId,reviewerId:p.reviewerId||'',approverId:p.approverId||''};validateTask(next);
   for(const [id,r] of [[next.ownerId,'staff'],[next.reviewerId,'reviewer'],[next.approverId,'approver']]){if(!id)continue;const m=await tx.get(doc(db,'directory',id));if(!m.exists()||m.data().status!=='active'||!m.data().roles.includes(r))fail('หน้าที่ของผู้รับมอบหมายไม่ถูกต้อง');}
   const at=now();tx.update(ref,{ownerId:next.ownerId,reviewerId:next.reviewerId,approverId:next.approverId,visibleTo:uniq([t.createdBy,next.ownerId,next.reviewerId,next.approverId]),updatedAt:at,history:[...(t.history||[]),{id:crypto.randomUUID(),action:'เปลี่ยนผู้รับผิดชอบ',at,by:user.uid,to:[next.ownerId],note:''}].slice(-100)});
  });return;
 }
 if(op==='event'){
  allowed('manageSchedule');if(!p.title?.trim()||!p.date||!p.time||!p.attendees?.length)fail('กรอกชื่อ กำหนดการ และผู้เกี่ยวข้อง');await setDoc(p.id?doc(db,'events',p.id):doc(collection(db,'events')),{title:p.title.trim(),date:p.date,time:p.time,priority:p.priority,kind:p.kind,note:String(p.note||''),before:Math.max(0,Number(p.before)||0),visibleTo:uniq([user.uid,...p.attendees]),createdBy:user.uid,updatedAt:now()});return;
 }
 if(op==='read'){await setDoc(doc(db,'members',user.uid,'receipts',p.id),{readAt:now()});return;}
 if(op==='tripCreate'){
  if(!member.roles?.some(r=>['admin','staff','lead'].includes(r)))fail('ไม่มีสิทธิ์ขอรถ');if(!p.vehicleId||!p.taskId||!p.destination||!p.driver||!p.people?.length||Date.parse(p.end)<=Date.parse(p.start))fail('กรอกรถ งาน จุดหมาย ผู้ขับ ผู้เดินทาง และเวลาให้ครบ');
  const task=await getDoc(doc(db,'tasks',p.taskId));if(!task.exists())fail('ไม่พบงาน');const vehicle=await getDoc(doc(db,'vehicles',p.vehicleId));if(!vehicle.exists())fail('ไม่พบรถ');if(Number(p.out)<vehicle.data().meter)fail('เลขไมล์ออกน้อยกว่าเลขไมล์ล่าสุด');
  await setDoc(doc(collection(db,'trips')),{vehicleId:p.vehicleId,taskId:p.taskId,destination:p.destination,driver:p.driver,people:p.people,start:p.start,end:p.end,out:Number(p.out),back:null,status:'pending',ownerId:user.uid,visibleTo:[user.uid],allowanceApproved:false,createdAt:now()});return;
 }
 if(op==='tripAction'){
  await runTransaction(db,async tx=>{const ref=doc(db,'trips',p.id),snap=await tx.get(ref);if(!snap.exists())fail('ไม่พบเที่ยวรถ');const t=snap.data();
   if(p.action==='approve'){if(!(isAdmin(member)||member.roles.includes('fleet'))||t.status!=='pending')fail('ไม่มีสิทธิ์อนุมัติรถ');
    const vr=doc(db,'vehicles',t.vehicleId),vs=await tx.get(vr),bookings=(vs.data().bookings||[]).filter(b=>Date.parse(b.end)>Date.now()-86400000);if(bookings.some(b=>t.start<b.end&&t.end>b.start))fail('รถมีคิวซ้อนในเวลานี้');tx.update(vr,{bookings:[...bookings,{id:p.id,start:t.start,end:t.end}]});tx.update(ref,{status:'approved'});
   }else if(p.action==='finish'){if(t.status!=='approved'||!(t.ownerId===user.uid||isAdmin(member)||member.roles.includes('fleet')))fail('ปิดเที่ยวนี้ไม่ได้');if(!Number.isFinite(Number(p.back))||Number(p.back)<t.out)fail('เลขไมล์กลับต้องไม่น้อยกว่าเลขไมล์ออก');tx.update(ref,{back:Number(p.back),status:'done'});
   }else if(p.action==='claim'){if(t.status!=='done'||!(isAdmin(member)||member.roles.includes('payroll')))fail('ไม่มีสิทธิ์รับรองเบี้ยเลี้ยง');tx.update(ref,{allowanceApproved:true});}else fail('คำสั่งไม่ถูกต้อง');});return;
 }fail('ไม่พบรายการที่ต้องการ');
}
window.addEventListener('message',async e=>{
 if(e.source!==frame.contentWindow||!e.data)return;if(e.data.type==='PF_READY'){publish();return;}if(e.data.type==='PF_LOGOUT'){await signOut(auth);return;}
 if(e.data.type==='PF_OPEN'){if(!active())return;try{const u=new URL(e.data.url);if(u.protocol==='https:'||u.protocol==='mailto:')window.open(u.href,'_blank','noopener');}catch{}return;}
 if(e.data.type!=='PF_REQUEST'||typeof e.data.id!=='string')return;
 try{const result=await operate(e.data.op,e.data.payload||{});send({type:'PF_RESPONSE',id:e.data.id,result:result??true});}catch(error){send({type:'PF_RESPONSE',id:e.data.id,error:error.code==='permission-denied'?'ยังบันทึกไม่ได้ กรุณาให้ผู้ดูแลอัปเดตกฎสิทธิ์ของระบบ':error.message||'เชื่อมต่อไม่สำเร็จ'});}
});
el('googleSignIn').onclick=async()=>{el('googleSignIn').disabled=true;try{await signInWithPopup(auth,provider);}catch(e){toast(e.code==='auth/unauthorized-domain'?'โดเมนนี้ยังไม่ได้รับอนุญาตให้ล็อกอิน':'เข้าสู่ระบบไม่สำเร็จ ('+e.code+') ลองเปิดเว็บโดยตรงใน Chrome หรือ Edge');}finally{el('googleSignIn').disabled=false;}};
el('checkAgain').onclick=()=>user&&connectMembership(user);document.querySelectorAll('[data-sign-out]').forEach(b=>b.onclick=()=>signOut(auth));
el('loginDate').textContent=new Date().toLocaleDateString('th-TH',{dateStyle:'long'});
await setPersistence(auth,browserSessionPersistence);onAuthStateChanged(auth,connectMembership);
