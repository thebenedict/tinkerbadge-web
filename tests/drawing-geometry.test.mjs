import test from 'node:test';
import assert from 'node:assert/strict';
import {mirroredViewBox} from '../src/drawing-geometry.js';
test('mirroring a focused PCB view keeps its component in view',()=>{
  const front=[16.05,10,22,14],back=mirroredViewBox(front,40);
  const selectedBackX=80-27.05;
  assert.ok(selectedBackX>=back[0]&&selectedBackX<=back[0]+back[2]);
  mirroredViewBox(back,40).forEach((value,index)=>assert.ok(Math.abs(value-front[index])<1e-10));
});
test('mirroring a fitted board keeps the full viewport unchanged',()=>{assert.deepEqual(mirroredViewBox([98.5,98.5,113,103],155),[98.5,98.5,113,103]);});
