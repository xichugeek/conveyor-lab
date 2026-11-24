import assert from 'node:assert/strict';
import {advance, beam, initialState, length, start} from './src/model.js';
function scenario(mode, speed) {
  let state=start(mode);
  for (let tick=0;tick<500;tick++) state=advance(state,.05,speed);
  return state;
}
const normal=scenario('normal',5);
assert.equal(normal.mode,'complete');
assert.equal(normal.x,length);
assert.equal(normal.events.filter(e=>e.includes('检测到')).length,1);
const jam=scenario('jam',5);
assert.equal(jam.mode,'alarm');
assert.equal(jam.x,beam);
assert.equal(jam.events.filter(e=>e.includes('AL01')).length,1);
assert.equal(advance(jam,.5,8),jam);
assert.equal(initialState().detected,false);
assert.equal(scenario('normal',2).mode,'complete');
console.log('PASS: normal route, single sensor event, jam alarm, locked stop, reset model and slower run.');

