import type { Direction, FluidCategory, MeasurementStatus, OutputCategory } from '../types';

export interface ParsedEntry {
  kind: 'entry' | 'summary_request' | 'unrecognised';
  direction?: Direction;
  category?: FluidCategory | OutputCategory;
  subtype?: string;
  amountMl?: number;
  episodeCount?: number;
  status?: MeasurementStatus;
  containerFraction?: number;
  note?: string;
  warnings: string[];
  transcript: string;
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};

// Converts spoken number phrases ("five hundred", "fifteen hundred", "two hundred and fifty") to digits.
function wordsToDigits(text: string): string {
  const tokens = text.split(/\s+/);
  const out: string[] = [];
  let acc = 0;
  let has = false;

  const flush = () => {
    if (has) {
      out.push(String(acc));
      acc = 0;
      has = false;
    }
  };

  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i].replace(/[.,]/g, '');
    const t = raw.toLowerCase();
    if (t === 'and') continue;
    if (t in NUMBER_WORDS) {
      acc += NUMBER_WORDS[t];
      has = true;
    } else if (t === 'hundred') {
      acc = (has ? acc : 1) * 100;
      has = true;
    } else if (t === 'thousand') {
      acc = (has ? acc : 1) * 1000;
      has = true;
    } else {
      flush();
      out.push(tokens[i]);
    }
  }
  flush();
  return out.join(' ');
}

const UNIT_RE = /(\d+(?:\.\d+)?)\s*(millilitres|milliliters|millilitre|milliliter|mls|ml|litres|liters|litre|liter|l)\b/i;

const FRACTION_WORDS: [RegExp, number][] = [
  [/\bthree[\s-]quarters?\b/, 0.75],
  [/\bquarter\b/, 0.25],
  [/\bhalf\b/, 0.5],
  [/\b(full|finished|whole|all of)\b/, 1],
];

const APPROX_HEDGES = /\b(about|around|approximately|roughly|ish|-ish)\b/;

const INTAKE_CATEGORY_MAP: [RegExp, FluidCategory][] = [
  [/\bcoffee\b/, 'coffee'],
  [/\btea\b/, 'tea'],
  [/\bjuice\b/, 'juice'],
  [/\bmilk\b/, 'milk'],
  [/\bsquash\b/, 'squash'],
  [/\bsoup\b/, 'soup'],
  [/\b(shake|nutritional drink|supplement drink|ensure)\b/, 'nutritional_drink'],
  [/\bice\b/, 'ice'],
  [/\b(enteral feed|feed)\b/, 'enteral_feed'],
  [/\biv (fluid|drip|infusion)\b/, 'iv_fluid'],
  [/\biv (medication|flush)\b/, 'iv_medication'],
  [/\bwater\b/, 'water'],
];

const OUTPUT_CATEGORY_MAP: [RegExp, OutputCategory][] = [
  [/\b(urine|wee|pee|passed water)\b/, 'urine'],
  [/\b(wet pad|wet bed|wet clothing|pad)\b/, 'continence'],
  [/\b(vomit|sick|threw up|throwing up)\b/, 'vomit'],
  [/\b(diarrhoea|diarrhea|stool|watery stool)\b/, 'diarrhoea'],
  [/\bstoma\b/, 'stoma'],
  [/\bdrain\b/, 'drain'],
  [/\b(nasogastric|ng tube|ng aspirate)\b/, 'nasogastric'],
  [/\bsweat/, 'sweating'],
];

const SUMMARY_RE = /\b(summari[sz]e|summary|fluid balance|how much (did i drink|have i drunk)|urine output.*recorded|show unmeasured|healthcare team summary)\b/;

const OUTPUT_HINT = /\b(passed|urine|wee|pee|vomit|sick|stool|diarrhoea|diarrhea|stoma|drain|sweat|wet pad|wet bed|toilet|nasogastric)\b/;
const INTAKE_HINT = /\b(drank|drink|drinking|had|finished|sipped|swallowed|coffee|tea|water|juice|milk|soup|bottle|mug|cup|shake|feed)\b/;

const UNMEASURED_HINT = /\b(toilet|did not measure|didn't measure|not measured|unknown amount|no idea|unmeasured|couldn't measure)\b/;

export function parseVoiceTranscript(rawTranscript: string): ParsedEntry {
  const transcript = rawTranscript.trim();
  const warnings: string[] = [];
  const normalized = wordsToDigits(transcript.toLowerCase());

  if (SUMMARY_RE.test(normalized)) {
    return { kind: 'summary_request', warnings, transcript };
  }

  // direction
  let direction: Direction | undefined;
  const outputHit = OUTPUT_HINT.test(normalized);
  const intakeHit = INTAKE_HINT.test(normalized);
  if (outputHit && !intakeHit) direction = 'output';
  else if (intakeHit && !outputHit) direction = 'intake';
  else if (outputHit && intakeHit) direction = /\bpassed\b|\burine\b|\bvomit|\bstool|\bstoma\b|\bdrain\b|\bsweat/.test(normalized) ? 'output' : 'intake';

  if (!direction) {
    warnings.push('Could not tell whether this was intake or output. Please choose manually.');
    return { kind: 'unrecognised', warnings, transcript, note: transcript };
  }

  // category
  let category: FluidCategory | OutputCategory | undefined;
  let subtype: string | undefined;
  if (direction === 'intake') {
    for (const [re, cat] of INTAKE_CATEGORY_MAP) {
      if (re.test(normalized)) { category = cat; break; }
    }
    if (!category) {
      category = 'other_intake';
      warnings.push('Unclear fluid type — please confirm what was drunk.');
    }
  } else {
    for (const [re, cat] of OUTPUT_CATEGORY_MAP) {
      if (re.test(normalized)) { category = cat; break; }
    }
    if (!category) {
      category = 'other_output';
      warnings.push('Unclear output type — please confirm.');
    }
  }

  // amount
  const unitMatch = normalized.match(UNIT_RE);
  let amountMl: number | undefined;
  let status: MeasurementStatus = 'unmeasured';
  let missingUnit = false;

  if (unitMatch) {
    const value = parseFloat(unitMatch[1]);
    const unit = unitMatch[2].toLowerCase();
    amountMl = unit.startsWith('l') || unit.startsWith('L') ? value * 1000 : value;
    status = APPROX_HEDGES.test(normalized) ? 'approximate' : 'measured';
  } else {
    // bare number with no unit, e.g. "I drank 200 juice"
    const bareNumber = normalized.match(/\b(\d+)\b/);
    if (bareNumber && direction === 'intake' && category !== 'other_intake') {
      amountMl = parseFloat(bareNumber[1]);
      missingUnit = true;
      warnings.push(`No unit was heard for "${bareNumber[1]}" — please confirm mL or L.`);
    }
  }

  // container fraction
  let containerFraction: number | undefined;
  for (const [re, frac] of FRACTION_WORDS) {
    if (re.test(normalized)) { containerFraction = frac; break; }
  }
  const mentionsContainer = /\b(mug|bottle|cup|bowl|glass|shake)\b/.test(normalized);
  if (containerFraction !== undefined && !amountMl) {
    status = mentionsContainer ? 'container_estimated' : 'approximate';
  }

  // episodes (diarrhoea, vomiting counts)
  let episodeCount: number | undefined;
  const episodeMatch = normalized.match(/\b(\d+)\s*(episodes?|times|watery stools?|stools?)\b/);
  if (episodeMatch) episodeCount = parseInt(episodeMatch[1], 10);
  else if (/\btwice\b/.test(normalized)) episodeCount = 2;

  // unmeasured hint overrides everything
  if (UNMEASURED_HINT.test(normalized)) {
    status = 'unmeasured';
    amountMl = undefined;
  }

  // approximate qualitative words (small/moderate/large) for outputs without numbers
  if (!amountMl && direction === 'output') {
    if (/\bsmall\b/.test(normalized)) subtype = 'small_unmeasured';
    else if (/\bmoderate\b/.test(normalized)) subtype = 'moderate_unmeasured';
    else if (/\blarge\b/.test(normalized)) subtype = 'large_unmeasured';
    else if (/\bheavil?y\b/.test(normalized)) subtype = 'heavily_wet_pad';
    status = 'unmeasured';
  }

  // --- safety checks --------------------------------------------------------
  if (amountMl === 15 || amountMl === 50) {
    warnings.push(`You said ${amountMl} mL. 15 and 50 can sound alike when spoken — please confirm the amount.`);
  }
  if (amountMl === 5000) {
    warnings.push(`You said 5,000 mL. This is unusually large — did you mean 500 mL?`);
  }
  if (amountMl && amountMl > 2000 && amountMl !== 5000) {
    warnings.push(`This entry (${amountMl} mL) appears unusually large. Please double-check before saving.`);
  }
  if (missingUnit) status = amountMl ? 'approximate' : 'unmeasured';

  return {
    kind: 'entry',
    direction,
    category,
    subtype,
    amountMl,
    episodeCount,
    status,
    containerFraction,
    warnings,
    transcript,
    note: transcript,
  };
}
