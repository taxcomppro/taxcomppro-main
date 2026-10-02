const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');
function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => name in mocks ? mocks[name] : require(name), process, console, Date, Math, URL, Set, Promise, Array });
  return exports;
}
const { proTalkPublishPermissions } = load('lib/proTalkPermissions.ts');
const { canAccessSpace } = load('lib/spaceAccess.ts', { '@/lib/ticketedProTalks': { isTicketedSpace: (s) => s?.visibility === 'TICKETED' || s?.accessType === 'PAID' } });
const space = { id: 'talk', hostId: 'host', coHostIds: ['cohost'], visibility: 'PRIVATE', shareToken: 'secret', isLive: true, roomName: 'room' };
const req = (cookie, body) => new NextRequest('http://localhost/api/spaces/talk', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body || {}) });
let session = null;
let grant;
let tokenMetadata;
let updates = [];
const db = { spaceAttendance: { count: async () => 2, updateMany: async () => ({ count: 1 }) }, space: { findUnique: async () => space, update: async data => { updates.push(data); return space; } } };
const auth = { api: { getSession: async () => session } };
class AccessToken { constructor(_, __, options) { this.options = options; tokenMetadata = JSON.parse(options.metadata || "{}"); } addGrant(value) { grant = value; } async toJwt() { return 'test-token'; } }
let participantUpdate;
class RoomServiceClient { async deleteRoom() {} async getParticipant() { return { metadata: '{}' }; } async updateParticipant(room, identity, options) { participantUpdate = { room, identity, options }; } }
const mocks = { '@/lib/proTalkPermissions': { proTalkPublishPermissions }, '@/lib/ticketedProTalks': { isTicketedSpace: () => false }, '@/lib/auth': { auth }, '@/lib/prisma': { prisma: db }, '@/lib/spaceAccess': { canAccessSpace }, 'livekit-server-sdk': { AccessToken, RoomServiceClient } };
const params = { params: Promise.resolve({ id: 'talk' }) };
(async () => {
  assert.equal(canAccessSpace(req(), space), false);
  assert.equal(canAccessSpace(req('pro-talk-invite-talk=wrong'), space), false);
  assert.equal(canAccessSpace(req('pro-talk-invite-talk=secret'), space), true);
  assert.equal(canAccessSpace(req(), space, { id: 'host' }), true);
  assert.equal(canAccessSpace(req(), space, { id: 'cohost' }), true);
  assert.equal(canAccessSpace(req(), { ...space, visibility: 'PUBLIC' }), true);
  const guest = load('app/api/spaces/[id]/guest-token/route.ts', mocks);
  assert.equal((await guest.POST(req(), params)).status, 403);
  assert.equal((await guest.POST(req('pro-talk-invite-talk=secret', { displayName: 'Guest' }), params)).status, 200);
  assert.equal(grant.canPublish, false);
  const token = load('app/api/spaces/[id]/token/route.ts', mocks);
  session = { user: { id: 'attendee', name: 'Attendee' } };
  assert.equal((await token.POST(req(), params)).status, 403);
  assert.equal((await token.POST(req('pro-talk-invite-talk=secret'), params)).status, 200);
  assert.equal(grant.canPublish, false);
  session = { user: { id: 'cohost', name: 'Co-host' } };
  assert.equal((await token.POST(req(), params)).status, 200);
  assert.equal(grant.canPublish, true);
  session = { user: { id: 'admin', role: 'ADMIN' } };
  assert.equal((await token.POST(req(), params)).status, 200);
  assert.equal(grant.canPublish, false, 'An admin joins as audience');
  assert.equal(grant.canPublishSources.length, 0);
  assert.equal(tokenMetadata.role, 'ATTENDEE');
  assert.equal(tokenMetadata.isHost, false);
  session = { user: { id: 'host' } };
  await token.POST(req(), params);
  assert.equal(grant.canPublish, true);
  assert.equal(tokenMetadata.role, 'HOST');
  const stage = load('app/api/spaces/[id]/stage/route.ts', mocks);
  session = { user: { id: 'attendee' } };
  assert.equal((await stage.POST(req(null, { identity: 'attendee', action: 'speaker' }), params)).status, 403);
  session = { user: { id: 'cohost' } };
  assert.equal((await stage.POST(req(null, { identity: 'attendee', action: 'cohost' }), params)).status, 403);
  session = { user: { id: 'host' } };
  assert.equal((await stage.POST(req(null, { identity: 'attendee', action: 'speaker' }), params)).status, 200);
  assert.equal(participantUpdate.options.permission.canPublish, true);
  assert.equal((await stage.POST(req(null, { identity: 'attendee', action: 'audience' }), params)).status, 200);
  assert.equal(participantUpdate.options.permission.canPublish, false);
  assert.equal((await stage.POST(req(null, { identity: 'attendee', action: 'cohost' }), params)).status, 200);
  assert.equal(participantUpdate.options.permission.canPublish, true);
  assert.ok(updates.at(-1).data.coHostIds.includes('attendee'));
  const room = load('app/api/spaces/[id]/route.ts', mocks);
  updates = [];
  assert.equal((await room.PATCH(req(null, { visibility: 'PUBLIC' }), params)).status, 200);
  assert.equal(updates[0].data.visibility, 'PUBLIC');
  assert.equal(updates[0].data.isLive, undefined);
  assert.equal((await room.PATCH(req(null, { visibility: 'INVALID' }), params)).status, 400);
  for (const id of ['attendee', 'cohost']) {
    session = { user: { id } };
    assert.equal((await room.DELETE(req(), params)).status, 403);
  }
  for (const user of [{ id: 'host' }, { id: 'admin', role: 'ADMIN' }]) {
    session = { user };
    assert.equal((await room.DELETE(req(), params)).status, 200);
  }
  const { toggleProTalkScreenShare } = load('lib/proTalkScreenShare.ts');
  const { Track } = require('livekit-client');
  const publications = new Map();
  let captures = 0;
  const participant = {
    permissions: { canPublish: true },
    getTrackPublication: source => publications.get(source),
    unpublishTrack: async track => { publications.delete(track.source); track.stop(); },
    setScreenShareEnabled: async enabled => {
      assert.equal(enabled, false);
      for (const pub of [...publications.values()]) await participant.unpublishTrack(pub.track);
    },
    createScreenTracks: async () => {
      captures++;
      return [Track.Source.ScreenShare, Track.Source.ScreenShareAudio].map(source => ({
        source, mediaStreamTrack: { readyState: 'live' },
        stop() { this.mediaStreamTrack.readyState = 'ended'; }
      }));
    },
    publishTrack: async track => { publications.set(track.source, { track, isMuted: false }); }
  };
  await toggleProTalkScreenShare(participant);
  assert.equal(publications.size, 2);
  await toggleProTalkScreenShare(participant);
  assert.equal(publications.size, 0);
  await toggleProTalkScreenShare(participant);
  assert.equal(captures, 2, 'Co-host can restart without a new stage grant');
  publications.get(Track.Source.ScreenShare).track.stop();
  await toggleProTalkScreenShare(participant);
  assert.equal(captures, 3, 'Browser-ended capture is replaced');
  assert.equal(publications.size, 2);
  participant.permissions.canPublish = false;
  await toggleProTalkScreenShare(participant);
  assert.equal(captures, 3, 'Audience cannot capture');
  assert.equal(proTalkPublishPermissions(true).canPublishSources.length, 4);
  // Test attendance and RSVP access
  assert.equal(canAccessSpace(req(), { ...space, attendances: [{ userId: 'attendee' }] }, { id: 'attendee' }), true);
  assert.equal(canAccessSpace(req(), { ...space, rsvps: [{ userId: 'attendee' }] }, { id: 'attendee' }), true);
  assert.equal(canAccessSpace(req(), { ...space, attendances: [{ userId: 'other' }] }, { id: 'attendee' }), false);

  // Test GET /api/spaces spaces listing with private spaces
  let queriedWhere;
  const spacesDb = {
    space: {
      findMany: async ({ where }) => {
        queriedWhere = where;
        return [space];
      }
    },
    spaceRsvp: { findMany: async () => [{ spaceId: 'talk' }] },
    spaceAttendance: { findMany: async () => [{ spaceId: 'talk' }] },
    spaceTicket: { findMany: async () => [] },
  };
  const spacesRoute = load('app/api/spaces/route.ts', { ...mocks, '@/lib/prisma': { prisma: spacesDb } });
  session = { user: { id: 'attendee' } };
  const spacesReq = new NextRequest('http://localhost/api/spaces', { method: 'GET', headers: { cookie: 'pro-talk-invite-cookietalk=secret' } });
  const spacesRes = await spacesRoute.GET(spacesReq);
  assert.equal(spacesRes.status, 200);
  const spacesData = await spacesRes.json();
  assert.equal(spacesData[0].isRsvped, true);
  assert.equal(spacesData[0].hasJoined, true);
  // Verify visibility OR conditions included attendances, rsvps, host, cohosts, and invite cookies
  const orConds = queriedWhere.AND[0].OR;
  assert.ok(orConds.some(c => c.visibility === 'PUBLIC'));
  assert.ok(orConds.some(c => c.hostId === 'attendee'));
  assert.ok(orConds.some(c => c.rsvps?.some?.userId === 'attendee'));
  assert.ok(orConds.some(c => c.attendances?.some?.userId === 'attendee'));
  assert.ok(orConds.some(c => c.id === 'cookietalk' && c.shareToken === 'secret'));

  // Test GET /api/spaces/invite/[token] auto-joining for authenticated user
  let upsertCalled = false;
  const inviteDb = {
    space: {
      findUnique: async () => ({ id: 'talk', name: 'Talk', isLive: true, scheduledAt: null, endedAt: null }),
    },
    spaceAttendance: {
      upsert: async () => { upsertCalled = true; }
    },
    spaceRsvp: {
      upsert: async () => {}
    }
  };
  const inviteRoute = load('app/api/spaces/invite/[token]/route.ts', { ...mocks, '@/lib/prisma': { prisma: inviteDb } });
  session = { user: { id: 'attendee', name: 'Attendee' } };
  const inviteRes = await inviteRoute.GET(new NextRequest('http://localhost/api/spaces/invite/secret'), { params: Promise.resolve({ token: 'secret' }) });
  assert.equal(inviteRes.status, 200);
  assert.equal(upsertCalled, true);

  console.log('Passed: admin audience entry, host/admin-only room ending, repeat and browser-ended screen sharing.');
  console.log('Passed: invite access, guest/member publish grants, host-only stage management, promotion/demotion/co-host persistence, visibility updates.');
  
  // Test editing scheduled talk via PATCH
  const editDb = {
    space: {
      findUnique: async () => ({ id: 'talk', hostId: 'host', isLive: false, scheduledAt: new Date(Date.now() + 86400000) }),
      update: async ({ data }) => ({ id: 'talk', hostId: 'host', ...data }),
    }
  };
  const editRoute = load('app/api/spaces/[id]/route.ts', { ...mocks, '@/lib/prisma': { prisma: editDb } });
  session = { user: { id: 'host' } };
  const patchReq = new NextRequest('http://localhost/api/spaces/talk', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Updated Title', description: 'Updated Desc', category: 'IRS Audits & Notices' })
  });
  const patchRes = await editRoute.PATCH(patchReq, params);
  assert.equal(patchRes.status, 200);
  const patchData = await patchRes.json();
  assert.equal(patchData.name, 'Updated Title');
  assert.equal(patchData.description, 'Updated Desc');
  assert.equal(patchData.category, 'IRS Audits & Notices');

  // Test cancelling scheduled talk via DELETE
  let deleteCalled = false;
  const cancelDb = {
    space: {
      findUnique: async () => ({ id: 'talk', hostId: 'host', isLive: false, scheduledAt: new Date(Date.now() + 86400000), endedAt: null }),
      delete: async () => { deleteCalled = true; },
    }
  };
  const cancelRoute = load('app/api/spaces/[id]/route.ts', { ...mocks, '@/lib/prisma': { prisma: cancelDb } });
  session = { user: { id: 'host' } };
  const cancelReq = new NextRequest('http://localhost/api/spaces/talk?action=cancel', { method: 'DELETE' });
  const cancelRes = await cancelRoute.DELETE(cancelReq, params);
  assert.equal(cancelRes.status, 200);
  assert.equal(deleteCalled, true);

  console.log('Passed: private pro talks landing listing, auto-join on invite accept, attendance/RSVP access checks.');
  console.log('Passed: editing and cancelling scheduled pro talks.');
})().catch(error => { console.error(error); process.exitCode = 1; });
