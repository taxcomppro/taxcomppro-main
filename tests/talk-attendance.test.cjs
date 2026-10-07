const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=process.env.TAXCOMPRO_TEST_ROOT||path.resolve(__dirname,'..'),ts=require(path.join(root,'node_modules/typescript'));
let session={user:{id:'host',role:'USER'}},role='USER',reads=0,rows=[],writes=0,events=[],ended=null,live=true;
const start=new Date('2026-10-07T12:00:00Z'),finish=new Date('2026-10-07T13:00:00Z');
const member=id=>({id,name:id==='one'?'=FORMULA':id,email:id+'@example.test',phone:'+12345',role:'USER',tier:'PRO',digitalCard:null});
const space={id:'talk',name:'Test talk',hostId:'host',coHostIds:['cohost'],host:{id:'host',name:'Host'},roomName:'room',isLive:false,createdAt:start,endedAt:finish,totalAttendees:1,peakAttendees:1,
 attendances:[{id:'a',user:member('one'),joinedAt:start,leftAt:null}],rsvps:[{id:'r',user:member('one'),name:'one',email:'one@example.test'},{id:'r2',user:member('two'),name:'two',email:'two@example.test'}],tickets:[{id:'t',user:member('two'),customerName:'two',customerEmail:'two@example.test',ticketNumber:'T2',status:'CONFIRMED',paymentStatus:'PAID',pricePaid:20,currency:'USD'}]};
const prisma={user:{findUnique:async()=>({role})},space:{findUnique:async args=>{if(args.include){reads++;return space;}return {hostId:'host',coHostIds:['cohost']};},findMany:async args=>args.cursor?rows.slice(50):rows.slice(0,args.take),count:async()=>rows.length},spaceAttendance:{}};
class Response {constructor(body,init={}){this.body=body;this.status=init.status||200;this.headers=init.headers||{};}static json(data,init){const r=new Response(null,init);r.data=data;return r;}}
const cache={};function load(file){if(cache[file])return cache[file];const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;const mocks={'@/lib/prisma':{prisma},'@/lib/auth':{auth:{api:{getSession:async()=>session}}},'next/server':{NextResponse:Response},'livekit-server-sdk':{RoomServiceClient:class{async deleteRoom(){assert(ended);events.push('disconnect');}}}};vm.runInThisContext('(function(require,module,exports){'+code+'})')(id=>mocks[id]||(id.startsWith('@/')?load(id.slice(2)+'.ts'):{}),m,m.exports);return cache[file]=m.exports;}
const req=(query='')=>({headers:new Headers(),nextUrl:new URL('http://test/attendance?'+query),url:'http://test/attendance?'+query,cookies:{get:()=>null}}),params={params:Promise.resolve({id:'talk'})};let checks=0;
(async()=>{
const lib=load('lib/talk-attendance.ts'),host=load('app/api/spaces/[id]/export-attendees/route.ts'),admin=load('app/api/admin/pro-talks/attendance/route.ts');
let report=await lib.loadTalkAttendance('talk');assert.equal(report.members.length,2);assert.equal(report.summary.totalAttendees,1);assert.equal(report.members[1].attended,false);assert.match(report.members[1].rsvpStatus,/Did not attend/);assert.equal(report.members[0].durationMinutes,60);assert.equal(report.members[0].timeOutIso,finish.toISOString());assert.equal(lib.attendanceCsvRows(report,true).length,1);assert.match(lib.attendanceCsvRows(report)[0],/'=FORMULA/);checks++;
session=null;assert.equal((await host.GET(req(),params)).status,401);assert.equal((await admin.GET(req())).status,401);checks++;
session={user:{id:'outsider',role:'ADMIN'}};role='USER';reads=0;assert.equal((await host.GET(req(),params)).status,403);assert.equal((await admin.GET(req('talkId=talk'))).status,403);assert.equal(reads,0);checks++;
for(const id of ['host','cohost']){session={user:{id,role:'USER'}};const r=await host.GET(req('format=json'),params);assert.equal(r.status,200);assert.equal(r.data.members.length,2);}checks++;
session={user:{id:'admin',role:'ADMIN'}};role='ADMIN';assert.equal((await admin.GET(req('talkId=talk'))).status,200);checks++;
rows=Array.from({length:51},(_,i)=>({id:'talk'+i}));const csv=await admin.GET(req('format=csv'));assert.equal(csv.body.split('\r\n').length,52);assert.equal(csv.headers['Cache-Control'],'private, no-store');checks++;
const all=await admin.GET(req('format=csv&scope=all'));assert.equal(all.body.split('\r\n').length,103);assert.equal((await admin.GET(req('page=NaN'))).data.page,1);checks++;
// Real access rules: ticketed members must have their ticket and active network membership loaded.
const attendance=load('app/api/spaces/[id]/attendance/route.ts');session={user:{id:'buyer',role:'USER'}};let ticket=true,network=true;
prisma.space.findUnique=async args=>{assert(args.include.tickets);assert(args.include.network.select.members);return {...space,isLive:live,endedAt:ended,visibility:'TICKETED',accessType:'TICKETED',ticketPrice:20,isNetworkExclusive:true,networkId:'network',tickets:ticket?[{userId:'buyer',status:'CONFIRMED'}]:[],network:{members:network?[{userId:'buyer',status:'ACTIVE'}]:[]}};};
prisma.spaceAttendance.upsert=async()=>{writes++;};prisma.spaceAttendance.count=async({where})=>where.leftAt===null?1:3;prisma.space.update=async({data})=>data;
assert.equal((await attendance.POST(req(),params)).status,200);assert.equal(writes,1);checks++;
ticket=false;assert.equal((await attendance.POST(req(),params)).status,403);ticket=true;network=false;assert.equal((await attendance.POST(req(),params)).status,403);assert.equal(writes,1);checks++;
network=true;ended=finish;live=false;assert.equal((await attendance.POST(req(),params)).status,409);assert.equal(writes,1);checks++;
// The end endpoint commits report timestamps before LiveKit disconnect and is idempotent.
const endRoute=load('app/api/spaces/[id]/route.ts');session={user:{id:'host',role:'USER'}};ended=null;prisma.space.findUnique=async()=>({...space,endedAt:ended});
prisma.$transaction=async fn=>fn({space:{updateMany:async()=>{if(!ended)ended=finish;events.push('persist');},findUniqueOrThrow:async()=>({...space,endedAt:ended})},spaceAttendance:{updateMany:async({data})=>{assert.equal(data.leftAt,finish);events.push('close-attendance');}}});
process.env.LIVEKIT_API_KEY='test';process.env.LIVEKIT_API_SECRET='test';process.env.NEXT_PUBLIC_LIVEKIT_URL='wss://test.invalid';
assert.equal((await endRoute.DELETE(req(),params)).status,200);assert.deepEqual(events,['persist','close-attendance','disconnect']);await endRoute.DELETE(req(),params);assert.equal(ended,finish);checks++;
console.log('PASS '+checks+' attendance scenarios: real access rules, host/cohost/admin boundaries, stale admin rejection, ticket/network joins, closed-room rejection, CSV formula safety, no-show accuracy, full exports beyond one batch, and report-before-disconnect ordering. No live database calls.');
})().catch(error=>{console.error(error);process.exitCode=1});
