// Synthetic demonstration only. No Firebase SDK, login tokens or database calls.
const frame=document.getElementById('demo'),chooser=document.getElementById('role');
const day=n=>{const d=new Date();d.setDate(d.getDate()+n);return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);};
const at=(n,h='09:00')=>day(n)+'T'+h+':00+07:00';
const teams=[{id:'plan',name:'ทีมแผนงาน',capacity:80},{id:'survey',name:'ทีมสำรวจ',capacity:120},{id:'design',name:'ทีมออกแบบ',capacity:80},{id:'estimate',name:'ทีมประมาณราคา',capacity:80}];
const members=['admin','staff','reviewer','approver'].map((r,i)=>({id:r,uid:r,displayName:['ผู้ดูแลตัวอย่าง','เจ้าหน้าที่ตัวอย่าง','ผู้ตรวจตัวอย่าง','ผู้อนุมัติตัวอย่าง'][i],name:['ผู้ดูแลตัวอย่าง','เจ้าหน้าที่ตัวอย่าง','ผู้ตรวจตัวอย่าง','ผู้อนุมัติตัวอย่าง'][i],email:r+'@example.invalid',roles:r==='admin'?['admin','payroll','fleet']:[r],permissions:[],status:'active',teams:teams.map(t=>t.id)}));
const specs=[
 ['แผนสำรวจสายทางประจำเดือน','ส่งแผน','plan','review',95,1,16,''],
 ['แผนจัดลำดับงานซ่อมผิวทาง','ส่งแผน','plan','working',40,8,24,''],
 ['แผนลงพื้นที่ตรวจสะพาน','ส่งแผน','plan','approval',100,2,12,''],
 ['สำรวจระดับถนนสายตัวอย่าง 01','สำรวจ','survey','working',65,2,40,''],
 ['สำรวจท่อระบายน้ำ บ้านตัวอย่าง','สำรวจ','survey','blocked',30,-4,56,'รอประสานเปิดพื้นที่จากผู้เกี่ยวข้อง'],
 ['สำรวจปริมาณจราจรสายตัวอย่าง 02','สำรวจ','survey','review',90,0,32,''],
 ['ตรวจสอบแนวเขตสายตัวอย่าง 03','สำรวจ','survey','revision',70,-1,24,'แก้พิกัดจุดอ้างอิงและเพิ่มรูปถ่าย'],
 ['แบบปรับปรุงทางแยกตัวอย่าง','ออกแบบ','design','working',50,5,64,''],
 ['แบบสะพานข้ามคลองตัวอย่าง','ออกแบบ','design','blocked',20,-2,120,'รอผลสำรวจระดับและข้อมูลชั้นดิน'],
 ['แบบท่อเหลี่ยมระบายน้ำ','ออกแบบ','design','review',95,1,40,''],
 ['แบบขยายไหล่ทาง','ออกแบบ','design','revision',75,3,48,'ปรับรายละเอียดทางเชื่อมและหน้าตัด'],
 ['BOQ งานปรับปรุงผิวทาง','ประมาณราคา','estimate','working',60,4,40,''],
 ['BOQ งานระบายน้ำ','ประมาณราคา','estimate','review',95,1,24,''],
 ['ตรวจราคาวัสดุงานสะพาน','ประมาณราคา','estimate','blocked',45,-3,32,'รอใบเสนอราคาวัสดุเพิ่มเติม'],
 ['ประมาณราคางานเครื่องหมายจราจร','ประมาณราคา','estimate','approval',100,2,16,''],
 ['ส่งมอบชุดแบบทางแยก','ส่งมอบ','design','done',100,-1,32,''],
 ['ส่งมอบชุดประมาณราคาถนน','ส่งมอบ','estimate','done',100,-2,24,''],
 ['ส่งมอบรายงานสำรวจสะพาน','ส่งมอบ','survey','done',100,-3,20,''],
 ['ชุดเอกสารส่งมอบท่อระบายน้ำ','ส่งมอบ','design','approval',100,6,20,''],
 ['แผนติดตามพื้นที่น้ำท่วม','ส่งแผน','plan','revision',60,0,20,'เพิ่มแผนสำรองเมื่อเข้าพื้นที่ไม่ได้']
];
const tasks=specs.map(([title,stage,teamId,status,progress,due,hours,reason],i)=>{const id='demo-'+(i+1),created=-5+i%6;const history=[{id:id+'-created',action:'มอบหมายงาน',by:'admin',to:['staff'],at:at(created),note:'รายการสมมติสำหรับทดลองหน้าจอ'}];if(status!=='working')history.push({id:id+'-submit',action:'ส่งตรวจ',by:'staff',to:['reviewer','admin'],at:at(Math.max(created,-2),'10:00'),note:''});if(status==='revision')history.push({id:id+'-return',action:'ส่งกลับแก้ไข',by:'reviewer',to:['staff','admin'],at:at(0,'08:30'),note:reason});if(['approval','done'].includes(status))history.push({id:id+'-pass',action:'ผ่านตรวจ รออนุมัติ',by:'reviewer',to:['approver','admin'],at:at(status==='done'?due:0,'11:00'),note:'ตรวจรายการและเอกสารแล้ว (ตัวอย่าง)'});if(status==='done')history.push({id:id+'-done',action:'อนุมัติแล้ว',by:'approver',to:['staff','admin'],at:at(due,'14:00'),note:'ส่งมอบครบถ้วน (ตัวอย่าง)'});return {id,title,stage,teamId,kind:stage==='ส่งแผน'?'plan':'job',status,progress,due:day(due),hours,reason,note:status==='revision'?reason:'',priority:due<0?'urgent':due<=2?'important':'normal',ownerId:'staff',reviewerId:'reviewer',approverId:'approver',createdBy:'admin',visibleTo:members.map(m=>m.id),checks:[progress>=50,progress>=90,progress>=95],revision:status==='revision'?2:1,drawing:'',boq:'',history,createdAt:at(created),updatedAt:history.at(-1).at};});
const events=[['ประชุมติดตามงานค้าง','ประชุม',0,'09:00','urgent'],['ลงพื้นที่สำรวจสายทาง','ลงพื้นที่',1,'08:30','important'],['ตรวจแบบท่อเหลี่ยมร่วมกัน','ตรวจงาน',2,'13:30','important'],['ส่งแผนสำรวจรอบถัดไป','ส่งแผน',3,'10:00','normal'],['ส่งชุดประมาณราคา','ส่งแบบ',5,'15:00','important'],['ติดตามผลแก้ไขทางเชื่อม','ติดตามงาน',7,'09:00','normal']].map(([title,kind,n,time,priority],i)=>({id:'event-'+i,title,kind,date:day(n),time,priority,note:'กำหนดการสมมติ',before:60,visibleTo:members.map(m=>m.id),updatedAt:at(0)}));
const vehicles=[{id:'car1',plate:'รถตัวอย่าง 01',name:'รถกระบะสำรวจ',meter:42860,bookings:[]},{id:'car2',plate:'รถตัวอย่าง 02',name:'รถตู้ลงพื้นที่',meter:21540,bookings:[]}];
const trips=['pending','approved','done'].map((status,i)=>({id:'trip-'+i,status,vehicleId:i===1?'car2':'car1',taskId:tasks[3+i].id,requestedBy:'staff',createdBy:'staff',visibleTo:members.map(m=>m.id),destination:['สำรวจจุดระบายน้ำ','ตรวจแบบร่วมกับพื้นที่','สำรวจสะพานตัวอย่าง'][i],driver:'ผู้ขับรถตัวอย่าง',start:at(i===2?-2:1,'08:00'),end:at(i===2?-2:1,'17:00'),out:42000+i*100,back:i===2?42480:null,passengers:['staff','reviewer'],claimed:i===2,teamId:'survey'}));
for(const t of tasks){if(t.status==='done'){t.createdAt=at(-5);t.history[0].at=t.createdAt;t.history[1].at=at(-4,'10:00');}t.history.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));}
for(const t of trips){t.people=['เจ้าหน้าที่ตัวอย่าง','ผู้ตรวจตัวอย่าง'];t.ownerId='staff';t.allowanceApproved=t.status==='done';}
let receipts=[];
function publish(){const m=members.find(m=>m.id===chooser.value);frame.contentWindow.postMessage({type:'PF_STATE',user:{uid:m.id,name:m.displayName,email:m.email},member:m,state:{tasks,teams,events,vehicles,trips,directory:members,members:m.id==='admin'?members:[],receipts}},'*');}
chooser.onchange=()=>{frame.contentWindow.postMessage({type:'PF_CLEAR'},'*');receipts=[];publish();};
window.addEventListener('message',e=>{if(e.source!==frame.contentWindow)return;const m=e.data||{};if(m.type==='PF_READY')publish();if(m.type==='PF_LOGOUT')location.href='./';if(m.type==='PF_OPEN')document.getElementById('message').textContent='โหมดตัวอย่างไม่ส่งอีเมลหรือเปิดเอกสารจริง';if(m.type==='PF_REQUEST'){let error=null;if(m.op==='read')receipts.push({id:m.payload.id});else if(m.op!=='refresh')error='ข้อมูลตัวอย่างสำหรับดูหน้าจอ ยังไม่บันทึกการแก้ไข กรุณาใช้ระบบจริงเมื่อต้องการทำงาน';frame.contentWindow.postMessage({type:'PF_RESPONSE',id:m.id,error,result:null},'*');publish();}});
