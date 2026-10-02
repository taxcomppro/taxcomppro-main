const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    require: name => (name in mocks ? mocks[name] : require(name)),
    process,
    console,
    Date,
    Math,
    URL,
    Set,
    Promise,
    Array,
  });
  return exports;
}

const mockUsers = [
  { id: 'user-1', name: 'Alice Smith', email: 'alice@example.com', image: null, headline: 'CPA', role: 'MEMBER', tier: 'VIP', isBrandAmbassador: false, spaceRsvps: [{ id: 'rsvp-1' }] },
  { id: 'user-2', name: 'Bob Jones', email: 'bob@example.com', image: null, headline: 'EA', role: 'MEMBER', tier: 'MARKETPLACE_PLUS', isBrandAmbassador: true, spaceRsvps: [] },
  { id: 'admin-1', name: 'Admin User', email: 'admin@taxcomppro.com', image: null, headline: 'Owner', role: 'ADMIN', tier: 'MARKETPLACE_PLUS', isBrandAmbassador: true, spaceRsvps: [] },
];

let rsvpsDb = [
  { id: 'rsvp-1', spaceId: 'talk-1', userId: 'user-1', name: 'Alice Smith', email: 'alice@example.com' },
];

const db = {
  user: {
    findUnique: async ({ where }) => mockUsers.find(u => u.id === where.id) || null,
    findMany: async ({ where, take }) => {
      let filtered = mockUsers;
      if (where?.OR) {
        const needle = where.OR[0]?.name?.contains?.toLowerCase() || '';
        filtered = filtered.filter(u => u.name.toLowerCase().includes(needle) || (u.email && u.email.toLowerCase().includes(needle)));
      }
      return filtered.slice(0, take || 50);
    },
  },
  space: {
    findUnique: async ({ where }) => ({ id: where.id, hostId: 'host-1', visibility: 'PUBLIC' }),
  },
  spaceRsvp: {
    findMany: async ({ where }) => rsvpsDb.filter(r => r.spaceId === where.spaceId),
    upsert: async ({ where, create, update, include }) => {
      const existing = rsvpsDb.find(r => r.spaceId === where.spaceId_userId.spaceId && r.userId === where.spaceId_userId.userId);
      if (existing) return existing;
      const created = { id: `rsvp-${Date.now()}`, ...create };
      rsvpsDb.push(created);
      return { ...created, user: mockUsers.find(u => u.id === created.userId) };
    },
    deleteMany: async ({ where }) => {
      const prevLen = rsvpsDb.length;
      rsvpsDb = rsvpsDb.filter(r => {
        if (where.id && r.id === where.id) return false;
        if (where.userId && r.spaceId === where.spaceId && r.userId === where.userId) return false;
        return true;
      });
      return { count: prevLen - rsvpsDb.length };
    },
  },
};

let session = null;
const auth = { api: { getSession: async () => session } };
const mocks = {
  '@/lib/auth': { auth },
  '@/lib/prisma': { prisma: db },
  '@/lib/spaceAccess': { canAccessSpace: () => true },
};

(async () => {
  const rsvpRoute = load('app/api/spaces/[id]/rsvp/route.ts', mocks);
  const searchRoute = load('app/api/spaces/[id]/rsvp/search-users/route.ts', mocks);
  const params = { params: Promise.resolve({ id: 'talk-1' }) };

  // 1. Non-admin cannot search members
  session = { user: { id: 'user-1', role: 'MEMBER' } };
  const unauthSearch = await searchRoute.GET(new NextRequest('http://localhost/api/spaces/talk-1/rsvp/search-users?q=bob'), params);
  assert.equal(unauthSearch.status, 403, 'Non-admin search must return 403');

  // 2. Admin can search members
  session = { user: { id: 'admin-1', role: 'ADMIN' } };
  const adminSearch = await searchRoute.GET(new NextRequest('http://localhost/api/spaces/talk-1/rsvp/search-users?q=bob'), params);
  assert.equal(adminSearch.status, 200);
  const searchJson = await adminSearch.json();
  assert.equal(searchJson.length, 1);
  assert.equal(searchJson[0].name, 'Bob Jones');
  assert.equal(searchJson[0].isRsvped, false);

  // 3. Non-admin cannot manually RSVP another user
  session = { user: { id: 'user-1', role: 'MEMBER' } };
  const unauthManualRsvp = await rsvpRoute.POST(
    new NextRequest('http://localhost/api/spaces/talk-1/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: 'user-2' }),
    }),
    params
  );
  assert.equal(unauthManualRsvp.status, 403, 'Non-admin manual RSVP must return 403');

  // 4. Admin CAN manually RSVP another user
  session = { user: { id: 'admin-1', role: 'ADMIN' } };
  const adminManualRsvp = await rsvpRoute.POST(
    new NextRequest('http://localhost/api/spaces/talk-1/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: 'user-2' }),
    }),
    params
  );
  assert.equal(adminManualRsvp.status, 201);
  const rsvpJson = await adminManualRsvp.json();
  assert.equal(rsvpJson.userId, 'user-2');
  assert.equal(rsvpJson.name, 'Bob Jones');

  // 5. Verify Bob is now RSVPed
  assert.ok(rsvpsDb.some(r => r.userId === 'user-2'));

  // 6. Non-admin cannot remove another user's RSVP
  session = { user: { id: 'user-1', role: 'MEMBER' } };
  const unauthDelete = await rsvpRoute.DELETE(
    new NextRequest('http://localhost/api/spaces/talk-1/rsvp?targetUserId=user-2', { method: 'DELETE' }),
    params
  );
  assert.equal(unauthDelete.status, 403, 'Non-admin cannot remove other user RSVP');

  // 7. Admin can remove another user's RSVP
  session = { user: { id: 'admin-1', role: 'ADMIN' } };
  const adminDelete = await rsvpRoute.DELETE(
    new NextRequest('http://localhost/api/spaces/talk-1/rsvp?targetUserId=user-2', { method: 'DELETE' }),
    params
  );
  assert.equal(adminDelete.status, 200);
  assert.equal(rsvpsDb.some(r => r.userId === 'user-2'), false);

  console.log('Passed all Admin Manual RSVP & Search unit tests!');
})();
