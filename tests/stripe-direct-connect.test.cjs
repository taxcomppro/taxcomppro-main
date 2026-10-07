const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const ts=require(path.join(root,'node_modules/typescript'));
let member=null,purchases=new Map(),count=0,notifications=[],calls=[],account,failCheckout=false,networkPrice=12;
const goodAccount={id:'acct_seller',charges_enabled:true,payouts_enabled:true,details_submitted:true,controller:{fees:{payer:'account'},losses:{payments:'stripe'}}};
const listing={id:'listing1',slug:'product',title:'Product',price:12,status:'APPROVED',images:[],userId:'seller',metadata:{},user:{id:'seller',stripeAccountId:'acct_seller',stripeOnboarded:true}};
const network={id:'network1',slug:'network',name:'Network',ownerId:'seller',monthlyPrice:12,owner:{stripeAccountId:'acct_seller',stripeOnboarded:true}};
const prisma={
 user:{findUnique:async()=>({id:'buyer',email:'buyer@example.test'}),update:async()=>{},updateMany:async()=>{}},
 marketplaceListing:{findMany:async()=>[listing]},marketplaceCoupon:{findMany:async()=>[]},
 marketplacePurchase:{findMany:async()=>[],findUnique:async({where})=>purchases.get(where.userId_listingId.listingId),create:async({data})=>{purchases.set(data.listingId,data);return data;}},
 proNetwork:{findUnique:async()=>({...network,monthlyPrice:networkPrice}),update:async({data})=>{count+=data.memberCount.increment;return network;}},
 proNetworkMember:{findUnique:async()=>member,findFirst:async({where})=>member?.stripeSubscriptionId===where.stripeSubscriptionId?member:null,upsert:async({create,update})=>{member=member?{...member,...update}:{id:'m1',...create};return member;}},
 notification:{create:async({data})=>notifications.push(data)},$executeRaw:async()=>{},
};
let tail=Promise.resolve();prisma.$transaction=fn=>{const next=tail.then(()=>fn(prisma));tail=next.catch(()=>{});return next;};
let sub={id:'sub_1',status:'active',customer:'cus_buyer',metadata:{networkId:'network1',userId:'buyer'},items:{data:[{current_period_end:Math.floor(Date.now()/1000)+86400*30}]},cancel_at_period_end:false};
const stripe={accounts:{retrieve:async()=>account},subscriptions:{retrieve:async()=>sub},checkout:{sessions:{
 create:async(params,options)=>{calls.push({params,options});if(failCheckout)throw Error('Stripe unavailable');return {id:'cs_1',url:'https://checkout.stripe.test'};},
 listLineItems:async()=>({has_more:false,data:[{amount_total:1200,price:{product:{metadata:{listingId:'listing1'}}}}]}),
 retrieve:async()=>paid,
}}};
const hasNetworkMembership=m=>!!m&&(m.status==='ACTIVE'||(m.status==='CANCELED'&&!!m.expiresAt))&&(!m.expiresAt||m.expiresAt>new Date());
const auth={api:{getSession:async()=>({user:{id:'buyer',email:'buyer@example.test'}})}};
function load(file,extra={}){const mod={exports:{}};const src=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const mocks={'@/lib/prisma':{prisma},'@/lib/networkAccess':{hasNetworkMembership},'@/lib/auth':{auth},'next/server':{NextResponse:{json:(data,options)=>({data,status:options?.status||200})}},stripe:class{constructor(){return stripe}},...extra};vm.runInThisContext('(function(require,module,exports){'+src+'\n})')(id=>id in mocks?mocks[id]:{},mod,mod.exports);return mod.exports;}
process.env.STRIPE_SECRET_KEY='sk_test_mock_only';
const helper=load('lib/stripe-direct-connect.ts');
const marketplace=load('app/api/stripe/marketplace-checkout/route.ts',{'@/lib/stripe-direct-connect':helper});
const checkout=load('app/api/pro-networks/[slug]/checkout/route.ts',{'@/lib/stripe-direct-connect':helper});
const paid={id:'cs_1',status:'complete',payment_status:'paid',amount_total:1200,metadata:{type:'marketplace',userId:'buyer',listingIds:'listing1',source:'PRO_NETWORK',networkId:'network1'}};
const req={headers:new Headers(),json:async()=>({listingId:'listing1'})};
let checks=0;async function test(name,fn){await fn();checks++;console.log('PASS '+name);}
(async()=>{
await test('Account fees and loss liability must belong to seller/Stripe',async()=>{assert(helper.isDirectChargeReady(goodAccount));for(const bad of [{...goodAccount,payouts_enabled:false},{...goodAccount,charges_enabled:false},{...goodAccount,controller:{fees:{payer:'application'},losses:{payments:'application'}}}]){account=bad;await assert.rejects(()=>helper.requireDirectChargeAccount(stripe,'acct_seller'));}});
await test('Marketplace payment created only on seller account without platform fees',async()=>{account=goodAccount;calls=[];const res=await marketplace.POST(req);assert.equal(res.status,200);assert.equal(calls.length,1);assert.deepEqual(calls[0].options,{stripeAccount:'acct_seller'});assert(!calls[0].params.payment_intent_data);assert(calls[0].params.success_url.includes('stripe_account=acct_seller'));});
await test('Stripe failure never falls back to platform checkout',async()=>{failCheckout=true;calls=[];const res=await marketplace.POST(req);assert.equal(res.status,502);assert.equal(calls.length,1);assert.equal(calls[0].options.stripeAccount,'acct_seller');failCheckout=false;});
await test('Cached onboarding cannot bypass fresh payout eligibility',async()=>{account={...goodAccount,payouts_enabled:false};calls=[];assert.equal((await marketplace.POST(req)).status,409);assert.equal(calls.length,0);account=goodAccount;});
await test('Paid network subscription is directly owned by host',async()=>{calls=[];assert.equal((await checkout.POST(req,{params:Promise.resolve({slug:'network'})})).status,200);assert.equal(calls[0].options.stripeAccount,'acct_seller');assert.equal(calls[0].params.subscription_data.metadata.networkId,'network1');assert(!calls[0].params.subscription_data.application_fee_percent);});
await test('Missing Stripe configuration cannot unlock paid network',async()=>{delete process.env.STRIPE_SECRET_KEY;const missing=load('app/api/pro-networks/[slug]/checkout/route.ts',{'@/lib/stripe-direct-connect':helper});assert.equal((await missing.POST(req,{params:Promise.resolve({slug:'network'})})).status,503);assert.equal(member,null);process.env.STRIPE_SECRET_KEY='sk_test_mock_only';});
await test('Forged account and unpaid receipt cannot grant purchase',async()=>{await assert.rejects(()=>helper.fulfillDirectCheckout(stripe,paid,'acct_other'));await assert.rejects(()=>helper.fulfillDirectCheckout(stripe,{...paid,payment_status:'unpaid'},'acct_seller'));assert.equal(purchases.size,0);});
await test('Repeated webhook and verification fulfill once with shop attribution',async()=>{await Promise.all([helper.fulfillDirectCheckout(stripe,paid,'acct_seller'),helper.fulfillDirectCheckout(stripe,paid,'acct_seller')]);assert.equal(purchases.size,1);assert.equal(notifications.length,2);assert.equal(purchases.get('listing1').networkId,'network1');assert.equal(purchases.get('listing1').price,12);});
await test('Duplicate network checkout increments membership count once',async()=>{const session={...paid,metadata:{type:'pro_network_sub',networkId:'network1',userId:'buyer'},subscription:'sub_1'};await Promise.all([helper.fulfillDirectCheckout(stripe,session,'acct_seller'),helper.fulfillDirectCheckout(stripe,session,'acct_seller')]);assert.equal(count,1);assert(hasNetworkMembership(member));});
await test('Cancel-at-period-end preserves paid access; final cancellation removes it once',async()=>{await helper.syncDirectNetworkSubscription({...sub,cancel_at_period_end:true},'acct_seller');assert(hasNetworkMembership(member));assert.equal(count,1);sub={...sub,status:'canceled'};await helper.syncDirectNetworkSubscription(sub,'acct_seller');await helper.syncDirectNetworkSubscription(sub,'acct_seller');assert(!hasNetworkMembership(member));assert.equal(count,0);});
await test('Failed renewal restricts access and paid renewal restores it',async()=>{sub={...sub,status:'active'};await helper.syncDirectNetworkSubscription(sub,'acct_seller');sub={...sub,status:'past_due'};await helper.handleDirectConnectEvent(stripe,{account:'acct_seller',type:'invoice.payment_failed',data:{object:{parent:{subscription_details:{subscription:'sub_1'}}}}});assert(!hasNetworkMembership(member));sub={...sub,status:'active'};await helper.handleDirectConnectEvent(stripe,{account:'acct_seller',type:'invoice.paid',data:{object:{parent:{subscription_details:{subscription:'sub_1'}}}}});assert(hasNetworkMembership(member));assert.equal(count,1);});
await test('Connected-session verification reads the seller account and checks buyer ownership',async()=>{
 const verify=load('app/api/stripe/verify-session/route.ts',{'@/lib/stripe-direct-connect':helper});
 let lookup;
 stripe.checkout.sessions.retrieve=async(id,params,options)=>{lookup=options;return paid;};
 assert.equal((await verify.POST({headers:new Headers(),json:async()=>({sessionId:'cs_1',stripeAccount:'acct_seller'})})).status,200);
 assert.deepEqual(lookup,{stripeAccount:'acct_seller'});
 stripe.checkout.sessions.retrieve=async()=>({...paid,metadata:{...paid.metadata,userId:'another-buyer'}});
 assert.equal((await verify.POST({headers:new Headers(),json:async()=>({sessionId:'cs_1',stripeAccount:'acct_seller'})})).status,403);
});
await test('Unrelated subscription metadata cannot create network access',async()=>{
 const previous=member;member=null;
 await helper.syncDirectNetworkSubscription({...sub,id:'sub_unknown'},'acct_seller');
 assert.equal(member,null);member=previous;
});
await test('Old subscription cancellation cannot revoke a replacement subscription',async()=>{
 const previous=member;member={...member,stripeSubscriptionId:'sub_new'};
 await helper.syncDirectNetworkSubscription({...sub,status:'canceled'},'acct_seller');
 assert.equal(member.stripeSubscriptionId,'sub_new');assert(hasNetworkMembership(member));member=previous;
});
console.log(checks+' payment regression scenarios passed. Stripe and database calls mocked; no live charges.');
})().catch(e=>{console.error(e);process.exitCode=1});
