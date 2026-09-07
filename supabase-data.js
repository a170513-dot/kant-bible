
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.KANT_SUPABASE || {};
const ready = Boolean(cfg.url && cfg.publishableKey);

function make(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = text;
  return el;
}

function getLectureViewer() {
  let viewer = document.querySelector('#lectureFullscreenViewer');
  if (viewer) return viewer;

  viewer = make('div', 'lecture-fullscreen-viewer');
  viewer.id = 'lectureFullscreenViewer';
  viewer.hidden = true;
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-modal', 'true');
  viewer.setAttribute('aria-label', '강의안 전체화면 보기');

  const bar = make('div', 'lecture-fullscreen-bar');
  const title = make('strong', 'lecture-fullscreen-title', '강의안');
  title.id = 'lectureFullscreenTitle';

  const actions = make('div', 'lecture-fullscreen-actions');

  const browserFullscreenBtn = make('button', 'lecture-fullscreen-btn', '⛶ 브라우저 전체화면');
  browserFullscreenBtn.type = 'button';
  browserFullscreenBtn.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement && viewer.requestFullscreen) {
        await viewer.requestFullscreen();
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn('KANT BIBLE: fullscreen request failed', error);
    }
  });

  const closeBtn = make('button', 'lecture-fullscreen-close', '✕ 닫기');
  closeBtn.type = 'button';

  actions.append(browserFullscreenBtn, closeBtn);
  bar.append(title, actions);

  const frame = document.createElement('iframe');
  frame.id = 'lectureFullscreenFrame';
  frame.className = 'lecture-fullscreen-frame';
  frame.setAttribute('sandbox', '');
  frame.setAttribute('referrerpolicy', 'no-referrer');

  viewer.append(bar, frame);
  document.body.append(viewer);

  function closeViewer() {
    viewer.hidden = true;
    frame.removeAttribute('srcdoc');
    document.body.classList.remove('lecture-viewer-open');

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  closeBtn.addEventListener('click', closeViewer);

  viewer.addEventListener('click', (event) => {
    if (event.target === viewer) closeViewer();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !viewer.hidden) closeViewer();
  });

  viewer.openLecture = (lectureTitle, html) => {
    title.textContent = lectureTitle || '강의안';
    frame.srcdoc = html || '';
    viewer.hidden = false;
    document.body.classList.add('lecture-viewer-open');
    closeBtn.focus();
  };

  return viewer;
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
    const viewer = getLectureViewer();

    for (const row of data) {
      const article = make('article','lecture-item');
      article.append(make('strong','',row.title));
      if (row.summary) article.append(make('p','',row.summary));

      if (row.content_html) {
        const openBtn = make('button', 'lecture-open-fullscreen', '강의안 펼치기 ⛶');
        openBtn.type = 'button';
        openBtn.addEventListener('click', () => {
          viewer.openLecture(row.title, row.content_html);
        });
        article.append(openBtn);
      }
      host.append(article);
    }
  }

  loadRecentLectures();
  loadBookLectures();
} else {
  console.info('KANT BIBLE: Supabase is not configured yet.');
}
