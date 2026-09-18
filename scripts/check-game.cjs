const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'node_modules/typescript'));
require.extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText, file);
const { generateCase, DIFFICULTY_ORDER } = require(path.join(root, 'lib/generator.ts'));
const { caseCode, parseCaseCode } = require(path.join(root, 'lib/rng.ts'));
const { scoreCase } = require(path.join(root, 'lib/scoring.ts'));
let cases = 0;
for (const [tier, difficulty] of DIFFICULTY_ORDER.entries()) {
  for (const seed of [0, 1, 31, 32, 12345, 999999, 2147483648, 4294967295]) {
    assert.deepEqual(parseCaseCode(caseCode(seed, tier)), {seed, difficultyIndex: tier});
    const cf = generateCase(seed, difficulty);
    assert.deepEqual(cf, generateCase(seed, difficulty));
    const atScene = cf.suspects.filter(s => cf.truth[s.id][cf.crimeSlotIndex] === cf.crimeLocationId);
    assert.deepEqual(atScene.map(s => s.id), [cf.solution.culpritId]);
    assert(cf.solution.keyEvidenceIds.length > 0);
    for (const id of cf.solution.keyEvidenceIds) assert(cf.evidence.some(e => e.id === id));
    const progress = {seed, startedAt: 0, elapsedMs: 60000, discovered: cf.evidence.map(e=>e.id), suspectStates: {}, board:{nodes:[],links:[]}, notes:'', questionsAsked:0, contradictionsFound:[], analysed:[], accusationAttempts:0, completed:false};
    const accusation = {suspectId:cf.solution.culpritId, topicId:cf.solution.lieTopicId, motiveId:cf.solution.motiveId, evidenceId:cf.solution.keyEvidenceIds[0]};
    assert.equal(scoreCase(cf, progress, accusation).result.outcome, 'perfect');
    accusation.suspectId=cf.suspects.find(s=>s.id!==cf.solution.culpritId).id;
    assert.equal(scoreCase(cf, progress, accusation).result.outcome, 'wrong');
    cases++;
  }
}
assert.equal(parseCaseCode('not a code'), null);
console.log(`${cases} sampled cases passed: determinism, code round trips, unique culprit, evidence references, correct/wrong scoring; invalid code rejected.`);

