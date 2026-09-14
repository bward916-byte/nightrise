// ===== crowd: lots of people, moving fast =====
class Crowd {
  constructor(city, count) {
    this.city = city; this.npcs = []; this.cars = [];
    const r = RNG(777), x0 = city.x0 - 300, x1 = city.x1 + 300;
    for (let i = 0; i < (count || 240); i++) {
      const a = new Actor(genCharacter(1000 + i));
      a.x = r.range(x0, x1); a.y = GROUND + r.range(6, WALK_DEPTH); a.facing = r.chance(.5) ? 1 : -1; a.dir = a.facing;
      a.wait = r.range(0, 3); a.spec.walkSpeed *= 1.35; this.npcs.push(a);
    }
    for (let i = 0; i < 26; i++) this.cars.push(new Car(i % 2, r.range(x0, x1), 500 + i));
  }
  update(dt, player, bounds) {
    const c = this.city, x0 = c.x0 - 300, x1 = c.x1 + 300;
    for (const a of this.npcs) {
      const near = a.x > bounds.x0 - 400 && a.x < bounds.x1 + 400;
      if (a.wait > 0) { a.wait -= dt; a.vx = a.vy = 0; }
      else {
        a.vx = a.dir * a.spec.walkSpeed; a.vy = 0; a.x += a.vx * dt;
        if ((a.dir > 0 && a.x > x1) || (a.dir < 0 && a.x < x0)) a.dir *= -1;
        if (Math.random() < dt * .03) { a.wait = 1 + Math.random() * 3; a.vx = 0; const em = ['think', 'phone', 'crossArms', 'handsHips', 'idleLook', 'pockets'][Math.floor(Math.random() * 6)]; a.setEmote(em, a.wait); }
      }
      if (near) a.update(dt); else { a.t += dt; }
    }
    for (const car of this.cars) car.update(dt, x0 - 400, x1 + 400);
  }
  drawBehind(ctx, pal, zoom, bounds) { for (const car of this.cars) if (car.lane === 0 && car.x > bounds.x0 - 200 && car.x < bounds.x1 + 200) car.draw(ctx, pal, zoom); }
  drawFront(ctx, pal, zoom, bounds) { for (const car of this.cars) if (car.lane === 1 && car.x > bounds.x0 - 200 && car.x < bounds.x1 + 200) car.draw(ctx, pal, zoom); }
  visible(bounds) { return this.npcs.filter(a => a.x > bounds.x0 - 100 && a.x < bounds.x1 + 100); }
}
