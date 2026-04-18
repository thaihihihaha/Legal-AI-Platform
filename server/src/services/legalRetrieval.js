/**
 * Legal Retrieval — 3-tier system with source transparency
 *
 * Tier 1 (ưu tiên cao nhất): Brave Search API — real-time, target vbpl.vn / thuvienphapluat.vn
 * Tier 2: PostgreSQL law_chunks — nếu đã import & Brave không khả dụng
 * Tier 3: Local corpus uts_vlc_processed.json — fallback, có cảnh báo "có thể cũ"
 *
 * Mỗi evidence object đều có `source_tier` để frontend hiển thị badge độ tin cậy.
 */

import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Prisma, prisma } from '../lib/prisma.js';
import { searchLegalWithBrave, isBraveConfigured } from './braveSearchService.js';

const localCorpusPath = fileURLToPath(new URL('../../../data/uts_vlc_processed.json', import.meta.url));

let localCorpusCache = null;
let lawChunkTableAvailable = null;

// ─── Text normalisation ───────────────────────────────────────────────────────

const stopWords = new Set([
  'va', 'hoac', 'la', 'cua', 'cho', 'voi', 'mot', 'cac', 'nhung', 'nay', 'the', 'thi', 'duoc', 'khong',
  'co', 'trong', 'tai', 've', 'neu', 'vi', 'tu', 'den', 'khi', 'de', 'phai', 'can', 'phan', 'quyen', 'nghia',
  'vu', 'trach', 'nhiem', 'hop', 'dong', 'luat', 'dieu', 'quy', 'dinh', 'theo', 'bo', 'ban', 'hanh',
]);

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s/.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildSearchTerms = (question) => {
  const normalized = normalizeText(question);
  const terms = normalized.split(' ').filter((t) => t.length >= 3 && !stopWords.has(t));

  for (const match of [...normalized.matchAll(/(?:dieu|d)\s+(\d+[a-z]?)/gi)]) {
    terms.push(`dieu ${match[1]}`, match[1]);
  }

  return [...new Set(terms)].slice(0, 12);
};

const scoreText = (haystack, terms) => {
  let score = 0;
  for (const term of terms) {
    if (term && haystack.includes(term)) score += Math.min(term.length, 10);
  }
  return score;
};

// ─── Tier 3: Local corpus ─────────────────────────────────────────────────────

const extractArticleChunks = (doc) => {
  const content = String(doc?.content || '').trim();
  if (!content) return [];

  const matches = [...content.matchAll(/(?:^|\n)(Điều\s+\d+[a-zA-Z]?(?:\.)?[^\n]*)/g)];
  if (matches.length === 0) {
    return [{
      source: 'local_corpus',
      source_tier: 'local',
      law_id: doc.id || null,
      law_title: doc.title || 'Văn bản pháp luật',
      law_number: doc.number || doc.law_number || doc.code || '',
      law_type: doc.type || '',
      article: null,
      title: doc.title || 'Văn bản pháp luật',
      content,
      excerpt: content.slice(0, 1200),
      source_site: doc.source_site || 'uts_vlc_processed',
      source_url: doc.source_url || null,
      is_freshness_verified: false,
    }];
  }

  const chunks = [];
  const intro = content.slice(0, matches[0].index).trim();
  if (intro) {
    chunks.push({
      source: 'local_corpus',
      source_tier: 'local',
      law_id: doc.id || null,
      law_title: doc.title || 'Văn bản pháp luật',
      law_number: doc.number || doc.law_number || doc.code || '',
      law_type: doc.type || '',
      article: 'Mở đầu',
      title: doc.title || 'Mở đầu',
      content: intro,
      excerpt: intro.slice(0, 1200),
      source_site: doc.source_site || 'uts_vlc_processed',
      source_url: doc.source_url || null,
      is_freshness_verified: false,
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    const start = current.index + (current[0].startsWith('\n') ? 1 : 0);
    const end = next ? next.index : content.length;
    const chunkText = content.slice(start, end).trim();
    const heading = current[1].trim();
    const articleMatch = heading.match(/^Điều\s+(\d+[a-zA-Z]?)/i);

    chunks.push({
      source: 'local_corpus',
      source_tier: 'local',
      law_id: doc.id || null,
      law_title: doc.title || 'Văn bản pháp luật',
      law_number: doc.number || doc.law_number || doc.code || '',
      law_type: doc.type || '',
      article: articleMatch ? `Điều ${articleMatch[1]}` : heading,
      title: heading,
      content: chunkText,
      excerpt: chunkText.slice(0, 1200),
      source_site: doc.source_site || 'uts_vlc_processed',
      source_url: doc.source_url || null,
      is_freshness_verified: false,
    });
  }

  return chunks;
};

const loadLocalCorpus = async () => {
  if (localCorpusCache) return localCorpusCache;
  try {
    const raw = await fs.readFile(localCorpusPath, 'utf8');
    const docs = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
    localCorpusCache = docs.flatMap(extractArticleChunks);
    return localCorpusCache;
  } catch (err) {
    console.warn('⚠️  Không tải được local corpus:', err.message);
    localCorpusCache = [];
    return localCorpusCache;
  }
};

const scoreEvidence = (question, evidence) => {
  const normalizedQ = normalizeText(question);
  const terms = buildSearchTerms(question);
  const normalizedTitle = normalizeText(
    `${evidence.law_title || ''} ${evidence.law_number || ''} ${evidence.article || ''} ${evidence.title || ''}`
  );
  const normalizedContent = normalizeText(evidence.content || '');

  let score = 0;
  score += scoreText(normalizedTitle, terms) * 3;
  score += scoreText(normalizedContent, terms);
  if (normalizedQ.includes(normalizedTitle) && normalizedTitle.length > 0) score += 15;
  if (evidence.article && normalizedQ.includes(normalizeText(evidence.article))) score += 20;
  if (evidence.law_title && normalizedQ.includes(normalizeText(evidence.law_title))) score += 10;

  return score;
};

const searchLocalEvidence = async (question, topK) => {
  const corpus = await loadLocalCorpus();
  if (corpus.length === 0) return [];

  return corpus
    .map((e) => ({ ...e, _score: scoreEvidence(question, e) }))
    .filter((e) => e._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, topK)
    .map(({ _score, ...item }) => item);
};

// ─── Tier 2: Database ─────────────────────────────────────────────────────────

const isLawChunkTableReady = async () => {
  if (lawChunkTableAvailable !== null) return lawChunkTableAvailable;
  try {
    const rows = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM law_chunks`;
    lawChunkTableAvailable = Number(rows?.[0]?.count || 0) > 0;
  } catch {
    lawChunkTableAvailable = false;
  }
  return lawChunkTableAvailable;
};

const searchDatabaseEvidence = async (question, topK) => {
  if (!(await isLawChunkTableReady())) return [];

  const terms = buildSearchTerms(question);
  if (terms.length === 0) return [];

  const conditions = terms.map((term) => Prisma.sql`
    lc.content ILIKE ${`%${term}%`} OR lc.title ILIKE ${`%${term}%`} OR
    lc.article ILIKE ${`%${term}%`} OR lc.parent_context ILIKE ${`%${term}%`} OR
    ld.title ILIKE ${`%${term}%`} OR ld.law_number ILIKE ${`%${term}%`}
  `);

  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT
      lc.id, lc.law_id, lc.article, lc.clause,
      lc.title AS chunk_title, lc.content AS chunk_content, lc.parent_context,
      ld.title AS law_title, ld.law_number, ld.source_site, ld.source_url,
      ld.issuer, ld.effective_date, ld.updated_at
    FROM law_chunks lc
    JOIN law_documents ld ON ld.id = lc.law_id
    WHERE ${Prisma.join(conditions, Prisma.sql` OR `)}
    LIMIT ${Math.max(topK * 4, topK)}
  `);

  return rows
    .map((row) => ({
      source: 'database',
      source_tier: 'database',
      law_id: row.law_id,
      law_title: row.law_title || 'Văn bản pháp luật',
      law_number: row.law_number || '',
      article: row.article || row.chunk_title || '',
      title: row.chunk_title || row.article || row.law_title || '',
      content: row.chunk_content || '',
      excerpt: String(row.chunk_content || '').slice(0, 1200),
      clause: row.clause || null,
      source_site: row.source_site || 'law_documents',
      source_url: row.source_url || null,
      issuer: row.issuer || null,
      effective_date: row.effective_date || null,
      db_updated_at: row.updated_at || null,
      parent_context: row.parent_context || null,
      is_freshness_verified: false, // DB static, không tự cập nhật
    }))
    .map((e) => ({ ...e, _score: scoreEvidence(question, e) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, topK)
    .map(({ _score, ...item }) => item);
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Tìm kiếm bằng chứng pháp lý — 3-tier theo độ ưu tiên:
 *   realtime (Brave) → database → local
 *
 * @returns {{ evidence: Array, retrieval_tier: string, retrieval_note: string }}
 */
export const searchLegalEvidence = async (question, { topK = 5 } = {}) => {
  // ── Tier 1: Brave Search (real-time) ────────────────────────────────────────
  if (isBraveConfigured()) {
    try {
      const braveResults = await searchLegalWithBrave(question, { topK });
      if (braveResults.length > 0) {
        return {
          evidence: braveResults,
          retrieval_tier: 'realtime',
          retrieval_note: `Dữ liệu thời gian thực từ ${braveResults.map((r) => r.source_site).filter(Boolean).join(', ')}`,
        };
      }
      console.warn('⚠️  Brave trả về 0 kết quả, fallback sang DB/local');
    } catch (err) {
      console.warn('⚠️  Brave Search lỗi, fallback:', err.message);
    }
  }

  // ── Tier 2: PostgreSQL ───────────────────────────────────────────────────────
  const dbResults = await searchDatabaseEvidence(question, topK);
  if (dbResults.length > 0) {
    return {
      evidence: dbResults,
      retrieval_tier: 'database',
      retrieval_note: 'Dữ liệu từ cơ sở dữ liệu nội bộ. Kiểm tra ngày cập nhật của từng văn bản.',
    };
  }

  // ── Tier 3: Local corpus ─────────────────────────────────────────────────────
  const localResults = await searchLocalEvidence(question, topK);
  return {
    evidence: localResults,
    retrieval_tier: 'local',
    retrieval_note: 'Dữ liệu từ kho văn bản cục bộ (uts_vlc_processed). Có thể chưa phản ánh các sửa đổi mới nhất — hãy xác minh trên vbpl.vn.',
  };
};

export const buildLegalPromptContext = (evidenceList = []) =>
  evidenceList.map((e, index) => ({
    source: e.source,
    source_tier: e.source_tier,
    law_title: e.law_title,
    law_number: e.law_number,
    article: e.article,
    clause: e.clause || null,
    title: e.title,
    excerpt: e.excerpt || String(e.content || '').slice(0, 1200),
    source_site: e.source_site || null,
    source_url: e.source_url || null,
    issuer: e.issuer || null,
    effective_date: e.effective_date || null,
    retrieved_at: e.retrieved_at || null,
    is_freshness_verified: e.is_freshness_verified ?? false,
    reference_id: `${index + 1}`,
  }));
