// tests/regression.test.js
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const GameEngine = require('../server/game/GameEngine');
const { generateHackerChallenge, generateCivilianLabChallenges } = require('../server/game/challenges');
const EvidenceManager = require('../server/game/evidence');
const BotAI = require('../server/game/botAI');

describe('Regression: Existing Gameplay & Game Engine Domain Logic', () => {
  let engine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  afterEach(() => {
    if (engine) {
      engine.endGame();
      if (engine.botAI) engine.botAI.stop();
    }
  });

  test('Lobby initialization creates default 8 teams with 100% integrity', () => {
    assert.equal(engine.teams.length, 8);
    assert.equal(engine.teams[0].integrity, 100);
    assert.equal(engine.teams[0].score, 0);
    assert.equal(engine.teams[0].role, 'CIVILIAN');
    assert.equal(engine.phase, 'LOBBY');
  });

  test('Joining team assigns player and marks team non-bot', () => {
    const joined = engine.joinTeam('socket-1', 'GhostOperator', 'C01');
    assert.equal(joined.id, 'C01');
    assert.equal(joined.players.length, 1);
    assert.equal(joined.isBot, false);
    assert.equal(joined.players[0].name, 'GhostOperator');
  });

  test('Start game assigns exactly configured number of hackers', () => {
    engine.startGame();
    assert.equal(engine.phase, 'ROLE_ASSIGNMENT');
    const hackers = engine.teams.filter(t => t.role === 'HACKER');
    assert.equal(hackers.length, engine.hackerCount);
  });

  test('Hacker challenge generation produces valid challenge payload', () => {
    engine.startGame();
    const hacker = engine.teams.find(t => t.role === 'HACKER');
    const civilian = engine.teams.find(t => t.role === 'CIVILIAN');

    const challenge = engine.generateAttackChallenge(hacker.id, civilian.id, 'COOKIE_SHIFT');
    assert.ok(challenge);
    assert.equal(challenge.type, 'COOKIE_SHIFT');
    assert.ok(challenge.expectedSolution);
    assert.ok(challenge.initialData);
  });

  test('Hacker submits correct attack solution: damages target and awards +100 PTS', () => {
    engine.startGame();
    const hacker = engine.teams.find(t => t.role === 'HACKER');
    const civilian = engine.teams.find(t => t.role === 'CIVILIAN');

    const challenge = engine.generateAttackChallenge(hacker.id, civilian.id, 'COOKIE_SHIFT');
    const result = engine.submitAttackSolution(hacker.id, challenge.id, challenge.expectedSolution);

    assert.equal(result.success, true);
    assert.equal(hacker.score, 100);
    assert.equal(civilian.integrity, 80);
    assert.equal(civilian.modules.evidenceVault, 'DISABLED');
  });

  test('Hacker submits incorrect attack solution: penalizes -25 PTS', () => {
    engine.startGame();
    const hacker = engine.teams.find(t => t.role === 'HACKER');
    const civilian = engine.teams.find(t => t.role === 'CIVILIAN');

    const challenge = engine.generateAttackChallenge(hacker.id, civilian.id, 'COOKIE_SHIFT');
    const result = engine.submitAttackSolution(hacker.id, challenge.id, 'WRONG_MALFORMED_PAYLOAD');

    assert.equal(result.success, false);
    assert.equal(hacker.score, -25);
  });

  test('Civilian solves CTF lab challenge: awards +75 PTS and unlocks clue', () => {
    engine.startGame();
    const civilian = engine.teams.find(t => t.role === 'CIVILIAN');
    const chal = engine.civilianLabChallenges[0];

    const result = engine.solveCivilianChallenge(civilian.id, chal.id, chal.expected);
    assert.equal(result.success, true);
    assert.equal(civilian.score, chal.rewardScore);
    assert.ok(result.clue);

    // Duplicate solve rejected
    const dupResult = engine.solveCivilianChallenge(civilian.id, chal.id, chal.expected);
    assert.equal(dupResult.success, false);
    assert.match(dupResult.message, /already solved/i);
  });

  test('Tribunal: Correct accusation against hacker awards +300 PTS and eliminates hacker', () => {
    engine.startGame();
    const hacker = engine.teams.find(t => t.role === 'HACKER');
    const accuser = engine.teams.find(t => t.role === 'CIVILIAN');

    const accResult = engine.submitAccusation(accuser.id, hacker.id, ['EV-001'], 'Caught with forged token');
    assert.equal(accResult.success, true);
    assert.equal(engine.phase, 'DEFENCE_PHASE');

    // Resolve tribunal verdict
    engine.resolveAccusation();
    assert.equal(engine.phase, 'REVEAL_PHASE');
    assert.equal(accuser.score, 300);
    assert.equal(hacker.isEliminated, true);
    assert.equal(hacker.secretRevealed, true);
    assert.equal(engine.revealResult.success, true);
  });

  test('Tribunal: False accusation penalizes accuser -100 PTS and acquits civilian', () => {
    engine.startGame();
    const civilians = engine.teams.filter(t => t.role === 'CIVILIAN');
    const accuser = civilians[0];
    const innocentCivilian = civilians[1];

    engine.submitAccusation(accuser.id, innocentCivilian.id, [], 'Mistaken identity');
    engine.resolveAccusation();

    assert.equal(engine.phase, 'REVEAL_PHASE');
    assert.equal(accuser.score, -100);
    assert.equal(innocentCivilian.score, 50); // innocence compensation
    assert.equal(innocentCivilian.isEliminated, false);
    assert.equal(engine.revealResult.success, false);
  });

  test('BotAI initializes and stops cleanly', () => {
    const botAI = new BotAI(engine);
    botAI.start();
    assert.equal(botAI.isActive, true);
    botAI.stop();
    assert.equal(botAI.isActive, false);
  });
});
