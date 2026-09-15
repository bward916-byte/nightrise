// headless harness: loads game.js in a vm with node-canvas, exposes Game
const fs = require('fs'), vm = require('vm'), { createCanvas } = require('canvas');
function load(w, h) {
  const canvas = createCanvas(w || 900, h || 600);
  const ctx = vm.createContext({ console, Math, Date, performance: { now: () => Date.now() }, setTimeout, Object, Array, Number, String, parseInt, JSON, Error, Set, Map });
  let out; ctx.__out = o => { out = o; };
  vm.runInContext(fs.readFileSync(__dirname + '/../game.js', 'utf8') + '\n;__out({Game,Camera,Input,UI,Actor,genCharacter,genPlayer,genCartMan,ARCHETYPES,POSTURES,inkW,dayPalette,buildCity,Crowd,TOWER,GROUND,SCENES,ElevatorScene,PLAYER_FLOOR,DESTS,AirportScene,LANDMARKS,City,BLOCK,Sfx,Music,Tex,Econ,Shop,OUTFITS,VENUES,FactoryScene});', ctx);
  out.Game.init(canvas);
  return { G: out.Game, ctx: out, canvas, C: out.Camera, I: out.Input, UI: out.UI };
}
module.exports = { load };
