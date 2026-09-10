export const roleLabels={admin:'ผู้ดูแลระบบ',lead:'หัวหน้าทีม',staff:'ผู้จัดทำ',reviewer:'ผู้ตรวจ',approver:'ผู้อนุมัติ',fleet:'ผู้ดูแลรถ',payroll:'ผู้ดูแลค่าตอบแทน'};
export const permissionLabels={createPlan:'สร้างแผน',createJob:'สร้างงาน',manageSchedule:'เพิ่มและแก้กำหนดการ'};
export const stages=['ส่งแผน','สำรวจ','ออกแบบ','ประมาณราคา','ส่งมอบ'];
export const statusLabels={working:'กำลังทำ',blocked:'ติดขัด',review:'รอตรวจ',revision:'แก้ไข',approval:'รออนุมัติ',done:'เสร็จแล้ว'};
export function isAdmin(m){return m?.status==='active'&&m.roles?.includes('admin');}
export function hasPermission(m,p){return m?.status==='active'&&(isAdmin(m)||m.permissions?.includes(p));}
export function canAct(m,uid,t,action){
 if(m?.status!=='active'||!t)return false;
 const own=t.ownerId===uid, role=r=>m.roles?.includes(r);
 if(action==='edit'||action==='submit')return own&&role('staff')&&['working','blocked','revision'].includes(t.status);
 if(action==='review')return !own&&t.reviewerId===uid&&role('reviewer')&&t.status==='review';
 if(action==='approve')return !own&&t.reviewerId!==uid&&t.approverId===uid&&role('approver')&&t.status==='approval';
 return false;
}
export function dayKey(d=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
export function daysLeft(d,today=dayKey()){return Math.round((Date.parse(d+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);}
export function urgency(t,today=dayKey()){if(t.status==='done')return 'done';if(daysLeft(t.due,today)<0)return 'overdue';if(t.priority==='urgent')return 'urgent';if(daysLeft(t.due,today)<=3)return 'soon';return 'normal';}
export function validLink(value){if(!value)return '';const u=new URL(value);if(u.protocol!=='https:')throw Error('ใช้ลิงก์ HTTPS เท่านั้น');return u.href;}
export function eligiblePersonDays(trips){const seen=new Set();for(const t of trips){if(t.status!=='done'||!t.allowanceApproved)continue;const start=t.start.slice(0,10),end=t.end.slice(0,10),n=daysLeft(end,start)+1;if(!Number.isFinite(n)||n<1||n>366)continue;for(let i=0;i<n;i++){const d=new Date(Date.parse(start+'T00:00:00Z')+i*86400000).toISOString().slice(0,10);for(const person of t.people)seen.add(person.trim()+'|'+d);}}return seen.size;}
export function validateTask(t){
 if(!t.title?.trim()||!t.teamId||!t.ownerId||!t.due)throw Error('กรอกชื่องาน ทีม ผู้จัดทำ และกำหนดส่ง');
 if(!stages.includes(t.stage)||!['plan','job'].includes(t.kind)||!['normal','important','urgent'].includes(t.priority))throw Error('ประเภทงานไม่ถูกต้อง');
 if(!Number.isFinite(t.hours)||t.hours<0||t.hours>10000)throw Error('ตรวจชั่วโมงที่วางแผนไว้');
 if(t.reviewerId&&(t.reviewerId===t.ownerId||t.reviewerId===t.approverId))throw Error('ผู้จัดทำ ผู้ตรวจ และผู้อนุมัติต้องเป็นคนละคน');
 if(t.approverId===t.ownerId)throw Error('ผู้จัดทำอนุมัติงานตนเองไม่ได้');
}
