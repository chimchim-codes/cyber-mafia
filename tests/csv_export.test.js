// tests/csv_export.test.js
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const gameService = require('../server/services/gameService');
const { resetMemoryStore, getServiceClient } = require('../server/db/supabaseClient');

describe('Phase 7: Export Final Results to CSV', () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  test('Produces valid CSV with all required headers and columns', async () => {
    const sessionId = 'session-csv-basic';
    await gameService.getOrCreateSession(sessionId, 4, 1);
    await gameService.startGame(sessionId);

    await gameService.recordScoreEvent({
      sessionId,
      teamId: 'C01',
      levelId: 1,
      eventType: 'COMPROMISE_SUCCESS',
      scoreDelta: 100,
      idempotencyKey: 'csv-c01-score'
    });

    await gameService.endGame(sessionId, 'ADMIN', 'Test completed');

    const { csvContent, filename, isProvisional } = await gameService.generateFinalResultsCsv(sessionId);

    assert.equal(isProvisional, false);
    assert.match(filename, /^cyber_mafia_results_session-csv-basic_\d{4}-\d{2}-\d{2}\.csv$/);

    const lines = csvContent.split('\r\n');
    assert.ok(lines.length >= 5); // 1 header + 4 teams

    // Check required headers
    const header = lines[0];
    assert.ok(header.includes('Rank'));
    assert.ok(header.includes('Team ID'));
    assert.ok(header.includes('Team Name'));
    assert.ok(header.includes('Final Score'));
    assert.ok(header.includes('Completion Status'));
    assert.ok(header.includes('Levels Completed'));
    assert.ok(header.includes('Game Start Timestamp'));
    assert.ok(header.includes('Game End Timestamp'));
    assert.ok(header.includes('Total Wall-Clock Duration'));
    assert.ok(header.includes('Total Paused Duration'));
    assert.ok(header.includes('Active Gameplay Duration'));
  });

  test('Formula injection protection: sanitizes user inputs starting with =, +, -, @', async () => {
    const sessionId = 'session-csv-injection';
    await gameService.getOrCreateSession(sessionId, 2, 1);

    // Inject malicious team name starting with formula characters
    const supabase = getServiceClient();
    await supabase.from('teams').update({
      name: '=cmd|"/C calc"!A0'
    }).eq('session_id', sessionId).eq('id', 'C01');

    await supabase.from('teams').update({
      name: '+SUM(1+1)'
    }).eq('session_id', sessionId).eq('id', 'C02');

    const { csvContent } = await gameService.generateFinalResultsCsv(sessionId);

    // Must be escaped with leading single quote `'`
    assert.ok(csvContent.includes("''=cmd|/\"\"/C calc\"\"!A0") || csvContent.includes("'=cmd") || csvContent.includes("\"'=cmd"));
    assert.ok(csvContent.includes("'+SUM(1+1)"));
  });

  test('Properly escapes Unicode characters, commas, and quotation marks', async () => {
    const sessionId = 'session-csv-unicode';
    await gameService.getOrCreateSession(sessionId, 2, 1);

    const supabase = getServiceClient();
    await supabase.from('teams').update({
      name: 'Cyber, "Alpha" Squad — 🛡️'
    }).eq('session_id', sessionId).eq('id', 'C01');

    const { csvContent } = await gameService.generateFinalResultsCsv(sessionId);

    // Double quotes must be escaped as `""` and wrapped in quotes
    assert.ok(csvContent.includes('"Cyber, ""Alpha"" Squad — 🛡️"'));
  });

  test('Provisional results labeling when match is still running', async () => {
    const sessionId = 'session-csv-provisional';
    await gameService.getOrCreateSession(sessionId, 2, 1);
    await gameService.startGame(sessionId);

    const { csvContent, isProvisional } = await gameService.generateFinalResultsCsv(sessionId);

    assert.equal(isProvisional, true);
    assert.ok(csvContent.includes('PROVISIONAL') || csvContent.includes('IN_PROGRESS'));
  });
});
