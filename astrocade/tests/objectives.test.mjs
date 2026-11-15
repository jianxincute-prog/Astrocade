import assert from 'node:assert';
import { OBJECTIVES, objectiveValues, objectiveRatio } from '../objectives.js';

const values = objectiveValues({ human: 22, elf: 9, dwarf: 4, orc: 11, werewolf: 3, wolf: 100 }, [1, 3, 2], 2);
assert.deepStrictEqual(values, { population: 49, realm: 3, peace: 2 });
assert.strictEqual(OBJECTIVES.length, 3);
assert.strictEqual(objectiveValues({}, [], 0).realm, 0);
assert.strictEqual(objectiveRatio(25, 50), .5);
assert.strictEqual(objectiveRatio(90, 50), 1);
assert.strictEqual(objectiveRatio(-1, 50), 0);
console.log('objectives tests ok');
