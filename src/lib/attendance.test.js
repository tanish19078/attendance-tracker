import { describe, it, expect } from 'vitest';
import {
  toLocalKey,
  parseLocalDate,
  futureClassDates,
  computeSubjectStats,
  computeOverall,
} from './attendance.js';

// A fixed "today" so tests are deterministic regardless of when they run.
// Local midnight — the module works entirely in local time.
const TODAY = new Date(2026, 0, 1); // Thu, 1 Jan 2026

describe('date helpers', () => {
  it('formats a local date key without UTC shifting', () => {
    // Late-evening local time must still report the same calendar day, even
    // though toISOString() would roll it to the next day in +5:30 zones.
    const d = new Date(2026, 0, 1, 23, 30);
    expect(toLocalKey(d)).toBe('2026-01-01');
  });

  it('round-trips a key through parse and format', () => {
    expect(toLocalKey(parseLocalDate('2026-03-15'))).toBe('2026-03-15');
  });
});

describe('futureClassDates', () => {
  const everyWeekday = [0, 1, 1, 1, 1, 1, 0]; // one class Mon–Fri

  it('starts counting from the day after today', () => {
    // Jan 1 2026 is a Thursday; today itself is excluded.
    const dates = futureClassDates(everyWeekday, '2026-01-09', [], [], TODAY);
    // Fri Jan 2, Mon 5, Tue 6, Wed 7, Thu 8, Fri 9 = 6 classes
    expect(dates.length).toBe(6);
    expect(toLocalKey(dates[0])).toBe('2026-01-02');
  });

  it('skips holidays and leaves', () => {
    const dates = futureClassDates(
      everyWeekday,
      '2026-01-09',
      ['2026-01-05'], // holiday Monday
      ['2026-01-06'], // leave Tuesday
      TODAY
    );
    expect(dates.length).toBe(4);
    const keys = dates.map(toLocalKey);
    expect(keys).not.toContain('2026-01-05');
    expect(keys).not.toContain('2026-01-06');
  });

  it('emits one entry per class on multi-class days', () => {
    const twoOnFriday = [0, 0, 0, 0, 0, 2, 0];
    const dates = futureClassDates(twoOnFriday, '2026-01-09', [], [], TODAY);
    // Fri Jan 2 (2) + Fri Jan 9 (2) = 4 instances
    expect(dates.length).toBe(4);
  });

  it('returns nothing when there is no end date', () => {
    expect(futureClassDates(everyWeekday, '', [], [], TODAY)).toEqual([]);
  });
});

describe('computeSubjectStats — core percentages', () => {
  const base = {
    targetPercentage: 75,
    semesterEndDate: '2026-01-01', // no future classes -> pure "current" math
    holidays: [],
    leaves: [],
    today: TODAY,
  };

  it('computes current % as (attended + dl) / delivered', () => {
    const s = computeSubjectStats({ delivered: 20, attended: 15, dl: 0, schedule: [0, 0, 0, 0, 0, 0, 0] }, base);
    expect(s.currentPct).toBeCloseTo(75);
  });

  it('counts DL as present', () => {
    const s = computeSubjectStats({ delivered: 20, attended: 13, dl: 2, schedule: [0, 0, 0, 0, 0, 0, 0] }, base);
    // (13 + 2) / 20 = 75%
    expect(s.present).toBe(15);
    expect(s.currentPct).toBeCloseTo(75);
  });

  it('reports 0% for a subject with no delivered classes', () => {
    const s = computeSubjectStats({ delivered: 0, attended: 0, dl: 0, schedule: [0, 0, 0, 0, 0, 0, 0] }, base);
    expect(s.currentPct).toBe(0);
  });

  it('clamps attended above delivered so % never exceeds 100', () => {
    const s = computeSubjectStats({ delivered: 10, attended: 99, dl: 0, schedule: [0, 0, 0, 0, 0, 0, 0] }, base);
    expect(s.attended).toBe(10);
    expect(s.currentPct).toBeCloseTo(100);
  });
});

describe('computeSubjectStats — status zones', () => {
  const opts = {
    targetPercentage: 75,
    semesterEndDate: '2026-01-16', // two future weeks
    holidays: [],
    leaves: [],
    today: TODAY,
  };
  const schedule = [0, 1, 1, 1, 1, 1, 0]; // Mon–Fri

  it('SAFE: present already meets the requirement for the final total', () => {
    // delivered 40, present 39 (97.5%); 11 future classes over the two weeks.
    // finalTotal 51, required ceil(0.75*51)=39, present 39 -> nothing owed.
    const s = computeSubjectStats({ delivered: 40, attended: 39, dl: 0, schedule }, opts);
    expect(s.status).toBe('safe');
    expect(s.mustAttend).toBe(0);
    expect(s.canMiss).toBeGreaterThan(0);
  });

  it('WARNING: must attend some of the remaining classes', () => {
    // delivered 20, present 14 (70%) -> below 75, but recoverable.
    const s = computeSubjectStats({ delivered: 20, attended: 14, dl: 0, schedule }, opts);
    expect(s.status).toBe('warning');
    expect(s.mustAttend).toBeGreaterThan(0);
    expect(s.mustAttend).toBeLessThanOrEqual(s.future);
    expect(s.recommendedDates.length).toBeGreaterThan(0);
  });

  it('IMPOSSIBLE: target unreachable even attending everything', () => {
    // delivered 20, present 2 (10%), few future classes.
    const s = computeSubjectStats({ delivered: 20, attended: 2, dl: 0, schedule }, opts);
    expect(s.status).toBe('impossible');
    expect(s.mustAttend).toBeGreaterThan(s.future);
    expect(s.maxPossiblePct).toBeLessThan(75);
  });

  it('canMiss + required accounting is internally consistent', () => {
    const s = computeSubjectStats({ delivered: 20, attended: 16, dl: 0, schedule }, opts);
    // present + future - required, floored at 0
    expect(s.canMiss).toBe(Math.max(0, s.present + s.future - s.required));
  });
});

describe('computeSubjectStats — rounding at the boundary', () => {
  it('uses ceil so a fractional requirement rounds up', () => {
    // finalTotal 33, target 75% -> 24.75 -> required 25.
    const s = computeSubjectStats(
      { delivered: 33, attended: 33, dl: 0, schedule: [0, 0, 0, 0, 0, 0, 0] },
      { targetPercentage: 75, semesterEndDate: '2026-01-01', today: TODAY }
    );
    expect(s.required).toBe(25);
  });
});

describe('computeOverall', () => {
  const opts = {
    targetPercentage: 75,
    semesterEndDate: '2026-01-01', // isolate current math
    holidays: [],
    leaves: [],
    today: TODAY,
  };
  const noFuture = [0, 0, 0, 0, 0, 0, 0];

  it('aggregates present and delivered across subjects', () => {
    const subjects = [
      { delivered: 10, attended: 8, dl: 0, schedule: noFuture },
      { delivered: 20, attended: 16, dl: 0, schedule: noFuture },
    ];
    const o = computeOverall(subjects, opts);
    expect(o.present).toBe(24);
    expect(o.delivered).toBe(30);
    expect(o.currentPct).toBeCloseTo(80);
  });

  it('reports 0% overall when nothing has been delivered', () => {
    const o = computeOverall([{ delivered: 0, attended: 0, dl: 0, schedule: noFuture }], opts);
    expect(o.currentPct).toBe(0);
  });
});
