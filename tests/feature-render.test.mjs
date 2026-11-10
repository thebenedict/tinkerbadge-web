import test from 'node:test';
import {execFileSync} from 'node:child_process';
test('native overview calibration, PNG decoding, and frozen asset bindings',()=>{execFileSync('python3',['-B','tests/feature_render_test.py'],{stdio:'pipe'});});
