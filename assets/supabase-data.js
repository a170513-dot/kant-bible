
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.KANT_SUPABASE || {};
const ready = Boolean(cfg.url && cfg.publishableKey);

function make(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = text;
  return el;
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

    host.replaceChildren();
    for (const row of data) {
      const article = make('article','lecture-item');
      article.append(make('small','',row.book_slug || '성경'));
      article.append(make('strong','',row.title));
      if (row.summary) article.append(make('p','',row.summary));
      host.append(article);
    }
    document.querySelector('#recentLecturesSection')?.removeAttribute('hidden');
  }

  async function loadBookLectures() {
    const slug = document.body?.dataset?.bookSlug;
    const host = document.querySelector('#bookLectures');
    if (!slug || !host) return;

    const { data, error } = await supabase
      .from('lectures')
      .select('id,title,summary,content_html,updated_at,source_filename')
      .eq('book_slug', slug)
      .eq('is_published', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('KANT BIBLE: book lectures query failed', error.message);
      return;
    }

    if (!data?.length) {
      host.innerHTML = '<div class="placeholder">아직 등록된 공개 강의안이 없습니다.</div>';
      return;
    }

    host.replaceChildren();
    for (const row of data) {
      const article = make('article','lecture-item');
      article.append(make('strong','',row.title));
      if (row.summary) article.append(make('p','',row.summary));

      if (row.content_html) {
        const details = make('details');
        const summary = make('summary','','강의안 펼치기');
        const frame = document.createElement('iframe');
        frame.className = 'lecture-frame';
        frame.setAttribute('sandbox','');
        frame.setAttribute('referrerpolicy','no-referrer');
        frame.loading = 'lazy';
        frame.srcdoc = row.content_html;
        details.append(summary, frame);
        article.append(details);
      }
      host.append(article);
    }
  }

  loadRecentLectures();
  loadBookLectures();
} else {
  console.info('KANT BIBLE: Supabase is not configured yet.');
}
