const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require: name => (name in mocks ? mocks[name] : require(name)),
    process,
    console,
    Date,
    Math,
    URL,
    Set,
    Map,
    Promise,
    Array,
  });
  return exports;
}

const { isTicketedSpace, getTicketSalesStatus, generateTicketNumber, TICKET_CAPACITY_PACKS } = load('lib/ticketedProTalks.ts');
const { canAccessSpace } = load('lib/spaceAccess.ts', {
  '@/lib/ticketedProTalks': { isTicketedSpace },
});

(async () => {
  console.log("Running Ticketed Pro Talks Test Suite...");

  // 1. isTicketedSpace checks
  assert.equal(isTicketedSpace({ visibility: 'TICKETED' }), true);
  assert.equal(isTicketedSpace({ accessType: 'PAID' }), true);
  assert.equal(isTicketedSpace({ accessType: 'TICKETED' }), true);
  assert.equal(isTicketedSpace({ ticketPrice: 29.99 }), true);
  assert.equal(isTicketedSpace({ visibility: 'PUBLIC', accessType: 'FREE', ticketPrice: 0 }), false);
  assert.equal(isTicketedSpace({ visibility: 'PRIVATE', accessType: 'PRIVATE', ticketPrice: 0 }), false);
  assert.equal(isTicketedSpace(null), false);

  // 2. Ticket generation
  const tktNum = generateTicketNumber();
  assert.ok(tktNum.startsWith('TKT-'));

  // 3. Capacity Packs
  assert.equal(TICKET_CAPACITY_PACKS.length, 5);
  assert.equal(TICKET_CAPACITY_PACKS[0].price, 9.99);
  assert.equal(TICKET_CAPACITY_PACKS[1].price, 14.99);
  assert.equal(TICKET_CAPACITY_PACKS[2].price, 24.99);
  assert.equal(TICKET_CAPACITY_PACKS[3].price, 49.99);
  assert.equal(TICKET_CAPACITY_PACKS[4].price, 99.99);

  // 4. Ticket Sales Status helper
  const openStatus = getTicketSalesStatus({ accessType: 'PAID', ticketCapacity: 50, ticketsSold: 10 });
  assert.equal(openStatus.isOpen, true);
  assert.equal(openStatus.ticketsRemaining, 40);

  const soldOutStatus = getTicketSalesStatus({ accessType: 'PAID', ticketCapacity: 25, ticketsSold: 25 });
  assert.equal(soldOutStatus.isOpen, false);
  assert.equal(soldOutStatus.isSoldOut, true);
  assert.equal(soldOutStatus.ticketsRemaining, 0);

  const closedEarlyStatus = getTicketSalesStatus({ accessType: 'PAID', salesClosedEarly: true });
  assert.equal(closedEarlyStatus.isOpen, false);
  assert.equal(closedEarlyStatus.isClosedEarly, true);

  // 5. canAccessSpace access controls
  const ticketedSpace = {
    id: 'talk-1',
    visibility: 'TICKETED',
    accessType: 'PAID',
    ticketPrice: 29.99,
    hostId: 'host-1',
    coHostIds: ['cohost-1'],
    shareToken: null,
    tickets: [
      { userId: 'ticket-holder', status: 'CONFIRMED' },
      { userId: 'refunded-user', status: 'REFUNDED' },
    ],
  };

  const dummyReq = new NextRequest('http://localhost/api/spaces/talk-1', { method: 'POST' });

  // Unauthenticated user -> DENIED
  assert.equal(canAccessSpace(dummyReq, ticketedSpace, null), false);

  // Random authenticated user without ticket -> DENIED
  assert.equal(canAccessSpace(dummyReq, ticketedSpace, { id: 'random-user', role: 'MEMBER' }), false);

  // User with refunded ticket -> DENIED
  assert.equal(canAccessSpace(dummyReq, ticketedSpace, { id: 'refunded-user', role: 'MEMBER' }), false);

  // Confirmed ticket holder -> GRANTED
  assert.equal(canAccessSpace(dummyReq, ticketedSpace, { id: 'ticket-holder', role: 'MEMBER' }), true);

  // Host -> GRANTED
  assert.equal(canAccessSpace(dummyReq, ticketedSpace, { id: 'host-1', role: 'MEMBER' }), true);

  // Co-host -> GRANTED
  assert.equal(canAccessSpace(dummyReq, ticketedSpace, { id: 'cohost-1', role: 'MEMBER' }), true);

  // Admin -> GRANTED
  assert.equal(canAccessSpace(dummyReq, ticketedSpace, { id: 'admin-1', role: 'ADMIN' }), true);

  console.log("All Ticketed Pro Talks tests passed successfully!");
})();
