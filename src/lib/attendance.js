// Pure attendance math — no React, no DOM, fully unit-testable.
//
// Attendance model (locked with the user):
//   - "delivered" = total classes conducted so far (attended is a subset of it)
//   - "attended"  = classes the student was present for
//   - "dl"        = duty/medical leave, COUNTED AS PRESENT
//
//   currentPct = (attended + dl) / delivered * 100
//
// For a target t% over the whole semester, let:
//   future   = number of class instances still to be conducted
//   T        = delivered + future            (final total classes)
//   present  = attended + dl                 (effective present count now)
//   required = ceil(t/100 * T)               (present classes needed by the end)
//   mustAttend = required - present           (of the future classes)
//   canMiss    = (present + future) - required
//
// Status:
//   mustAttend <= 0            -> "safe"       (target already locked in)
//   mustAttend >  future       -> "impossible" (cannot reach target)
//   otherwise                  -> "warning"    (must attend some future classes)

// ---------------------------------------------------------------------------
// Date helpers — LOCAL time only.
//
// The previous code keyed dates with `.toISOString().split('T')[0]`, which
// converts local -> UTC. East of UTC (e.g. IST, +5:30) that rolls the date
// back a day, so holidays/leaves and the weekday schedule matched the wrong
// day. Everything here works in the browser's local timezone instead.
// ---------------------------------------------------------------------------

/** Format a Date as a local `YYYY-MM-DD` key (no UTC conversion). */
export function toLocalKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse a `YYYY-MM-DD` string into a local Date at midnight. */
export function parseLocalDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** A new Date set to local midnight (strips the time component). */
export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// ---------------------------------------------------------------------------
// Future class enumeration
// ---------------------------------------------------------------------------

/**
 * List every future class instance (as Date objects) between `from` (exclusive)
 * and `end` (inclusive), skipping holidays and leaves. A day with N classes
 * for the subject produces N entries for that date.
 *
 * @param {number[]} schedule  7 numbers, Sun..Sat, = classes on that weekday
 * @param {string}   endKey    semester end date, `YYYY-MM-DD`
 * @param {string[]} holidays  date keys with no classes for anyone
 * @param {string[]} leaves    date keys the student is away
 * @param {Date}     [from]    reference "today"; defaults to now (local midnight)
 */
export function futureClassDates(schedule, endKey, holidays = [], leaves = [], from = new Date()) {
  const dates = [];
  if (!endKey) return dates;

  const end = parseLocalDate(endKey);
  const skip = new Set([...holidays, ...leaves]);

  // Start from the day AFTER today: today's classes are already reflected in
  // the delivered/attended counts the student typed in.
  const cursor = startOfDay(from);
  cursor.setDate(cursor.getDate() + 1);

  while (cursor <= end) {
    const key = toLocalKey(cursor);
    if (!skip.has(key)) {
      const count = Number(schedule?.[cursor.getDay()]) || 0;
      for (let i = 0; i < count; i++) dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

// ---------------------------------------------------------------------------
// Core projection
// ---------------------------------------------------------------------------

/**
 * Compute all attendance stats for a single subject.
 *
 * @param {object} subject  { delivered, attended, dl, schedule }
 * @param {object} opts     { targetPercentage, semesterEndDate, holidays, leaves, today }
 */
export function computeSubjectStats(subject, opts) {
  const {
    targetPercentage = 75,
    semesterEndDate,
    holidays = [],
    leaves = [],
    today = new Date(),
  } = opts || {};

  const delivered = Math.max(0, Number(subject.delivered) || 0);
  const attendedRaw = Math.max(0, Number(subject.attended) || 0);
  const dl = Math.max(0, Number(subject.dl) || 0);

  // Guard against impossible inputs: you can't have attended more than were
  // conducted. Clamp so the math can never report >100% by accident.
  const attended = Math.min(attendedRaw, delivered);
  const present = Math.min(attended + dl, delivered);

  const futureDates = futureClassDates(
    subject.schedule,
    semesterEndDate,
    holidays,
    leaves,
    today
  );
  const future = futureDates.length;

  const finalTotal = delivered + future;
  const currentPct = delivered === 0 ? 0 : (present / delivered) * 100;

  const required = Math.ceil((targetPercentage / 100) * finalTotal);
  const mustAttend = Math.max(0, required - present);
  // How many of the remaining classes you may skip and still hit the target.
  const canMiss = Math.max(0, present + future - required);

  let status;
  if (finalTotal === 0) {
    status = 'empty';
  } else if (required - present <= 0) {
    status = 'safe';
  } else if (mustAttend > future) {
    status = 'impossible';
  } else {
    status = 'warning';
  }

  // Best percentage still achievable if you attend every remaining class.
  const maxPossiblePct = finalTotal === 0 ? 0 : ((present + future) / finalTotal) * 100;

  // Earliest future dates you must attend to satisfy `mustAttend`.
  // Counts individual class instances but lists each calendar date once, so a
  // day with two required classes doesn't show twice.
  const recommendedDates = [];
  if (status === 'warning') {
    const seen = new Set();
    let accumulated = 0;
    for (const d of futureDates) {
      if (accumulated >= mustAttend) break;
      accumulated++;
      const key = toLocalKey(d);
      if (!seen.has(key)) {
        seen.add(key);
        recommendedDates.push(d);
      }
    }
  }

  return {
    delivered,
    attended,
    dl,
    present,
    future,
    finalTotal,
    currentPct,
    required,
    mustAttend,
    canMiss,
    maxPossiblePct,
    status,
    recommendedDates,
  };
}

// ---------------------------------------------------------------------------
// Overall (all subjects combined)
// ---------------------------------------------------------------------------

/**
 * Aggregate stats across every subject: current overall %, and the projected
 * overall % if every remaining class is attended.
 */
export function computeOverall(subjects, opts) {
  let present = 0;
  let delivered = 0;
  let future = 0;

  for (const s of subjects) {
    const st = computeSubjectStats(s, opts);
    present += st.present;
    delivered += st.delivered;
    future += st.future;
  }

  const finalTotal = delivered + future;
  return {
    present,
    delivered,
    future,
    finalTotal,
    currentPct: delivered === 0 ? 0 : (present / delivered) * 100,
    projectedPct: finalTotal === 0 ? 0 : ((present + future) / finalTotal) * 100,
  };
}
