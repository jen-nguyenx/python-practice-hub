import type { Scenario } from '../../schema.ts';

// Synthetic suburb figures for practice (not official census data). No .csv extension on purpose.
const SUBURBS_A = `Suburb,LGA,Population,Area_km2
Scarborough,Stirling,16500,5.1
Karrinyup,Stirling,9200,5.3
Victoria Park,Victoria Park,9700,3.3
Innaloo,Stirling,8100,3.7
Lathlain,Victoria Park,3800,1.9
Carlisle,Victoria Park,6100,2.5
`;

const SUBURBS_B = `Postcode,AREA_KM2,suburb,Population,lga
6160,4.4,Fremantle,8300,Fremantle
6162,1.9,South Fremantle,3400,FREMANTLE
6159,2.4,North Fremantle,3900,fremantle
`;

const SUBURBS_SMALL = `Suburb,LGA,Population,Area_km2
Nedlands,Nedlands,11200,6.6
Dalkeith,Nedlands,4500,2.6
`;

const SUBURBS_TIES = `Suburb,LGA,Population,Area_km2
Mount Lawley,Stirling,4500,1.5
Menora,Stirling,1800,1.3
Coolbinia,Stirling,1800,0.9
Inglewood,Stirling,4500,1.5
Dianella,Stirling,23000,9.6
`;

const SUBURBS_MESSY = `Suburb,LGA,Population,Area_km2
Leederville,Vincent,3900,1.9
North Perth,Vincent,n/a,2.7
Mount Hawthorn,Vincent,10500,
Highgate,Vincent,4400,0

Perth,Vincent,-5,1.2
,Vincent,2000,1.0
West Perth,Vincent,4800
leederville,Vincent,99999,0.5
Coolbinia,Stirling,1800,0.9
`;

const SUBURBS_CASE = `Suburb,LGA,Population,Area_km2
Wembley,Cambridge,11800,4.4
floreat,CAMBRIDGE,8100,4.3
City Beach,cambridge ,6000,8.9
`;

const s3: Scenario = {
  id: 't12-s3',
  title: 'Perth suburbs planning report',
  story:
    'A planning team is ranking Perth suburbs by population and density inside each local government area (LGA), such as Stirling, Victoria Park and Fremantle. ' +
    'Their export is messy: columns move around, names come in any case, and some rows are blank, broken or repeated. The figures are made up for practice.',
  questions: [
    {
      id: 't12-s3-q1',
      format: 'testWriter',
      diff: 'hard',
      core: false,
      title: 'Break the density calculator',
      prompt:
        'Two versions of `mean_density(lines)` were submitted. One follows the spec below exactly and one is wrong in a single edge case. ' +
        'Enter an argument tuple that makes the two versions give different results.',
      fnName: 'mean_density',
      spec:
        '`mean_density(lines)` takes a list of strings read from a CSV file. `lines[0]` is always the header, which includes `Suburb`, `Population` and `Area_km2` in any order and letter case, possibly with extra columns. Every later string is one row.\n\n' +
        'It returns the mean of `population / area` over the valid rows, rounded to 4 decimal places, or `None` if there are no valid rows. A row is valid when:\n\n' +
        '- it has the same number of comma-separated fields as the header,\n' +
        '- the suburb name is not blank,\n' +
        '- the population is a whole number 0 or more and the area is a number greater than 0,\n' +
        '- no earlier valid row has the same suburb name. Names are compared ignoring letter case and spaces around them.',
      reference: `def mean_density(lines):
    header = lines[0].strip().lower().split(',')
    suburb_col = header.index('suburb')
    pop_col = header.index('population')
    area_col = header.index('area_km2')
    seen = {}
    total = 0
    count = 0
    for line in lines[1:]:
        fields = line.strip().split(',')
        if len(fields) != len(header):
            continue
        suburb = fields[suburb_col].strip().lower()
        try:
            population = int(fields[pop_col])
            area = float(fields[area_col])
        except ValueError:
            continue
        if suburb == '' or population < 0 or area <= 0 or suburb in seen:
            continue
        seen[suburb] = True
        total += population / area
        count += 1
    if count == 0:
        return None
    return round(total / count, 4)`,
      buggy: `def mean_density(lines):
    header = lines[0].strip().lower().split(',')
    suburb_col = header.index('suburb')
    pop_col = header.index('population')
    area_col = header.index('area_km2')
    seen = {}
    total = 0
    count = 0
    for line in lines[1:]:
        fields = line.strip().split(',')
        if len(fields) != len(header):
            continue
        suburb = fields[suburb_col].strip()
        try:
            population = int(fields[pop_col])
            area = float(fields[area_col])
        except ValueError:
            continue
        if suburb == '' or population < 0 or area <= 0 or suburb in seen:
            continue
        seen[suburb] = True
        total += population / area
        count += 1
    if count == 0:
        return None
    return round(total / count, 4)`,
      bugMistake: 'case_sensitive_compare',
      argsExample: "(['Suburb,Population,Area_km2', 'Subiaco,9000,5.9', 'Wembley,11800,4.4'],)",
      concepts: ['csv', 'validation', 'duplicates', 'edge-cases'],
      detects: ['case_sensitive_compare', 'invalid_row_not_skipped'],
      expectedSec: 420,
      hints: [
        'List every kind of messy row the spec describes, then try one small input for each. Keep the header simple so you can work out the answer by hand.',
        'Rows with bad numbers, blank names or a zero area are easy to check, and the buggy version handles them. Look closely at the last rule: how are two suburb names compared?',
        "Use the header `'Suburb,Population,Area_km2'` and add two valid rows for one suburb: the first spelt `Subiaco`, the second in capitals, with different numbers so the mean would change.",
      ],
      solution: {
        code: "(['Suburb,Population,Area_km2', 'Subiaco,9000,5.9', 'SUBIACO,1000,1.0'],)",
        explanation:
          'The buggy version strips the suburb name but does not lower-case it, so `Subiaco` and `SUBIACO` count as two different suburbs.\n\n' +
          "With `(['Suburb,Population,Area_km2', 'Subiaco,9000,5.9', 'SUBIACO,1000,1.0'],)` the correct version treats the second row as a duplicate and returns 9000 / 5.9 = `1525.4237`. " +
          'The buggy version also averages in 1000 / 1.0 and returns `1262.7119`.\n\n' +
          'An exact repeat such as `Subiaco` twice does not expose it, because both versions catch that. Hidden project tests are full of rows like this: the same key in a different case, with extra spaces, or in a shuffled column.',
      },
      selfExplain: 'Which one-word change fixes the buggy version?',
    },
    {
      id: 't12-s3-q2',
      format: 'refactor',
      diff: 'hard',
      core: false,
      title: 'Read the file once',
      prompt:
        'This `main(csvfile, lga)` passes every test, but a marker would take efficiency marks off: it opens the file three times, reads every line twice, and looks up the column positions again for every row.\n\n' +
        'Rewrite it so that it opens the file **once** with `with open(...)`, finds each column position **once**, and gets all three results from **one loop** over the lines. ' +
        'It must still return `[suburb_count, total_population, mean_density]` for the LGA (mean density rounded to 4 decimal places), or `None` if the file cannot be opened or the LGA has no suburbs.',
      code: `def main(csvfile, lga):
    """Return [suburb_count, total_population, mean_density] for one LGA, or None."""
    try:
        f = open(csvfile)
        f.close()
    except OSError:
        return None

    # Pass 1: count the suburbs and add up the population
    f = open(csvfile)
    lines = f.readlines()
    f.close()
    header = lines[0].strip().lower().split(',')
    rows = lines[1:]
    count = 0
    total_population = 0
    for i in range(len(rows)):
        fields = rows[i].strip().split(',')
        if fields[header.index('lga')].strip().lower() == lga.strip().lower():
            count += 1
            total_population += int(fields[header.index('population')])
    if count == 0:
        return None

    # Pass 2: read the file again to add up the densities
    f = open(csvfile)
    lines = f.readlines()
    f.close()
    header = lines[0].strip().lower().split(',')
    rows = lines[1:]
    density_total = 0
    for i in range(len(rows)):
        fields = rows[i].strip().split(',')
        if fields[header.index('lga')].strip().lower() == lga.strip().lower():
            population = int(fields[header.index('population')])
            area = float(fields[header.index('area_km2')])
            density_total += population / area
    return [count, total_population, round(density_total / count, 4)]`,
      fnName: 'main',
      tests: [
        {
          id: 'v1',
          call: "main('suburbs_a', 'Stirling')",
          expect: '[3, 33800, 2386.7775]',
          cmp: 'float',
          files: [{ name: 'suburbs_a', content: SUBURBS_A }],
          label: 'Stirling',
          hidden: false,
        },
        {
          id: 'v2',
          call: "main('suburbs_a', 'victoria park')",
          expect: '[3, 19600, 2459.798]',
          cmp: 'float',
          files: [{ name: 'suburbs_a', content: SUBURBS_A }],
          label: 'LGA name in lower case',
          hidden: false,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h1',
          call: "main('suburbs_b', 'FREMANTLE')",
          expect: '[3, 15600, 1766.9458]',
          cmp: 'float',
          files: [{ name: 'suburbs_b', content: SUBURBS_B }],
          label: 'columns in a different order with an extra column',
          hidden: true,
          tag: 'header_order_assumed',
        },
        {
          id: 'h2',
          call: "main('suburbs_a', 'Vincent')",
          expect: 'None',
          files: [{ name: 'suburbs_a', content: SUBURBS_A }],
          label: 'LGA that is not in the file',
          hidden: true,
          tag: 'zero_division',
        },
        {
          id: 'h3',
          call: "main('suburbs_2027', 'Stirling')",
          expect: 'None',
          files: [{ name: 'suburbs_a', content: SUBURBS_A }],
          label: 'file that does not exist',
          hidden: true,
          tag: 'no_graceful_exit',
        },
      ],
      mustRemove: ['open_without_with', 'range_len_index'],
      mustAdd: ['with_open'],
      pattern: 'with-open-strip-split',
      concepts: ['csv', 'efficiency', 'header-lookup', 'refactor'],
      detects: ['efficiency_repeat_pass', 'file_not_closed', 'zero_division', 'no_graceful_exit'],
      expectedSec: 480,
      hints: [
        'Everything the second pass needs (population and area of the same rows) is already available during the first pass. Nothing has to wait for a second read.',
        'Plan: inside try, use `with open(csvfile) as f:` to read the lines once, and return None in the except. Split the header and store the three column positions in variables before the loop. Loop over `lines[1:]` directly, and when a row belongs to the LGA, update the count, the population total and the density total together. After the loop, return None for a count of 0, otherwise the list.',
        `\`\`\`python
header = lines[0].strip().lower().split(',')
lga_col = header.index('lga')
pop_col = header.index('population')
area_col = header.index('area_km2')
target = lga.strip().lower()
\`\`\``,
      ],
      solution: {
        code: `def main(csvfile, lga):
    """Return [suburb_count, total_population, mean_density] for one LGA, or None."""
    try:
        with open(csvfile) as f:
            lines = f.readlines()
    except OSError:
        return None
    header = lines[0].strip().lower().split(',')
    lga_col = header.index('lga')
    pop_col = header.index('population')
    area_col = header.index('area_km2')
    target = lga.strip().lower()
    count = 0
    total_population = 0
    density_total = 0
    for line in lines[1:]:
        fields = line.strip().split(',')
        if fields[lga_col].strip().lower() == target:
            population = int(fields[pop_col])
            count += 1
            total_population += population
            density_total += population / float(fields[area_col])
    if count == 0:
        return None
    return [count, total_population, round(density_total / count, 4)]`,
        explanation:
          '**One open.** The original opened the file once just to test that it exists, then twice more to read it. `with open(csvfile) as f:` inside `try` does the check and the reading together, and closes the file automatically.\n\n' +
          '**Column positions once.** `header.index(...)` searches the header each time it is called, so calling it inside the loop repeats that search for every row. Storing `lga_col`, `pop_col` and `area_col` before the loop does it once. `target` is cleaned once for the same reason.\n\n' +
          '**One loop.** A matching row gives everything at once: add 1 to the count, add its population, and add its density. `for line in lines[1:]` walks the rows directly, with no index to manage.\n\n' +
          '**Same results.** The `count == 0` check still comes before the division, and the mean density is still rounded only in the returned list.',
      },
      selfExplain: 'If the file had 50,000 rows, roughly how many times would the original call header.index compared with the refactored version?',
    },
    {
      id: 't12-s3-q3',
      format: 'write',
      kind: 'project',
      diff: 'hard',
      core: true,
      title: 'Project task: rank suburbs inside each LGA',
      prompt:
        'Write `main(csvfile)`. The header includes `Suburb`, `LGA`, `Population` and `Area_km2`, in any order and letter case, possibly with extra columns. Open the file name exactly as given.\n\n' +
        'Return a **nested dictionary** `{lga: {suburb: [population, density, rank]}}`:\n\n' +
        '- `lga` and `suburb` keys are lower case, with spaces around them removed.\n' +
        '- `population` is an int, and `density` is `population / area` rounded to 4 decimal places.\n' +
        '- `rank` is 1 for the suburb with the largest population in its LGA, 2 for the next, and so on. Equal populations are ranked by higher density first (at full precision), then by suburb name A to Z.\n\n' +
        'Skip a row that is blank, has a different number of comma-separated fields from the header, has a blank suburb or LGA, a population that is not a whole number 0 or more, or an area that is not a number greater than 0. ' +
        'If a suburb name appears in more than one valid row, keep only the first. Return `None` if the file cannot be opened. No `import`, `input()` or `print()`.\n\n' +
        "Example: for `suburbs_small`, `main('suburbs_small')` returns `{'nedlands': {'nedlands': [11200, 1696.9697, 1], 'dalkeith': [4500, 1730.7692, 2]}}`.",
      fnName: 'main',
      starter: `def main(csvfile):
    """Return {lga: {suburb: [population, density, rank]}} from csvfile,
    or None if the file cannot be opened."""
    pass`,
      rules: ['noImport', 'noInput', 'noPrint', 'roundAtEnd', 'noCsvExt', 'mainSignature'],
      tests: [
        {
          id: 'v1',
          call: "main('suburbs_small')",
          expect: "{'nedlands': {'nedlands': [11200, 1696.9697, 1], 'dalkeith': [4500, 1730.7692, 2]}}",
          cmp: 'float',
          files: [{ name: 'suburbs_small', content: SUBURBS_SMALL }],
          label: 'one LGA with two suburbs',
          hidden: false,
        },
        {
          id: 'v2',
          call: "main('suburbs_a')",
          expect:
            "{'stirling': {'scarborough': [16500, 3235.2941, 1], 'karrinyup': [9200, 1735.8491, 2], 'innaloo': [8100, 2189.1892, 3]}, " +
            "'victoria park': {'victoria park': [9700, 2939.3939, 1], 'carlisle': [6100, 2440.0, 2], 'lathlain': [3800, 2000.0, 3]}}",
          cmp: 'float',
          files: [{ name: 'suburbs_a', content: SUBURBS_A }],
          label: 'two LGAs with rows mixed together',
          hidden: false,
        },
        {
          id: 'h1',
          call: "main('suburbs_b')",
          expect: "{'fremantle': {'fremantle': [8300, 1886.3636, 1], 'north fremantle': [3900, 1625.0, 2], 'south fremantle': [3400, 1789.4737, 3]}}",
          cmp: 'float',
          files: [{ name: 'suburbs_b', content: SUBURBS_B }],
          label: 'columns in a different order with an extra column',
          hidden: true,
          tag: 'header_order_assumed',
        },
        {
          id: 'h2',
          call: "main('suburbs_case')",
          expect: "{'cambridge': {'wembley': [11800, 2681.8182, 1], 'floreat': [8100, 1883.7209, 2], 'city beach': [6000, 674.1573, 3]}}",
          cmp: 'float',
          files: [{ name: 'suburbs_case', content: SUBURBS_CASE }],
          label: 'the same LGA written in different cases and with spaces',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h3',
          call: "main('suburbs_ties')",
          expect:
            "{'stirling': {'dianella': [23000, 2395.8333, 1], 'inglewood': [4500, 3000.0, 2], 'mount lawley': [4500, 3000.0, 3], " +
            "'coolbinia': [1800, 2000.0, 4], 'menora': [1800, 1384.6154, 5]}}",
          cmp: 'float',
          files: [{ name: 'suburbs_ties', content: SUBURBS_TIES }],
          label: 'equal populations, and equal densities',
          hidden: true,
          tag: 'sort_tiebreak',
        },
        {
          id: 'h4',
          call: "main('suburbs_messy')",
          expect: "{'vincent': {'leederville': [3900, 2052.6316, 1]}, 'stirling': {'coolbinia': [1800, 2000.0, 1]}}",
          cmp: 'float',
          files: [{ name: 'suburbs_messy', content: SUBURBS_MESSY }],
          label: 'blank, broken, zero, negative and repeated rows',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h5',
          call: "main('suburbs_2027')",
          expect: 'None',
          files: [{ name: 'suburbs_a', content: SUBURBS_A }],
          label: 'file that does not exist',
          hidden: true,
          tag: 'no_graceful_exit',
        },
      ],
      concepts: ['csv', 'nested-dict', 'ranking', 'tie-break', 'main-contract'],
      detects: [
        'sort_tiebreak', 'header_order_assumed', 'invalid_row_not_skipped', 'case_sensitive_compare',
        'no_graceful_exit', 'dict_keyerror', 'aliasing_copy', 'csv_ext_assumed',
      ],
      expectedSec: 900,
      hints: [
        'Do it in two stages. Stage 1 (one pass over the file): group the valid rows by LGA as a dictionary of lists of (suburb, population, density). Stage 2 (no file access): sort each LGA\'s list and give out ranks while building the nested result.',
        'Plan: read the lines inside try/except OSError. Find the four columns by name. For each row, skip it if it is the wrong length, a name is blank, `int()` or `float()` fails, the population is negative, the area is 0 or less, or the suburb is already in a `seen` dictionary. Add a new empty list the first time an LGA appears, then append the tuple. For each LGA, sort with a key that puts the largest population first, then the largest density, then the name, and number the rows from 1.',
        `\`\`\`python
for lga, rows in groups.items():
    rows.sort(key=lambda row: (-row[1], -row[2], row[0]))
    result[lga] = {}
    rank = 1
    for suburb, population, density in rows:
        ...
\`\`\``,
      ],
      solution: {
        code: `def read_groups(lines):
    """Group valid rows by LGA: {lga: [(suburb, population, density), ...]}."""
    header = lines[0].strip().lower().split(',')
    suburb_col = header.index('suburb')
    lga_col = header.index('lga')
    pop_col = header.index('population')
    area_col = header.index('area_km2')
    groups = {}
    seen = {}
    for line in lines[1:]:
        fields = line.strip().split(',')
        if len(fields) != len(header):
            continue
        suburb = fields[suburb_col].strip().lower()
        lga = fields[lga_col].strip().lower()
        try:
            population = int(fields[pop_col])
            area = float(fields[area_col])
        except ValueError:
            continue
        if suburb == '' or lga == '' or population < 0 or area <= 0 or suburb in seen:
            continue
        seen[suburb] = True
        if lga not in groups:
            groups[lga] = []
        groups[lga].append((suburb, population, population / area))
    return groups


def main(csvfile):
    """Return {lga: {suburb: [population, density, rank]}} from csvfile,
    or None if the file cannot be opened."""
    try:
        with open(csvfile) as f:
            lines = f.readlines()
    except OSError:
        return None
    groups = read_groups(lines)
    result = {}
    for lga, rows in groups.items():
        rows.sort(key=lambda row: (-row[1], -row[2], row[0]))
        result[lga] = {}
        rank = 1
        for suburb, population, density in rows:
            result[lga][suburb] = [population, round(density, 4), rank]
            rank += 1
    return result`,
        explanation:
          '**Stage 1, one pass.** `read_groups` finds every column by name, then checks each row in the order the spec lists the rules. `int()` and `float()` sit inside `try`, so `n/a` and blank values are skipped instead of crashing. A suburb is added to `seen` only after it passes every check, so a later valid row with the same name is dropped, while an invalid first attempt does not block a valid one.\n\n' +
          '**Grouping.** `if lga not in groups: groups[lga] = []` creates a new list for each new LGA, then the tuple is appended. The density is stored at full precision.\n\n' +
          '**Ranking.** The key `(-row[1], -row[2], row[0])` sorts by population high to low, then density high to low, then name A to Z. Negating the numbers keeps the name part in A to Z order; `reverse=True` would flip the names as well. In the ties file, Inglewood and Mount Lawley have the same population and density, so Inglewood is ranked first.\n\n' +
          '**Building the result.** `result[lga] = {}` makes a new inner dictionary per LGA. `rank` starts at 1 and goes up by 1 for each suburb in sorted order. Density is rounded only here, as the value is stored in the result.',
      },
      selfExplain: 'Why would sorting with key=lambda row: (row[1], row[2], row[0]) and reverse=True rank Mount Lawley above Inglewood?',
    },
  ],
};

export default s3;
