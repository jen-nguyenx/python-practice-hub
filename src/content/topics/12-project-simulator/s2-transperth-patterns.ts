import type { Scenario } from '../../schema.ts';

// Virtual data files for the closest-station project question. No .csv extension on purpose.
const STATIONS_A = `Station,Line,Weekday,Saturday,Sunday
Cottesloe,Fremantle,1850,1420,1310
Claremont,Fremantle,2400,1100,760
Murdoch,Mandurah,9800,3100,2300
Warwick,Joondalup,4200,1900,1500
Fremantle,Fremantle,5200,4800,4600
`;

const STATIONS_B = `Zone,Sunday,STATION,Weekday,Line,Saturday
1,640,Leederville,3100,Joondalup,980
2,2900,Joondalup,8700,Joondalup,3600
1,1150,subiaco,4600,Fremantle,1900
2,700,Glendalough,2900,Joondalup,1000
`;

const STATIONS_C = `Station,Line,Weekday,Saturday,Sunday
Bassendean,Midland,400,200,200
Maylands,Midland,200,400,200
Ashfield,Midland,200,200,400
Guildford,Midland,200,400,200
`;

const STATIONS_D = `Station,Line,Weekday,Saturday,Sunday
Midland,Midland,3900,n/a,1200
Midland,Midland,3900,1500,1200
Cannington,Armadale,5100,2600,1900
Armadale,Armadale,2800,-40,700
Armadale,Armadale,2800,1300,700
Kelmscott,Armadale,1600,12.5,500
Beckenham,Armadale,1400,650,
Oats Street,Armadale,0,0,0

Cannington,Armadale,100,9000,9000
Burswood,Armadale,1200,2200,2600
`;

const STATIONS_E = `Station,Line,Weekday,Saturday,Sunday
Mandurah,Mandurah,3000,1800,1500
Rockingham,Mandurah,n/a,1400,1100
`;

const s2: Scenario = {
  id: 't12-s2',
  title: 'Transperth travel patterns',
  story:
    'Transperth planners compare stations by the shape of their boardings, not their size: a small station that is busy on weekdays and quiet on Sundays should match a big station with the same habit. ' +
    'Cosine similarity measures exactly that. It is 1.0 when two lists of counts rise and fall in the same proportions.',
  questions: [
    {
      id: 't12-s2-q1',
      format: 'predict',
      diff: 'medium',
      core: true,
      title: 'Cosine similarity by hand',
      prompt:
        'Two bus stops record boardings (in hundreds) in three time slots: morning, midday and evening. Type exactly what this program prints.',
      code: `stop_a = [3, 4, 12]
stop_b = [4, 3, 12]
dot = 0
sq_a = 0
sq_b = 0
for i in range(len(stop_a)):
    dot += stop_a[i] * stop_b[i]
    sq_a += stop_a[i] ** 2
    sq_b += stop_b[i] ** 2
print(dot, sq_a, sq_b)
size = sq_a ** 0.5 * sq_b ** 0.5
print(size)
print(round(dot / size, 4))`,
      mutants: [
        {
          code: `stop_a = [3, 4, 12]
stop_b = [4, 3, 12]
for i in range(len(stop_a)):
    dot = 0
    sq_a = 0
    sq_b = 0
    dot += stop_a[i] * stop_b[i]
    sq_a += stop_a[i] ** 2
    sq_b += stop_b[i] ** 2
print(dot, sq_a, sq_b)
size = sq_a ** 0.5 * sq_b ** 0.5
print(size)
print(round(dot / size, 4))`,
          mistake: 'accumulator_init',
        },
        {
          code: `stop_a = [3, 4, 12]
stop_b = [4, 3, 12]
dot = 0
sq_a = 0
sq_b = 0
for i in range(len(stop_a) - 1):
    dot += stop_a[i] * stop_b[i]
    sq_a += stop_a[i] ** 2
    sq_b += stop_b[i] ** 2
print(dot, sq_a, sq_b)
size = sq_a ** 0.5 * sq_b ** 0.5
print(size)
print(round(dot / size, 4))`,
          mistake: 'off_by_one_range',
        },
      ],
      concepts: ['cosine-similarity', 'accumulator', 'float'],
      detects: ['accumulator_init', 'off_by_one_range'],
      expectedSec: 240,
      hints: [
        'Three running totals grow together, one pass for each of the three positions. Write a small table with i, dot, sq_a and sq_b.',
        'Pass 0 adds 3 × 4, 3² and 4². Pass 1 adds 4 × 3, 4² and 3². Pass 2 adds 12 × 12, 12² and 12². Then check what type `** 0.5` gives.',
        'The first line is `168 169 169`. `** 0.5` gives a float even for a perfect square such as 169.',
      ],
      solution: {
        explanation:
          'The loop runs for `i` = 0, 1 and 2.\n\n' +
          '- `dot` = 3×4 + 4×3 + 12×12 = 12 + 12 + 144 = 168.\n' +
          '- `sq_a` = 9 + 16 + 144 = 169, and `sq_b` = 16 + 9 + 144 = 169.\n\n' +
          'So line 10 prints `168 169 169`. `169 ** 0.5` is `13.0`, a float, so `size` is 13.0 × 13.0 = `169.0`. Finally 168 / 169 = 0.994082..., which rounds to `0.9941`.\n\n' +
          'The two stops have almost the same pattern, so the similarity is close to 1.',
      },
      selfExplain: 'What would the last line print if stop_b were [6, 8, 24], and why?',
    },
    {
      id: 't12-s2-q2',
      format: 'write',
      kind: 'function',
      diff: 'medium',
      core: true,
      title: 'Write cosine_sim',
      prompt:
        'Write `cosine_sim(a, b)` for two lists of numbers of the same length. Return\n\n' +
        '`(a[0]*b[0] + a[1]*b[1] + ...) / ( √(a[0]² + a[1]² + ...) × √(b[0]² + b[1]² + ...) )`\n\n' +
        'rounded to 4 decimal places. If either list has a size of 0 (it is empty or all its values are 0), return `None` instead of dividing by zero.\n\n' +
        'No imports: use `** 0.5` for square roots. Round only the value you return.\n\n' +
        'Example: `cosine_sim([1, 2, 3], [4, 5, 6])` returns `0.9746`.',
      fnName: 'cosine_sim',
      starter: `def cosine_sim(a, b):
    """Cosine similarity of equal-length lists a and b, rounded to 4 dp.
    None if either list has size 0."""
    pass`,
      rules: ['noImport', 'roundAtEnd'],
      tests: [
        { id: 'v1', call: 'cosine_sim([1, 2, 3], [4, 5, 6])', expect: '0.9746', cmp: 'float', label: 'three counts each', hidden: false },
        { id: 'v2', call: 'cosine_sim([3, 0, 4], [3, 0, 4])', expect: '1.0', cmp: 'float', label: 'identical patterns', hidden: false },
        { id: 'h1', call: 'cosine_sim([0, 0, 0], [1, 2, 3])', expect: 'None', label: 'one list is all zeros', hidden: true, tag: 'zero_division' },
        { id: 'h2', call: 'cosine_sim([], [])', expect: 'None', label: 'empty lists', hidden: true, tag: 'zero_division' },
        { id: 'h3', call: 'cosine_sim([1, -1], [-1, 1])', expect: '-1.0', cmp: 'float', label: 'opposite patterns with negative numbers', hidden: true },
        { id: 'h4', call: 'cosine_sim([2, 0], [0, 7])', expect: '0.0', cmp: 'float', label: 'nothing in common', hidden: true },
        { id: 'h5', call: 'cosine_sim([1, 6, 2], [9, 16, 20])', expect: '0.8341', cmp: 'float', label: 'rounding the square roots too early shows here', hidden: true, tag: 'round_mid_calc' },
        { id: 'h6', call: 'cosine_sim([1200, 2200, 2600], [5100, 2600, 1900])', expect: '0.7704', cmp: 'float', label: 'large counts', hidden: true },
      ],
      concepts: ['cosine-similarity', 'accumulator', 'zero-division'],
      detects: ['zero_division', 'round_mid_calc', 'accumulator_init', 'import_used'],
      expectedSec: 300,
      hints: [
        'You need three running totals from one loop over the positions: the sum of a[i] × b[i], the sum of a[i]², and the sum of b[i]².',
        'Plan: start `dot`, `sq_a` and `sq_b` at 0. Loop `i` over `range(len(a))`, adding to all three. After the loop, if `sq_a` or `sq_b` is 0, return None. Otherwise divide `dot` by `(sq_a ** 0.5 * sq_b ** 0.5)` and round that one result.',
        `\`\`\`python
for i in range(len(a)):
    dot += a[i] * b[i]
    sq_a += a[i] ** 2
    sq_b += b[i] ** 2
\`\`\``,
      ],
      solution: {
        code: `def cosine_sim(a, b):
    """Cosine similarity of equal-length lists a and b, rounded to 4 dp.
    None if either list has size 0."""
    dot = 0
    sq_a = 0
    sq_b = 0
    for i in range(len(a)):
        dot += a[i] * b[i]
        sq_a += a[i] ** 2
        sq_b += b[i] ** 2
    if sq_a == 0 or sq_b == 0:
        return None
    return round(dot / (sq_a ** 0.5 * sq_b ** 0.5), 4)`,
        explanation:
          'The three totals start at 0 before the loop. Each pass uses the same index `i` in both lists, so `range(len(a))` is the natural loop here.\n\n' +
          'A list has size 0 exactly when the sum of its squares is 0, which covers both an empty list and a list of zeros. Checking `sq_a == 0 or sq_b == 0` before dividing avoids ZeroDivisionError. These sums are exact (integers here), so comparing them with 0 is safe.\n\n' +
          '`sq_a ** 0.5` is the square root, with no `import math` needed. The division keeps full precision and only the returned value is rounded. Rounding each square root first can move the 4th decimal place: `[1, 6, 2]` and `[9, 16, 20]` give 0.8341, but 0.8342 if each root is rounded to 4 places before dividing.',
      },
      selfExplain: 'Why does checking sq_a == 0 also cover the case where a is an empty list?',
    },
    {
      id: 't12-s2-q3',
      format: 'write',
      kind: 'project',
      diff: 'hard',
      core: false,
      title: 'Project task: the most similar station',
      prompt:
        'Write `main(csvfile, station)`. The file\'s header includes `Station`, `Weekday`, `Saturday` and `Sunday` (average boardings), in any order and letter case, possibly with extra columns. Open the file name exactly as given.\n\n' +
        'Each station\'s pattern is the list `[Weekday, Saturday, Sunday]`, always in that order. Return a **tuple** `(name, similarity)` for the **other** station whose pattern has the highest cosine similarity to `station`\'s pattern: `name` in lower case, `similarity` rounded to 4 decimal places.\n\n' +
        'Rules:\n\n' +
        '- Station names match ignoring letter case and spaces around them.\n' +
        '- A row is valid only if it has the same number of comma-separated fields as the header, a non-blank station name, and three counts that are whole numbers 0 or more that are not all 0. Skip every other row.\n' +
        '- If a station has more than one valid row, use only its first valid row.\n' +
        '- If two stations are equally similar, choose the name that comes first alphabetically. Compare similarities at full precision.\n' +
        '- Return `None` if the file cannot be opened, `station` has no valid row, or there is no other valid station.\n' +
        '- No `import`, `input()` or `print()`, and round only the value you return.\n\n' +
        'Example: `main(\'stations_a\', \'Claremont\')` returns `(\'warwick\', 0.9994)`.',
      fnName: 'main',
      starter: `def main(csvfile, station):
    """Return (name, similarity) of the valid station whose [Weekday, Saturday, Sunday]
    pattern is most similar to station's, or None."""
    pass`,
      rules: ['noImport', 'noInput', 'noPrint', 'roundAtEnd', 'noCsvExt', 'mainSignature'],
      tests: [
        {
          id: 'v1',
          call: "main('stations_a', 'Claremont')",
          expect: "('warwick', 0.9994)",
          cmp: 'float',
          files: [{ name: 'stations_a', content: STATIONS_A }],
          label: 'Claremont in the sample file',
          hidden: false,
        },
        {
          id: 'v2',
          call: "main('stations_a', 'cottesloe')",
          expect: "('fremantle', 0.9949)",
          cmp: 'float',
          files: [{ name: 'stations_a', content: STATIONS_A }],
          label: 'station name in lower case',
          hidden: false,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h1',
          call: "main('stations_b', 'LEEDERVILLE')",
          expect: "('glendalough', 0.9992)",
          cmp: 'float',
          files: [{ name: 'stations_b', content: STATIONS_B }],
          label: 'columns in a different order with an extra column',
          hidden: true,
          tag: 'header_order_assumed',
        },
        {
          id: 'h2',
          call: "main('stations_c', 'Bassendean')",
          expect: "('ashfield', 0.8333)",
          cmp: 'float',
          files: [{ name: 'stations_c', content: STATIONS_C }],
          label: 'three stations equally similar',
          hidden: true,
          tag: 'sort_tiebreak',
        },
        {
          id: 'h3',
          call: "main('stations_d', 'Burswood')",
          expect: "('cannington', 0.7704)",
          cmp: 'float',
          files: [{ name: 'stations_d', content: STATIONS_D }],
          label: 'invalid counts, a blank line, an all-zero station and a repeated station',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h4',
          call: "main('stations_d', 'Midland')",
          expect: "('armadale', 0.9963)",
          cmp: 'float',
          files: [{ name: 'stations_d', content: STATIONS_D }],
          label: 'station whose first row is invalid',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h5',
          call: "main('stations_d', 'Kelmscott')",
          expect: 'None',
          files: [{ name: 'stations_d', content: STATIONS_D }],
          label: 'station with no valid row',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h6',
          call: "main('stations_e', 'Mandurah')",
          expect: 'None',
          files: [{ name: 'stations_e', content: STATIONS_E }],
          label: 'no other valid station',
          hidden: true,
          tag: 'no_graceful_exit',
        },
        {
          id: 'h7',
          call: "main('stations_z', 'Perth')",
          expect: 'None',
          files: [{ name: 'stations_a', content: STATIONS_A }],
          label: 'file that does not exist',
          hidden: true,
          tag: 'no_graceful_exit',
        },
      ],
      concepts: ['csv', 'cosine-similarity', 'dictionary', 'tie-break', 'main-contract'],
      detects: [
        'header_order_assumed', 'invalid_row_not_skipped', 'case_sensitive_compare', 'sort_tiebreak',
        'no_graceful_exit', 'zero_division', 'csv_ext_assumed', 'round_mid_calc',
      ],
      expectedSec: 900,
      hints: [
        'Build a dictionary first: cleaned station name → its [weekday, saturday, sunday] list, holding only valid first rows. Then the search for the most similar station is a simple loop over that dictionary.',
        'Plan: read the lines inside try/except OSError. Find the station column and the three count columns by header name, in the order weekday, saturday, sunday. For each row, skip it if the field count is wrong, the name is blank or already in the dictionary, or any count fails `int()` or is negative; also skip [0, 0, 0]. After the loop, return None if the target is missing. Loop over the other stations, keep the best name and its unrounded similarity, and replace them when a similarity is higher, or equal with a name that comes earlier.',
        `\`\`\`python
count_cols = [header.index('weekday'), header.index('saturday'), header.index('sunday')]
...
if best_sim is None or sim > best_sim or (sim == best_sim and name < best_name):
    best_name = name
    best_sim = sim
\`\`\``,
      ],
      solution: {
        code: `def cosine(a, b):
    """Full-precision cosine similarity of two lists that both have size above 0."""
    dot = 0
    sq_a = 0
    sq_b = 0
    for i in range(len(a)):
        dot += a[i] * b[i]
        sq_a += a[i] ** 2
        sq_b += b[i] ** 2
    return dot / (sq_a ** 0.5 * sq_b ** 0.5)


def read_patterns(lines):
    """Map each station (lower case) to the counts from its first valid row."""
    header = lines[0].strip().lower().split(',')
    name_col = header.index('station')
    count_cols = [header.index('weekday'), header.index('saturday'), header.index('sunday')]
    patterns = {}
    for line in lines[1:]:
        fields = line.strip().split(',')
        if len(fields) != len(header):
            continue
        name = fields[name_col].strip().lower()
        if name == '' or name in patterns:
            continue
        counts = []
        for col in count_cols:
            try:
                value = int(fields[col])
            except ValueError:
                break
            if value < 0:
                break
            counts.append(value)
        if len(counts) == 3 and counts != [0, 0, 0]:
            patterns[name] = counts
    return patterns


def main(csvfile, station):
    """Return (name, similarity) of the valid station whose [Weekday, Saturday, Sunday]
    pattern is most similar to station's, or None."""
    try:
        with open(csvfile) as f:
            lines = f.readlines()
    except OSError:
        return None
    patterns = read_patterns(lines)
    target = station.strip().lower()
    if target not in patterns:
        return None
    best_name = None
    best_sim = None
    for name, counts in patterns.items():
        if name == target:
            continue
        sim = cosine(patterns[target], counts)
        if best_sim is None or sim > best_sim or (sim == best_sim and name < best_name):
            best_name = name
            best_sim = sim
    if best_name is None:
        return None
    return (best_name, round(best_sim, 4))`,
        explanation:
          '**Read once.** `main` reads all lines inside `try`, so a missing file returns `None`. Everything else works from `lines`.\n\n' +
          '**Columns by name.** `count_cols` lists the column positions in the order the task defines (weekday, saturday, sunday), whatever order the file uses. That is what makes the shuffled file in the hidden tests work.\n\n' +
          '**Valid first rows.** `name in patterns` is only true once a station has a valid row, so an invalid first row (Midland\'s `n/a`) does not block a later valid one, while a later valid row (Cannington\'s second row) is ignored. `int()` rejects `n/a`, `12.5` and blanks with ValueError, and `break` stops reading that row, so `len(counts) == 3` is true only when all three counts are good. `[0, 0, 0]` is skipped because its similarity would divide by zero.\n\n' +
          '**Best match.** The loop keeps the best name and its unrounded similarity. A strictly higher similarity replaces them; an equal one replaces them only when the name is alphabetically earlier. In the Bassendean file, Maylands, Ashfield and Guildford all score 0.8333..., and `ashfield` wins.\n\n' +
          '**Output.** The similarity is rounded only in the returned tuple. If the dictionary holds only the target, `best_name` stays `None` and so does the result.',
      },
      selfExplain: 'In the Bassendean file, which station would be returned if the tie rule were left out and the comparison used only sim > best_sim?',
    },
  ],
};

export default s2;
