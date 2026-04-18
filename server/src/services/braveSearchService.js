/**
 * Brave Search API — Legal Research Service
 *
 * Ưu tiên tìm kiếm trên các nguồn pháp lý chính thống Việt Nam:
 *   - vbpl.vn  : Cơ sở dữ liệu quốc gia về văn bản pháp luật (chính thống nhất)
 *   - thuvienphapluat.vn : Thư viện pháp luật phổ biến
 *   - luatvietnam.vn     : Cổng thông tin pháp luật
 *
 * Docs: https://brave.com/search/api/
 */

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

// Các site pháp lý ưu tiên — theo thứ tự uy tín
const LEGAL_SITES = [
  'vbpl.vn',           // Cơ sở dữ liệu quốc gia — chính thống
  'thuvienphapluat.vn', // Thư viện pháp luật
  'luatvietnam.vn',    // Cổng pháp luật Việt Nam
  'moj.gov.vn',        // Bộ Tư pháp
];

const SITE_FILTER = LEGAL_SITES.map((s) => `site:${s}`).join(' OR ');

/**
 * Chuẩn hoá kết quả Brave thành evidence object tương thích với legalRetrieval
 */
const normalizeBraveResult = (result, queryDate) => ({
  source: 'brave_search',
  source_tier: 'realtime',
  law_title: result.title || 'Văn bản pháp luật',
  law_number: extractLawNumber(result.title || ''),
  article: extractArticle(result.title || result.description || ''),
  title: result.title || '',
  content: result.description || '',
  excerpt: result.description || '',
  source_url: result.url || null,
  source_site: extractHostname(result.url),
  retrieved_at: queryDate,
  page_age: result.page_age || result.age || null, // Ngày Brave trả về
  is_freshness_verified: true,
});

const extractHostname = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url || '';
  }
};

const extractLawNumber = (text) => {
  // Khớp mẫu: "123/2024/QH15", "45/2023/NĐ-CP", v.v.
  const match = text.match(/\d+\/\d{4}\/[A-ZĐ\-]+/i);
  return match ? match[0] : '';
};

const extractArticle = (text) => {
  const match = text.match(/Điều\s+\d+[a-zA-Z]?/i);
  return match ? match[0] : '';
};

/**
 * Gọi Brave Search API
 * @param {string} query - câu hỏi đã được xây dựng cho tìm kiếm
 * @param {object} options
 * @returns {Promise<Array>} danh sách evidence
 */
const callBraveAPI = async (query, { count = 5, freshness = null } = {}) => {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error('BRAVE_SEARCH_API_KEY chưa được cấu hình');
  }

  // Brave không hỗ trợ country=VN — dùng ALL, định hướng bằng site: filter + search_lang
  const params = new URLSearchParams({
    q: query,
    count: String(Math.min(count, 20)),
    search_lang: 'vi',
    country: 'ALL',
    text_decorations: '0',
    spellcheck: '0',
  });

  // freshness chỉ truyền khi được yêu cầu rõ ràng
  if (freshness) {
    params.set('freshness', freshness); // 'pd'|'pw'|'pm'|'py'
  }

  const response = await fetch(`${BRAVE_API_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
    signal: AbortSignal.timeout(8000), // 8 giây timeout
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Brave API lỗi ${response.status}: ${errorText.slice(0, 200)}`);
  }

  return response.json();
};

/**
 * Xây dựng câu truy vấn pháp lý tối ưu cho Brave
 * Kết hợp từ khoá câu hỏi + bộ lọc site pháp lý
 */
const buildLegalQuery = (question) => {
  // Rút gọn câu hỏi nếu quá dài (Brave hoạt động tốt với 6-10 từ khoá)
  const trimmed = question.slice(0, 300).trim();
  return `(${SITE_FILTER}) ${trimmed}`;
};

/**
 * Tìm kiếm pháp lý real-time qua Brave Search
 *
 * @param {string} question - câu hỏi từ người dùng
 * @param {object} options
 * @param {number} [options.topK=5]
 * @param {string} [options.freshness] - 'pd'|'pw'|'pm'|'py' (past day/week/month/year)
 * @returns {Promise<Array>} mảng evidence objects
 */
export const searchLegalWithBrave = async (question, { topK = 5, freshness = null } = {}) => {
  const query = buildLegalQuery(question);
  const queryDate = new Date().toISOString();

  const data = await callBraveAPI(query, { count: topK * 2, freshness });

  const results = data?.web?.results || [];
  if (results.length === 0) {
    return [];
  }

  return results
    .filter((r) => r.url && r.description) // bỏ kết quả thiếu thông tin
    .slice(0, topK)
    .map((r) => normalizeBraveResult(r, queryDate));
};

/**
 * Kiểm tra Brave API có khả dụng không
 */
export const isBraveConfigured = () => Boolean(process.env.BRAVE_SEARCH_API_KEY);
