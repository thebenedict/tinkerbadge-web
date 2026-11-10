import test from 'node:test';
import {execFileSync} from 'node:child_process';
test('source-backed names preserve roles, exact identities and shared metadata',()=>{execFileSync('python3',['-B','tests/component_names_test.py'],{stdio:'pipe'});});
