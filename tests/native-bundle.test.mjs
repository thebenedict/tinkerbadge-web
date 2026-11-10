import test from 'node:test';
import {execFileSync} from 'node:child_process';
test('reviewed native bundle retains full license texts, source pins and shared names',()=>{execFileSync('python3',['-B','tests/native_bundle_test.py'],{stdio:'pipe'});});
