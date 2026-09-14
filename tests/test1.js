const assert = require('assert');
const { load } = require('./harness');
const { G, ctx, canvas, C, I } = load(900, 600);
const step = n => { for (let i = 0; i < n; i++) { G.update(1 / 60); } };
const act = () => { I.pressed.KeyE = true; G.update(1 / 60); };
const settle = () => step(60);
step(480); assert(G.state === 'play', 'intro ends'); G.draw();
// crowd walks
const xs = G.city.crowd.npcs.slice(0, 8).map(a => a.x); step(120); assert(G.city.crowd.npcs.slice(0, 8).some((a, i) => Math.abs(a.x - xs[i]) > 30), 'npcs move');
// player walks fast
const px = G.player.x; I.keys.KeyD = true; step(60); I.keys.KeyD = false; assert(G.player.x - px > 80, 'fast walk: ' + (G.player.x - px));
// go to lobby
G.player.x = ctx.TOWER.x + ctx.TOWER.w / 2; G.update(1/60); assert(ctx.UI.prompt === 'Enter lobby'); act(); settle(); assert(G.scene.name === 'lobby', 'in lobby'); G.draw();
// elevator to 83
G.player.x = 1010; G.update(1/60); assert(ctx.UI.prompt === 'Call elevator'); act(); settle(); assert(G.scene.name === 'elevator'); G.draw();
ctx.ElevatorScene.pick(G, 83); step(60 * 7); assert(G.scene.name === 'hall', 'arrived hall, is ' + G.scene.name); assert(G.floor === 83); G.draw();
// home
G.player.x = 720; G.update(1/60); assert(ctx.UI.prompt === 'Go home', ctx.UI.prompt); act(); settle(); assert(G.scene.name === 'apartment'); G.draw();
G.player.x = 640; G.update(1/60); const c0 = G.cash; act(); assert(G.cash === c0 + 40 && G.inv[0], 'wallet'); 
G.player.x = 950; G.update(1/60); act(); settle(); assert(G.scene.name === 'balcony'); step(60 * 9); G.draw(); assert(G.flags.balconyReveal);
// back in, elevator to roof and lobby
G.player.x = ctx.SCENES.balcony.x0 + 20; G.update(1/60); act(); settle(); assert(G.scene.name === 'apartment');
G.player.x = 60; G.update(1/60); act(); settle(); assert(G.scene.name === 'hall'); G.player.x = 100; G.update(1/60); act(); settle(); ctx.ElevatorScene.pick(G, 99); step(60 * 7); assert(G.scene.name === 'roof', G.scene.name); G.draw();
G.player.x = ctx.TOWER.x + ctx.TOWER.w / 2 - 150; G.update(1/60); act(); settle(); ctx.ElevatorScene.pick(G, 0); step(60 * 8); assert(G.scene.name === 'lobby', G.scene.name);
G.player.x = 60; G.update(1/60); act(); settle(); assert(G.scene.name === 'street'); G.draw();
// render everything at every zoom
let n = 0; for (const z of [2.4, 1, .42, .15, .06]) for (const a of Object.keys(ctx.ARCHETYPES)) for (const p of Object.keys(ctx.POSTURES)) { const act2 = new ctx.Actor(ctx.genCharacter(n++, a)); act2.setEmote(p, 5); act2.update(.5); ctx.inkW(z); act2.draw(canvas.getContext('2d'), z); }
// cross streets
G.player.x = G.city.inters[2].x; G.update(1/60); assert(ctx.UI.prompt && ctx.UI.prompt.startsWith('Cross to'), ctx.UI.prompt); act(); for (let i = 0; i < 200 && G.turn; i++) { G.update(1/60); if (i % 30 === 0) G.draw(); } assert(!G.turn, 'turn finished'); assert(G.city.dir === 'ns' && G.city.i === 2, 'on avenue ' + G.city.id); G.draw();
step(60); G.player.x = G.city.inters[1].x; G.update(1/60); assert(ctx.UI.prompt === 'Cross to Main Street', ctx.UI.prompt); act(); for (let i = 0; i < 200 && G.turn; i++) G.update(1/60); assert(G.city.isHome, 'back home'); assert(Math.abs(G.player.x - G.city.inters[2].x) < 140, 'at the same corner');
for (let i = 0; i < 4; i++) for (const d of ['ew', 'ns']) { G.setStreet(ctx.City.get(d, i)); G.player.x = 2000; C.snapTo(2000, -100, .42); C.tzoom = .42; step(30); G.draw(); C.snapTo(ctx.City.get(d, i).inters[1].x, -100, 1.2); C.tzoom = 1.2; step(5); G.draw(); }
G.setStreet(ctx.City.home()); assert(G.city.buildings.some(b => b.tower), 'tower on home street');
// travel loop
G.cash = 500; G.player.x = G.city.taxiX; G.update(1/60); assert(ctx.UI.prompt.startsWith('Taxi'), ctx.UI.prompt); act(); settle(); assert(G.scene.name === 'airport', G.scene.name); G.draw();
G.player.x = 640; G.update(1/60); act(); assert(ctx.AirportScene.board); G.draw();
for (const d of ctx.DESTS) { ctx.AirportScene.fly(G, d); settle(); assert(G.scene.name === 'flight'); G.draw(); step(60 * 6); assert(G.scene.name === 'landmark', G.scene.name + ' ' + d.id); step(30); G.draw(); step(60 * 5); G.draw();
  G.player.x = G.scene.w * .55; G.update(1/60); act(); G.player.x = 60; G.update(1/60); act(); settle(); step(60 * 6); assert(G.scene.name === 'airport', 'back at airport from ' + d.id); G.player.x = 640; G.update(1/60); act(); }
assert(G.stamps.length === ctx.DESTS.length, 'all stamps');
ctx.AirportScene.board = false; G.player.x = 60; G.update(1/60); act(); settle(); assert(G.scene.name === 'street');
console.log('test1 ok');
