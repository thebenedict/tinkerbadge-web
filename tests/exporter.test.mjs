import test from 'node:test';
import {execFileSync} from 'node:child_process';
test('native source metadata and conflict checks',()=>{execFileSync('python3',['tests/exporter_test.py'],{stdio:'pipe'});});
