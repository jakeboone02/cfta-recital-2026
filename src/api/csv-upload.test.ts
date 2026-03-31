import { describe, expect, test } from 'bun:test';
import { normalizeJsonArray } from './csv-upload';

describe('normalizeJsonArray', () => {
  // ── Valid JSON passthrough ──────────────────────────────────────────

  test('passes through a valid JSON array of strings', () => {
    expect(normalizeJsonArray('["A","B","C"]')).toBe('["A","B","C"]');
  });

  test('passes through a valid JSON array of numbers', () => {
    expect(normalizeJsonArray('[1,2,3]')).toBe('[1,2,3]');
  });

  test('passes through a valid JSON array with mixed types', () => {
    expect(normalizeJsonArray('[1,"PLACEHOLDER",2,3]')).toBe('[1,"PLACEHOLDER",2,3]');
  });

  test('passes through an empty JSON array', () => {
    expect(normalizeJsonArray('[]')).toBe('[]');
  });

  test('passes through a single-element string array', () => {
    expect(normalizeJsonArray('["A"]')).toBe('["A"]');
  });

  test('passes through a single-element number array', () => {
    expect(normalizeJsonArray('[1]')).toBe('[1]');
  });

  // ── Whitespace handling ─────────────────────────────────────────────

  test('trims outer whitespace before parsing valid JSON', () => {
    expect(normalizeJsonArray('  ["A","B"]  ')).toBe('["A","B"]');
  });

  test('trims whitespace around elements in bare lists', () => {
    expect(normalizeJsonArray('A , B , C')).toBe('["A","B","C"]');
  });

  test('trims whitespace inside brackets with unquoted values', () => {
    expect(normalizeJsonArray('[ A , B , C ]')).toBe('["A","B","C"]');
  });

  // ── Unquoted bracket arrays ─────────────────────────────────────────

  test('normalizes unquoted string values in brackets', () => {
    expect(normalizeJsonArray('[OPENER,A,B,CLOSER]')).toBe('["OPENER","A","B","CLOSER"]');
  });

  test('normalizes unquoted numbers in brackets', () => {
    expect(normalizeJsonArray('[1,2,3]')).toBe('[1,2,3]');
  });

  test('normalizes mixed unquoted numbers and strings in brackets', () => {
    expect(normalizeJsonArray('[1,PLACEHOLDER,2,3]')).toBe('[1,"PLACEHOLDER",2,3]');
  });

  test('normalizes single unquoted string in brackets', () => {
    expect(normalizeJsonArray('[OPENER]')).toBe('["OPENER"]');
  });

  test('normalizes single unquoted number in brackets', () => {
    expect(normalizeJsonArray('[42]')).toBe('[42]');
  });

  // ── Bare lists (no brackets) ────────────────────────────────────────

  test('normalizes a bare comma-separated list of strings', () => {
    expect(normalizeJsonArray('OPENER,A,B,CLOSER')).toBe('["OPENER","A","B","CLOSER"]');
  });

  test('normalizes a bare comma-separated list of numbers', () => {
    expect(normalizeJsonArray('1,2,3')).toBe('[1,2,3]');
  });

  test('normalizes a bare mixed list', () => {
    expect(normalizeJsonArray('1,PLACEHOLDER,2,3')).toBe('[1,"PLACEHOLDER",2,3]');
  });

  test('normalizes a single bare string', () => {
    expect(normalizeJsonArray('A')).toBe('["A"]');
  });

  test('normalizes a single bare number', () => {
    expect(normalizeJsonArray('7')).toBe('[7]');
  });

  // ── Partially-quoted values ─────────────────────────────────────────

  test('handles some quoted and some unquoted values in brackets', () => {
    expect(normalizeJsonArray('["OPENER",A,B,"CLOSER"]')).toBe('["OPENER","A","B","CLOSER"]');
  });

  test('handles quoted numbers mixed with unquoted strings', () => {
    // "3" is already quoted so it stays as a string after normalization
    expect(normalizeJsonArray('[1,PLACEHOLDER,"3"]')).toBe('[1,"PLACEHOLDER","3"]');
  });

  // ── PLACEHOLDER-specific cases ──────────────────────────────────────

  test('normalizes show_order-style array with PLACEHOLDERs', () => {
    expect(normalizeJsonArray('[5,12,PLACEHOLDER,8,3,PLACEHOLDER,19,7]')).toBe(
      '[5,12,"PLACEHOLDER",8,3,"PLACEHOLDER",19,7]'
    );
  });

  test('normalizes bare show_order-style list with PLACEHOLDERs', () => {
    expect(normalizeJsonArray('5,12,PLACEHOLDER,8,3,PLACEHOLDER,19,7')).toBe(
      '[5,12,"PLACEHOLDER",8,3,"PLACEHOLDER",19,7]'
    );
  });

  test('normalizes an array of only PLACEHOLDERs', () => {
    expect(normalizeJsonArray('[PLACEHOLDER,PLACEHOLDER]')).toBe('["PLACEHOLDER","PLACEHOLDER"]');
  });

  // ── group_order-style cases ─────────────────────────────────────────

  test('normalizes a typical group_order', () => {
    expect(normalizeJsonArray('[OPENER,A,B,CLOSER]')).toBe('["OPENER","A","B","CLOSER"]');
  });

  test('normalizes group_order with a MIDDLE group', () => {
    expect(normalizeJsonArray('[OPENER,A,MIDDLE,B,CLOSER]')).toBe(
      '["OPENER","A","MIDDLE","B","CLOSER"]'
    );
  });

  // ── Edge cases ──────────────────────────────────────────────────────

  test('handles negative numbers', () => {
    expect(normalizeJsonArray('[-1,2,-3]')).toBe('[-1,2,-3]');
  });

  test('handles decimal numbers', () => {
    expect(normalizeJsonArray('[1.5,2.7]')).toBe('[1.5,2.7]');
  });

  test('handles zero', () => {
    expect(normalizeJsonArray('[0]')).toBe('[0]');
  });

  test('handles CSV-escaped JSON (double-quoted inner quotes)', () => {
    // When a spreadsheet exports JSON inside CSV, the cell value arrives
    // with escaped quotes already resolved by the CSV parser, so the
    // function receives valid JSON
    expect(normalizeJsonArray('["OPENER","A","B","CLOSER"]')).toBe('["OPENER","A","B","CLOSER"]');
  });

  test('handles single-quoted string values', () => {
    expect(normalizeJsonArray("['A','B','C']")).toBe('["A","B","C"]');
  });

  test('preserves string casing', () => {
    expect(normalizeJsonArray('[opener,Closer,MiDdLe]')).toBe('["opener","Closer","MiDdLe"]');
  });

  test('treats empty-string elements as empty strings', () => {
    // "1,,3" splits to ["1", "", "3"]; "" is not a valid number so stays as ""
    const result = JSON.parse(normalizeJsonArray('1,,3'));
    expect(result).toEqual([1, '', 3]);
  });
});
