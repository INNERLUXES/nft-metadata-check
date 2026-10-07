// The reports: text for a terminal, markdown for a job summary or a pull request, JSON for other tools and SARIF for code
// scanning. Every text that comes from the input (a file name, a token name, a trait, a URI) was cleaned by safeText
// before it reached the report object. The markdown format also escapes what markdown gives a meaning to, and the SARIF
// format is built as an object and written by JSON.stringify.

import { SOURCES } from './data.js';
import { RULES } from './rules.js';
import { grouped, listText, plural } from './size.js';

const URI = 'https://github.com/INNERLUXES/nft-metadata-check';

function findingsLine(r) {
  const b = r.totals.byLevel;
  const parts = ['error', 'warning', 'info'].filter((l) => b[l]).map((l) => `${grouped(b[l])} ${l}`);
  return `${grouped(r.totals.findings)}${parts.length ? ` (${parts.join(', ')})` : ''}${r.totals.hidden ? `; ${grouped(r.totals.hidden)} below ${r.config.minSeverity} not shown` : ''}`;
}

// The files that were read, the config and the media folder, one line each.
function filesLine(r) {
  const i = r.inputs;
  return `${plural(i.files, 'metadata file')} (JSON, ${plural(i.bytes, 'byte')})${i.other ? `; ${plural(i.other, 'other file')} not read as metadata` : ''}`;
}

function configLine(r) {
  const c = r.inputs.config;
  return c ? `${c.file} (JSON, ${plural(c.lines, 'line')}, ${plural(c.bytes, 'byte')})` : 'not given';
}

function mediaLine(r) {
  const m = r.inputs.media;
  return `${m.same ? 'the metadata folder' : m.folder} (${plural(m.files, 'file')})`;
}

const FROM = { config: 'from the config', option: 'from --standard', default: 'not given, read as the default' };

function standardLine(r) {
  return `${r.standard.name}, ${FROM[r.standard.from]}`;
}

function tokensLine(r) {
  const s = r.summary;
  const ids = s.tokens === 0 ? 'no token id was read' : `${plural(s.tokens, 'id')}${s.tokens === 1 ? `, ${s.lowest}` : `, from ${s.lowest} to ${s.highest}`}`;
  return `${ids}; ${s.range ? `the config expects ${s.range.first} to ${s.range.last}` : 'no range of ids in the config'}`;
}

function table(head, rows, indent = '  ') {
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const line = (cells) => `${indent}${cells.map((c, i) => (i === cells.length - 1 ? c : c.padEnd(widths[i]))).join('  ')}`.trimEnd();
  return [line(head), ...rows.map(line)];
}

const TRAIT_HEAD = ['trait type', 'tokens', 'values', 'types'];
const traitRows = (r) => r.traits.map((t) => [t.trait, grouped(t.tokens), grouped(t.values), t.types.join(', ')]);

const PAD = ' '.repeat(11);

export function toText(r, { explain = false } = {}) {
  const out = [];
  out.push(`nft-metadata-check: ${r.inputs.folder}`);
  out.push(`files: ${filesLine(r)}`);
  out.push(`config: ${configLine(r)}`);
  out.push(`media: ${mediaLine(r)}`);
  out.push(`standard: ${standardLine(r)}`);
  out.push(`tokens: ${tokensLine(r)}`);
  out.push(`findings: ${findingsLine(r)}`);
  out.push('', `Checks (${grouped(r.rules.length)})`, '');
  out.push(...table(['check', 'level', 'kind', 'findings'], r.rules.map((x) => [x.id, x.level, x.kind, grouped(x.findings)])), '');
  out.push(`Findings (${grouped(r.findings.length)})`, '');
  if (!r.findings.length) out.push('  none', '');
  const width = Math.max(...RULES.map((x) => x.id.length));
  for (const f of r.findings) {
    out.push(`  ${f.severity.toUpperCase().padEnd(8)} ${f.id.padEnd(width)}  ${f.at}`);
    out.push(`${PAD}${f.message}`);
    out.push(`${PAD}fix: ${f.fix}`);
    if (explain) {
      for (const b of f.basis) out.push(`${PAD}basis: ${b.text} (${b.source}, ${b.url})`);
      if (f.own) out.push(`${PAD}the tool's own choice: ${f.own}`);
    }
    out.push('');
  }
  if (r.traits.length) out.push(`Traits (${grouped(r.traits.length)})`, '', ...table(TRAIT_HEAD, traitRows(r)), '');
  for (const n of r.notes) out.push(`note: ${n}`);
  if (r.notes.length) out.push('');
  out.push(r.notice, '');
  out.push(`RESULT: ${r.result.text}`);
  return `${out.join('\n')}\n`;
}

// Text for a markdown table cell or line: the characters markdown gives a meaning to are escaped.
const md = (t) => String(t).replace(/[\\`*_{}[\]<>()#+!|~]/g, (c) => `\\${c}`).replace(/\r?\n/g, ' ');

export function toMarkdown(r, { explain = false } = {}) {
  const out = [];
  out.push(`# nft-metadata-check: ${md(r.inputs.folder)}`, '');
  out.push(`- Files: ${md(filesLine(r))}`);
  out.push(`- Config: ${md(configLine(r))}`);
  out.push(`- Media: ${md(mediaLine(r))}`);
  out.push(`- Standard: ${md(standardLine(r))}`);
  out.push(`- Tokens: ${md(tokensLine(r))}`);
  out.push(`- Findings: ${md(findingsLine(r))}`);
  out.push(`- Result: **${md(r.result.text)}**`, '');
  out.push('## Findings', '');
  if (!r.findings.length) out.push('None.', '');
  else {
    out.push('| Level | Check | Where | Message |', '| --- | --- | --- | --- |');
    for (const f of r.findings) out.push(`| ${f.severity} | ${f.id} | ${md(f.at)} | ${md(f.message)} Fix: ${md(f.fix)} |`);
    out.push('');
  }
  if (explain) {
    out.push('## Basis', '');
    const seen = new Set();
    for (const f of r.findings) {
      if (seen.has(f.id)) continue;
      seen.add(f.id);
      out.push(`### ${f.id}`, '');
      for (const b of f.basis) out.push(`- ${md(b.text)} (${md(b.source)}, <${b.url}>)`);
      if (f.own) out.push(`- The tool's own choice: ${md(f.own)}`);
      if (!f.basis.length && !f.own) out.push('- A problem with one of the files itself; it rests on no page.');
      out.push('');
    }
  }
  if (r.traits.length) {
    out.push(`## Traits (${grouped(r.traits.length)})`, '');
    out.push('| Trait type | Tokens | Values | Types |', '| --- | ---: | ---: | --- |');
    for (const row of traitRows(r)) out.push(`| ${row.map(md).join(' | ')} |`);
    out.push('');
  }
  for (const n of r.notes) out.push(`Note: ${md(n)}`, '');
  out.push(`${md(r.notice)}`, '');
  return `${out.join('\n')}`;
}

export function toJson(r, { explain = false } = {}) {
  const out = { ...r, findings: r.findings.map((f) => (explain ? f : { ...f, basis: undefined, own: undefined })) };
  return `${JSON.stringify(out, null, 2)}\n`;
}

const SARIF_LEVEL = { error: 'error', warning: 'warning', info: 'note' };

// SARIF 2.1.0: the checks as rules of the driver, the files with a finding as the artifacts, and one result for each
// finding with its file, line and column. The table of traits has no place in SARIF and is left out.
export function toSarif(r) {
  const files = [...new Set(r.findings.map((f) => f.file))];
  const sarif = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'nft-metadata-check',
            version: r.version,
            informationUri: URI,
            rules: RULES.map((x) => ({
              id: x.id,
              name: x.id,
              shortDescription: { text: x.summary },
              help: { text: `${x.fix} (${x.kind})` },
              defaultConfiguration: { level: SARIF_LEVEL[x.severity] },
              properties: { kind: x.kind }
            }))
          }
        },
        artifacts: files.map((uri) => ({ location: { uri } })),
        results: r.findings.map((f) => ({
          ruleId: f.id,
          ruleIndex: RULES.findIndex((x) => x.id === f.id),
          level: SARIF_LEVEL[f.severity],
          message: { text: `${f.message} Fix: ${f.fix}` },
          locations: [{ physicalLocation: { artifactLocation: { uri: f.file, index: files.indexOf(f.file) }, region: { startLine: f.line, startColumn: f.column } } }],
          properties: { kind: f.kind, subject: f.subject }
        })),
        properties: { notice: r.notice, result: r.result.text, standard: r.standard.name, sources: SOURCES.map((s) => s.url) }
      }
    ]
  };
  return `${JSON.stringify(sarif, null, 2)}\n`;
}

// The list of checks, for --list-checks.
export function listChecksText() {
  const width = Math.max(...RULES.map((x) => x.id.length));
  const out = ['nft-metadata-check checks', ''];
  for (const x of RULES) out.push(`  ${x.id.padEnd(width)}  ${x.severity.padEnd(7)}  ${x.kind.padEnd(13)}  ${x.summary}`);
  out.push('', `A documented check rests on ${listText(['ERC-721', 'ERC-1155', 'the Token Metadata standard of Metaplex'], 8)}; a best practice check is this tool's own choice and says so in its message. An input check is about one of the files itself.`, '');
  return out.join('\n');
}

export function listChecksMarkdown() {
  const out = ['# nft-metadata-check checks', '', '| Check | Level | Kind | What it looks at |', '| --- | --- | --- | --- |'];
  for (const x of RULES) out.push(`| ${x.id} | ${x.severity} | ${x.kind} | ${md(x.summary)} |`);
  out.push('');
  return out.join('\n');
}

export function listChecksJson() {
  return `${JSON.stringify(RULES.map((x) => ({ id: x.id, severity: x.severity, kind: x.kind, summary: x.summary, fix: x.fix, basis: x.basis, own: x.own ?? null })), null, 2)}\n`;
}
