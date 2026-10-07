const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=process.env.TAXCOMPRO_TEST_ROOT||path.resolve(__dirname,'..');
const ts=require(path.join(root,'node_modules/typescript'));
let role='USER',tier='MARKETPLACE',ready=false,accountId=null,created=0,checks=0;
const prisma={user:{findUnique:async()=>({id:'seller',role,tier,stripeAccountId:accountId,stripeOnboarded:true})},marketplaceListing:{findUnique:async()=>null,create:async({data})=>{created++;return data;}},proNetwork:{findUnique:async()=>null,create:async({data})=>{created++;return {...data,id:'network'};}}};
function load(file){const m={exports:{}};const source=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;const mocks={'@/lib/prisma':{prisma},'@/lib/auth':{auth:{api:{getSession:async()=>({user:{id:'seller'}})}}},'@/lib/stripe-direct-connect':{requireDirectChargeAccount:async()=>{if(!ready||!accountId)throw Error('Finish Stripe setup before publishing.');return accountId;}},stripe:class{},'next/server':{NextResponse:{json:(data,options)=>({data,status:options?.status||200})}}};vm.runInThisContext('(function(require,module,exports){'+source+'})')(id=>mocks[id]||{},m,m.exports);return m.exports;}
const marketplace=load('app/api/marketplace/route.ts'),network=load('app/api/pro-networks/route.ts');
const request=body=>({headers:new Headers(),json:async()=>body});
process.env.STRIPE_SECRET_KEY='sk_test_mock_only';
(async()=>{
 for(const [route,body] of [[marketplace,{title:'Listing',description:'Details',category:'PRODUCT',price:25}],[network,{name:'Network',monthlyPrice:25}]]){
  created=0;ready=false;accountId=null;
  let result=await route.POST(request(body));assert.equal(result.status,409);assert.equal(result.data.code,'STRIPE_SETUP_REQUIRED');assert.equal(created,0);checks++;
  role='ADMIN';result=await route.POST(request(body));assert.equal(result.status,409);assert.equal(created,0);role='USER';checks++;
  accountId='acct_seller';result=await route.POST(request(body));assert.equal(result.status,409);assert.equal(created,0);checks++;
  ready=true;result=await route.POST(request(body));assert(result.status >= 200 && result.status < 300);assert.equal(created,1);checks++;
  ready=false;accountId=null;result=await route.POST(request({...body,price:0,monthlyPrice:0}));assert(result.status >= 200 && result.status < 300);assert.equal(created,2);checks++;
 }
 tier='FREE';assert.equal((await marketplace.POST(request({title:'Listing',price:0}))).status,403);checks++;
 console.log('PASS '+checks+' publishing checks: free creation, verified paid creation, admin parity, stale readiness rejection, and existing plan eligibility. No real database or Stripe calls.');
})().catch(e=>{console.error(e);process.exitCode=1});

