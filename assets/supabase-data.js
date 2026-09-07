
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.KANT_SUPABASE || {};
const ready = Boolean(cfg.url && cfg.publishableKey);

function escapeHtml(value='') {
  return String(value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'","&#039;");
}

if (ready) {
  const supabase = createClient(cfg.url, cfg.publishableKey);

  async function loadRecentLectures() {
    const host = document.querySelector('#recentLectures');
    if (!host) return;

    const { data, error } = await supabase
      .from('lectures')
      .select('id,book_slug,title,summary,updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })
      .limit(6);

    if (error) {
      console.warn('KANT BIBLE: recent lectures query failed', error.message);
      return;
    }
    if (!data?.length) return;

    host.innerHTML = data.map(row => `
      <article class="lecture-item">
        <small>${escapeHtml(row.book_slug || '성경')}</small>
        <strong>${escapeHtml(row.title)}</strong>
        <p>${escapeHtml(row.summary || '')}</p>
      </article>
    `).join('');
    document.querySelector('#recentLecturesSection')?.removeAttribute('hidden');
  }

  async function loadBookLectures() {
    const slug = document.body?.dataset?.bookSlug;
    const host = document.querySelector('#bookLectures');
    if (!slug || !host) return;

    const { data, error } = await supabase
      .from('lectures')
      .select('id,title,summary,content_html,updated_at')
      .eq('book_slug', slug)
      .eq('is_published', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('KANT BIBLE: book lectures query failed', error.message);
      return;
    }

    if (!data?.length) {
      host.innerHTML = '<div class="placeholder">아직 Supabase에 등록된 공개 강의안이 없습니다.</div>';
      return;
    }

    host.innerHTML = data.map(row => `
      <article class="lecture-item">
        <strong>${escapeHtml(row.title)}</strong>
        ${row.summary ? `<p>${escapeHtml(row.summary)}</p>` : ''}
        ${row.content_html ? `<details><summary>강의안 펼치기</summary><div class="lecture-html">${row.content_html}</div></details>` : ''}
      </article>
    `).join('');
  }

  loadRecentLectures();
  loadBookLectures();
} else {
  console.info('KANT BIBLE: Supabase is not configured yet.');
}
