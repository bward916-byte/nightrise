// ===== character generator =====
// Everything about a person is data. The rig (04) turns a spec into a drawn body.
const SKIN = ['#f4d5b8', '#ecc19c', '#e0ad86', '#c98e66', '#b07650', '#8f5a3c', '#6e4128', '#4b2c1c', '#f2c9c0', '#d9a883'];
const HAIR_COL = ['#1b1512', '#2c1d14', '#4a2f1c', '#6b4726', '#8a5a2b', '#b08040', '#d8b56a', '#e6d3a3', '#8c8c8c', '#d9d9d9', '#a63a2a', '#3a2a3a'];
const HAIR_STYLE = ['bald', 'buzz', 'short', 'side', 'curly', 'afro', 'long', 'bun', 'ponytail', 'bob', 'mohawk', 'slick'];
const FACIAL = ['none', 'stubble', 'mustache', 'goatee', 'beard', 'bigBeard'];
const HATS = ['none', 'cap', 'capBack', 'beanie', 'fedora', 'bucket', 'hardhat', 'beret', 'sunhat', 'cowboy', 'trilby'];
const GLASSES = ['none', 'round', 'square', 'shades'];
const TOPS = ['tshirt', 'hoodie', 'shirt', 'blazer', 'suit', 'coat', 'tank', 'dress', 'gown', 'blouse', 'sweater', 'vest', 'jacket', 'tracksuit', 'rags'];
const BOTTOMS = ['jeans', 'slacks', 'shorts', 'skirt', 'pencil', 'sweatpants', 'chinos', 'none'];
const SHOES = ['sneakers', 'dress', 'heels', 'boots', 'sandals', 'flats', 'workboots'];
const ACCESSORIES = ['none', 'briefcase', 'purse', 'phone', 'coffee', 'backpack', 'umbrella', 'cane', 'bag', 'clutch', 'newspaper'];
const CLOTH = {
  neutral: ['#2b2f3a', '#3d4150', '#5a5f6b', '#8a8e96', '#c9c6bc', '#e8e3d6', '#4a3b2f', '#7a6b5a'],
  bright: ['#b0413e', '#d97a3a', '#d9b23a', '#3e8a5b', '#2f6f9f', '#5a4a9f', '#a3457f', '#2a8a8a'],
  suit: ['#1e2230', '#2b2e3e', '#3a3f52', '#4a4a4a', '#5a4a3a', '#1f2f3f', '#6a6a70'],
  fancy: ['#8a1f3d', '#1d1d24', '#c9a24a', '#3a6a9a', '#d94a6a', '#2e7a6a', '#e8e0d0', '#5a2a7a', '#c0392b'],
  pale: ['#f0ece2', '#e9dfd0', '#d7e3ee', '#f3d9d0', '#e3ecd7', '#f5f0e0'],
  rag: ['#5a5245', '#6e6152', '#4f4a44', '#7c6f5a', '#3f3a34'],
};

// archetype: what kind of person walks these streets
const ARCHETYPES = {
  everyman: { w: 6 }, business: { w: 5 }, fancy: { w: 3 }, casual: { w: 5 }, worker: { w: 2 },
  jogger: { w: 2 }, elder: { w: 2 }, tourist: { w: 2 }, hipster: { w: 2 }, student: { w: 3 },
};

function genCharacter(seed, forceArch, opts) {
  const r = RNG(seed);
  opts = opts || {};
  const arch = forceArch || r.weighted(Object.keys(ARCHETYPES).map(k => [k, ARCHETYPES[k].w]));
  const gender = opts.gender || (r.chance(.5) ? 'm' : 'f');
  const age = arch === 'elder' ? r.range(.75, 1) : arch === 'student' ? r.range(.05, .25) : r.range(.15, .7);
  const height = (gender === 'm' ? r.range(1.66, 1.92) : r.range(1.55, 1.80)) * (arch === 'elder' ? .96 : 1);
  const build = r.range(.85, 1.25) * (arch === 'jogger' ? .92 : 1);
  const skin = r.pick(SKIN);
  const c = {
    seed, arch, gender, age, height, build, skin,
    hair: { style: 'short', color: r.pick(HAIR_COL) },
    facial: 'none', hat: 'none', glasses: 'none',
    top: { type: 'tshirt', color: r.pick(CLOTH.neutral), color2: r.pick(CLOTH.pale) },
    bottom: { type: 'jeans', color: r.pick(CLOTH.neutral) },
    shoes: 'sneakers', shoeColor: r.pick(['#1c1a17', '#3a3a3a', '#e8e3d6', '#6b4726', '#b0413e']),
    accessory: 'none', tie: null, walkSpeed: r.range(1.0, 1.4) * M, sway: r.range(.6, 1.3),
    face: { eye: r.int(0, 2), brow: r.int(0, 2), nose: r.int(0, 2), lips: false },
    heels: false, skirt: null,
    // gait: how this particular body carries itself
    gait: { slouch: r.range(-.06, .22), headTilt: r.range(-.12, .18), armSwing: r.range(.45, 1.5), stride: r.range(.8, 1.2),
      bounce: r.range(.3, 1.8), cadence: r.range(.85, 1.2), kneeLift: r.range(.6, 1.4), sway: r.range(0, 1), idle: r.pick(['idle', 'idle', 'idleShift', 'pockets', 'idleLook']) },
  };
  if (age > .7) { c.hair.color = r.pick(['#8c8c8c', '#d9d9d9', '#bfb8ae', '#e8e6e0']); c.walkSpeed *= .6; c.gait.slouch += .18; c.gait.stride *= .7; c.gait.armSwing *= .6; c.gait.bounce *= .5; c.gait.headTilt += .15; }
  // hair by gender/age
  if (gender === 'm') {
    c.hair.style = age > .6 && r.chance(.45) ? r.pick(['bald', 'buzz', 'side']) : r.weighted([['short', 5], ['buzz', 3], ['side', 3], ['curly', 2], ['afro', 1], ['long', 1], ['bun', 1], ['slick', 2], ['mohawk', .3], ['bald', 1]]);
    c.facial = r.weighted([['none', 5], ['stubble', 3], ['mustache', 1], ['goatee', 1.5], ['beard', 2], ['bigBeard', .8]]);
  } else {
    c.hair.style = r.weighted([['long', 5], ['bob', 3], ['ponytail', 3], ['bun', 3], ['curly', 2], ['afro', 1.5], ['short', 1.5], ['side', 1]]);
    c.face.lips = r.chance(.75);
  }
  c.glasses = r.weighted([['none', 8], ['round', 1], ['square', 1.2], ['shades', 1]]);
  // outfit by archetype
  const pick = arr => r.pick(arr);
  switch (arch) {
    case 'business':
      c.top = { type: gender === 'm' ? 'suit' : r.pick(['blazer', 'suit']), color: pick(CLOTH.suit), color2: pick(CLOTH.pale) };
      c.bottom = { type: gender === 'm' ? 'slacks' : r.pick(['pencil', 'slacks']), color: c.top.color };
      c.shoes = gender === 'm' ? 'dress' : r.pick(['heels', 'flats']);
      c.shoeColor = '#1c1a17';
      c.tie = gender === 'm' ? pick(['#7a1f2d', '#1f3a7a', '#3a6a3a', '#c9a24a', '#2b2b2b']) : null;
      c.accessory = r.weighted([['briefcase', 4], ['phone', 3], ['coffee', 3], ['none', 2], ['bag', 1]]);
      c.hat = r.chance(.08) ? 'fedora' : 'none';
      c.walkSpeed *= 1.2; c.gait.slouch -= .08; c.gait.armSwing *= 1.2; c.gait.headTilt -= .08; c.gait.stride *= 1.1;
      break;
    case 'fancy':
      if (gender === 'f') {
        c.top = { type: r.pick(['dress', 'gown', 'dress']), color: pick(CLOTH.fancy), color2: pick(CLOTH.fancy) };
        c.bottom = { type: 'none', color: c.top.color };
        c.shoes = 'heels'; c.shoeColor = r.pick(['#1c1a17', '#c0392b', '#c9a24a', '#e8e3d6']);
        c.accessory = r.weighted([['clutch', 4], ['purse', 3], ['phone', 2], ['none', 1]]);
        c.hat = r.chance(.12) ? 'sunhat' : 'none';
        c.hair.style = r.pick(['long', 'bun', 'bob', 'long']);
      } else {
        c.top = { type: 'suit', color: pick(['#1d1d24', '#2b2b3a', '#3a2a2a', '#4a4a5a']), color2: '#f5f0e0' };
        c.bottom = { type: 'slacks', color: c.top.color }; c.shoes = 'dress'; c.tie = pick(['#1c1a17', '#7a1f2d', '#c9a24a']);
        c.accessory = r.pick(['none', 'phone', 'none']); c.hair.style = r.pick(['slick', 'side', 'short']);
      }
      c.walkSpeed *= .9; c.gait.slouch = -.1; c.gait.headTilt = -.12; c.gait.stride *= .85; c.gait.bounce *= .5; c.gait.sway = 1;
      break;
    case 'worker':
      c.top = { type: r.pick(['vest', 'shirt', 'jacket']), color: r.pick(['#e0a020', '#e07020', '#2f6f9f', '#5a5f6b']), color2: pick(CLOTH.neutral) };
      c.bottom = { type: r.pick(['jeans', 'chinos']), color: pick(['#3d4150', '#7a6b5a', '#4a3b2f']) };
      c.shoes = 'workboots'; c.shoeColor = '#6b4726'; c.hat = r.weighted([['hardhat', 5], ['cap', 3], ['none', 2]]);
      c.accessory = r.pick(['none', 'coffee', 'none', 'bag']);
      break;
    case 'jogger':
      c.top = { type: r.pick(['tank', 'tshirt', 'tracksuit']), color: pick(CLOTH.bright), color2: pick(CLOTH.pale) };
      c.bottom = { type: r.pick(['shorts', 'sweatpants']), color: pick(CLOTH.neutral) };
      c.shoes = 'sneakers'; c.shoeColor = pick(CLOTH.bright); c.hat = r.chance(.3) ? 'capBack' : 'none';
      c.hair.style = gender === 'f' ? 'ponytail' : c.hair.style; c.walkSpeed *= 2.4; c.run = true; c.gait.armSwing = 1; c.gait.slouch = .1;
      break;
    case 'elder':
      c.top = { type: r.pick(['sweater', 'coat', 'shirt', 'blazer']), color: pick(CLOTH.neutral), color2: pick(CLOTH.pale) };
      c.bottom = { type: r.pick(['slacks', 'chinos', gender === 'f' ? 'skirt' : 'slacks']), color: pick(CLOTH.neutral) };
      c.shoes = r.pick(['dress', 'flats', 'sneakers']); c.hat = r.weighted([['none', 5], ['fedora', 2], ['cap', 1], ['beret', 1], ['trilby', 1]]);
      c.accessory = r.weighted([['cane', 4], ['bag', 2], ['newspaper', 2], ['none', 3]]);
      break;
    case 'tourist':
      c.top = { type: r.pick(['tshirt', 'shirt']), color: pick(CLOTH.bright), color2: pick(CLOTH.pale) };
      c.bottom = { type: 'shorts', color: pick(CLOTH.pale) }; c.shoes = 'sandals'; c.shoeColor = '#6b4726';
      c.hat = r.weighted([['bucket', 4], ['cap', 3], ['sunhat', 2], ['none', 1]]); c.accessory = r.pick(['backpack', 'phone', 'phone', 'bag']);
      c.walkSpeed *= .8;
      break;
    case 'hipster':
      c.top = { type: r.pick(['jacket', 'sweater', 'shirt', 'vest']), color: pick(CLOTH.neutral), color2: pick(CLOTH.bright) };
      c.bottom = { type: r.pick(['jeans', 'chinos']), color: pick(['#2b2f3a', '#8a5a2b', '#3a5a3a']) };
      c.shoes = 'boots'; c.hat = r.weighted([['beanie', 4], ['fedora', 1], ['none', 3], ['beret', 1]]);
      if (gender === 'm') c.facial = r.pick(['beard', 'bigBeard', 'mustache', 'goatee']);
      c.glasses = r.weighted([['round', 3], ['none', 2], ['square', 1]]); c.accessory = r.pick(['coffee', 'bag', 'none', 'phone']);
      break;
    case 'student':
      c.top = { type: r.pick(['hoodie', 'tshirt', 'tshirt', 'jacket']), color: pick(CLOTH.neutral.concat(CLOTH.bright)), color2: pick(CLOTH.pale) };
      c.bottom = { type: r.pick(['jeans', 'shorts', 'sweatpants', gender === 'f' ? 'skirt' : 'jeans']), color: pick(CLOTH.neutral) };
      c.shoes = 'sneakers'; c.shoeColor = pick(['#e8e3d6', '#1c1a17', '#b0413e']); c.accessory = r.pick(['backpack', 'backpack', 'phone', 'coffee']);
      c.hat = r.weighted([['none', 6], ['cap', 2], ['beanie', 1], ['capBack', 1]]);
      c.gait.slouch += .12; c.gait.headTilt += .1; c.gait.idle = r.pick(['pockets', 'pockets', 'idleShift']);
      break;
    case 'casual':
      c.top = { type: r.pick(['tshirt', 'shirt', 'sweater', 'hoodie', gender === 'f' ? 'blouse' : 'tshirt']), color: pick(CLOTH.neutral.concat(CLOTH.bright)), color2: pick(CLOTH.pale) };
      c.bottom = { type: r.pick(['jeans', 'chinos', 'shorts', gender === 'f' ? 'skirt' : 'jeans']), color: pick(CLOTH.neutral) };
      c.shoes = r.pick(['sneakers', 'flats', 'boots', 'sneakers']); c.hat = r.weighted([['none', 7], ['cap', 2], ['beanie', 1]]);
      c.accessory = r.weighted([['none', 4], ['phone', 3], ['coffee', 2], ['bag', 2], ['purse', gender === 'f' ? 3 : 0], ['umbrella', .5]]);
      break;
    default: // everyman
      c.top = { type: r.pick(['tshirt', 'hoodie', 'shirt', 'jacket']), color: pick(CLOTH.neutral), color2: pick(CLOTH.pale) };
      c.bottom = { type: r.pick(['jeans', 'jeans', 'chinos']), color: pick(['#2b2f3a', '#3d4150', '#5a5f6b', '#4a3b2f']) };
      c.shoes = 'sneakers'; c.hat = r.weighted([['none', 6], ['cap', 2], ['beanie', 1]]);
      c.accessory = r.weighted([['none', 5], ['phone', 2], ['coffee', 2], ['bag', 1]]);
  }
  if (gender === 'f' && c.bottom.type === 'skirt') c.shoes = r.pick(['flats', 'heels', 'boots']);
  c.heels = c.shoes === 'heels';
  return c;
}

// The player: a regular guy. Hoodie, jeans, sneakers, no hat. Seeded so he always looks the same.
function genPlayer() {
  const c = genCharacter(8383, 'everyman', { gender: 'm' });
  c.skin = '#e0ad86'; c.hair = { style: 'short', color: '#2c1d14' }; c.facial = 'stubble'; c.glasses = 'none';
  c.top = { type: 'hoodie', color: '#7a4a3a', color2: '#c9c6bc' }; c.bottom = { type: 'jeans', color: '#4a5a72' };
  c.shoes = 'sneakers'; c.shoeColor = '#e8e3d6'; c.hat = 'none'; c.accessory = 'none'; c.height = 1.78; c.build = 1.02; c.age = .3;
  c.walkSpeed = 1.5 * M; c.isPlayer = true; c.gait = { slouch: .05, headTilt: .02, armSwing: 1, stride: 1, bounce: 1, cadence: 1, kneeLift: 1, sway: .3, idle: 'idleShift' };
  return c;
}
// The guy in the alley
function genCartMan() {
  const c = genCharacter(4242, 'everyman', { gender: 'm' });
  c.skin = '#c98e66'; c.hair = { style: 'long', color: '#8c8c8c' }; c.facial = 'bigBeard'; c.age = .8;
  c.top = { type: 'rags', color: '#5a5245', color2: '#7c6f5a' }; c.bottom = { type: 'sweatpants', color: '#4f4a44' };
  c.shoes = 'workboots'; c.shoeColor = '#3f3a34'; c.hat = 'beanie'; c.hatColor = '#6e6152'; c.accessory = 'none';
  c.height = 1.74; c.build = .95; c.walkSpeed = .7 * M; c.name = 'Cart guy'; c.gait.slouch = .28; c.gait.headTilt = .12;
  return c;
}
