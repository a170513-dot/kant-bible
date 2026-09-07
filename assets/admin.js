
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.KANT_SUPABASE || {};
const ready = Boolean(cfg.url && cfg.publishableKey);
const $ = (sel) => document.querySelector(sel);

const configMissing = $('#configMissing');
const authPanel = $('#authPanel');
const recoveryPanel = $('#recoveryPanel');
const notAdminPanel = $('#notAdminPanel');
const adminPanel = $('#adminPanel');
const sessionBox = $('#sessionBox');
const authMessage = $('#authMessage');
const recoveryMessage = $('#recoveryMessage');
const uploadMessage = $('#uploadMessage');
const managerMessage = $('#managerMessage');

function setMessage(el, text='', type='') {
  if (!el) return;
  el.textContent = text;
  el.className = 'status-message' + (type ? ` ${type}` : '');
}
function esc(value='') {
  return String(value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'","&#039;");
}
function niceDate(value) {
  try { return new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)); }
  catch { return value || ''; }
}
function extractTitle(html, filename) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.querySelector('title')?.textContent || doc.querySelector('h1')?.textContent || filename.replace(/\.(html?|HTML?)$/,'')).trim();
}

if (!ready) {
  configMissing.hidden = false;
  authPanel.hidden = true;
  recoveryPanel.hidden = true;
  sessionBox.textContent = 'Supabase 미연결';
} else {
  const supabase = createClient(cfg.url, cfg.publishableKey);
  let session = null;
  let isAdmin = false;
  let currentHtml = '';
  let allLectures = [];
  let recoveryMode = /(?:^|[&#?])type=recovery(?:&|$)/.test(`${location.search}&${location.hash}`);

  function showRecoveryPanel() {
    recoveryMode = true;
    authPanel.hidden = true;
    notAdminPanel.hidden = true;
    adminPanel.hidden = true;
    recoveryPanel.hidden = false;
    sessionBox.textContent = '비밀번호 재설정';
  }

  async function checkAdmin() {
    if (!session?.user) return false;
    const { data, error } = await supabase
      .from('admins')
      .select('email')
      .limit(1);

    if (error) {
      console.warn(error);
      return false;
    }
    return Boolean(data?.length);
  }

  async function refreshUI() {
    if (recoveryMode) {
      showRecoveryPanel();
      return;
    }

    const { data } = await supabase.auth.getSession();
    session = data.session;

    recoveryPanel.hidden = true;

    if (!session) {
      authPanel.hidden = false;
      notAdminPanel.hidden = true;
      adminPanel.hidden = true;
      sessionBox.textContent = '로그인 필요';
      return;
    }

    sessionBox.innerHTML = `<strong>${esc(session.user.email || '')}</strong><br><button id="signOutTop" class="secondary-btn" type="button">로그아웃</button>`;
    $('#signOutTop')?.addEventListener('click', signOut);

    isAdmin = await checkAdmin();
    authPanel.hidden = true;
    notAdminPanel.hidden = isAdmin;
    adminPanel.hidden = !isAdmin;

    if (isAdmin) {
      await loadBooks();
      await loadLectures();
    }
  }

  async function signIn() {
    const email = $('#authEmail').value.trim();
    const password = $('#authPassword').value;
    if (!email || !password) return setMessage(authMessage,'이메일과 비밀번호를 입력하세요.','error');

    setMessage(authMessage,'로그인 중...');
    const { error } = await supabase.auth.signInWithPassword({email,password});
    if (error) return setMessage(authMessage,error.message,'error');
    setMessage(authMessage,'로그인했습니다.','success');
    await refreshUI();
  }

  async function signUp() {
    const email = $('#authEmail').value.trim();
    const password = $('#authPassword').value;
    if (!email || !password) return setMessage(authMessage,'이메일과 비밀번호를 입력하세요.','error');
    if (password.length < 6) return setMessage(authMessage,'비밀번호는 6자 이상으로 입력하세요.','error');

    setMessage(authMessage,'계정 생성 중...');
    const { data, error } = await supabase.auth.signUp({email,password});
    if (error) return setMessage(authMessage,error.message,'error');

    if (data.session) {
      setMessage(authMessage,'계정이 만들어졌습니다.','success');
      await refreshUI();
    } else {
      setMessage(authMessage,'계정이 만들어졌습니다. 이메일 인증 메일이 왔다면 인증 후 로그인하세요.','success');
    }
  }

  async function requestPasswordReset() {
    const email = $('#authEmail').value.trim();
    if (!email) return setMessage(authMessage,'먼저 이메일 주소를 입력하세요.','error');

    const redirectTo = `${location.origin}/admin.html`;
    setMessage(authMessage,'비밀번호 재설정 메일을 보내는 중...');

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return setMessage(authMessage,error.message,'error');

    setMessage(
      authMessage,
      '비밀번호 재설정 메일을 보냈습니다. 메일의 링크를 누르면 새 비밀번호 설정 화면으로 돌아옵니다.',
      'success'
    );
  }

  async function updatePassword() {
    const password = $('#newPassword').value;
    const confirm = $('#newPasswordConfirm').value;

    if (!password || !confirm) return setMessage(recoveryMessage,'새 비밀번호를 두 번 입력하세요.','error');
    if (password.length < 6) return setMessage(recoveryMessage,'비밀번호는 6자 이상으로 입력하세요.','error');
    if (password !== confirm) return setMessage(recoveryMessage,'두 비밀번호가 서로 다릅니다.','error');

    setMessage(recoveryMessage,'새 비밀번호를 저장하는 중...');
    const { error } = await supabase.auth.updateUser({ password });

    if (error) return setMessage(recoveryMessage,error.message,'error');

    setMessage(recoveryMessage,'비밀번호를 변경했습니다. 잠시 후 로그인 화면으로 돌아갑니다.','success');
    recoveryMode = false;

    try {
      history.replaceState({}, document.title, location.pathname);
    } catch {}

    setTimeout(async () => {
      await supabase.auth.signOut();
      $('#newPassword').value = '';
      $('#newPasswordConfirm').value = '';
      authPanel.hidden = false;
      recoveryPanel.hidden = true;
      notAdminPanel.hidden = true;
      adminPanel.hidden = true;
      sessionBox.textContent = '로그인 필요';
      setMessage(authMessage,'새 비밀번호로 로그인하세요.','success');
    }, 700);
  }

  async function cancelRecovery() {
    recoveryMode = false;
    try {
      history.replaceState({}, document.title, location.pathname);
    } catch {}
    await supabase.auth.signOut();
    recoveryPanel.hidden = true;
    authPanel.hidden = false;
    notAdminPanel.hidden = true;
    adminPanel.hidden = true;
    sessionBox.textContent = '로그인 필요';
  }

  async function signOut() {
    await supabase.auth.signOut();
    location.reload();
  }

  async function loadBooks() {
    const { data, error } = await supabase.from('books').select('slug,name_ko,testament');
    if (error) {
      setMessage(uploadMessage,`성경책 목록을 불러오지 못했습니다: ${error.message}`,'error');
      return;
    }
    const sorted = [...(data || [])].sort((a,b) => {
      if (a.testament !== b.testament) return a.testament.localeCompare(b.testament);
      return a.name_ko.localeCompare(b.name_ko,'ko');
    });
    const options = sorted.map(b => `<option value="${esc(b.slug)}">${b.testament==='OT'?'구약':'신약'} · ${esc(b.name_ko)}</option>`).join('');
    $('#bookSelect').innerHTML = options;
    $('#filterBook').innerHTML = `<option value="">전체 책</option>${options}`;
  }

  async function loadLectures() {
    setMessage(managerMessage,'불러오는 중...');
    const { data, error } = await supabase
      .from('lectures')
      .select('id,book_slug,title,summary,is_published,source_filename,updated_at')
      .order('updated_at',{ascending:false});

    if (error) return setMessage(managerMessage,error.message,'error');
    allLectures = data || [];
    renderLectures();
    setMessage(managerMessage,`${allLectures.length}개의 강의안`,'success');
  }

  function renderLectures() {
    const host = $('#lectureManager');
    const filterBook = $('#filterBook').value;
    const q = $('#lectureSearch').value.trim().toLowerCase();

    const rows = allLectures.filter(row => {
      if (filterBook && row.book_slug !== filterBook) return false;
      const hay = `${row.title || ''} ${row.source_filename || ''} ${row.book_slug || ''}`.toLowerCase();
      return !q || hay.includes(q);
    });

    if (!rows.length) {
      host.innerHTML = `<div class="placeholder">조건에 맞는 강의안이 없습니다.</div>`;
      return;
    }

    host.innerHTML = rows.map(row => `
      <article class="manager-item" data-id="${row.id}">
        <div class="manager-top">
          <div>
            <div class="manager-title">${esc(row.title)}</div>
            <div class="manager-meta">
              책: ${esc(row.book_slug || '미지정')}<br>
              파일: ${esc(row.source_filename || '직접 입력')}<br>
              수정: ${esc(niceDate(row.updated_at))}
            </div>
          </div>
          <span class="publish-state ${row.is_published?'on':'off'}">${row.is_published?'공개':'비공개'}</span>
        </div>
        <div class="manager-actions">
          <button class="secondary-btn toggle-publish" type="button" data-id="${row.id}" data-next="${row.is_published?'false':'true'}">
            ${row.is_published?'비공개로 전환':'공개하기'}
          </button>
          <button class="danger-btn delete-lecture" type="button" data-id="${row.id}" data-title="${esc(row.title)}">삭제</button>
        </div>
      </article>
    `).join('');

    host.querySelectorAll('.toggle-publish').forEach(btn => btn.addEventListener('click', () => togglePublish(Number(btn.dataset.id), btn.dataset.next === 'true')));
    host.querySelectorAll('.delete-lecture').forEach(btn => btn.addEventListener('click', () => deleteLecture(Number(btn.dataset.id), btn.dataset.title)));
  }

  async function togglePublish(id, next) {
    const { error } = await supabase.from('lectures').update({
      is_published: next,
      updated_at: new Date().toISOString()
    }).eq('id', id);

    if (error) return setMessage(managerMessage,error.message,'error');
    await loadLectures();
  }

  async function deleteLecture(id, title) {
    if (!confirm(`"${title}" 강의안을 정말 삭제할까요?`)) return;
    const { error } = await supabase.from('lectures').delete().eq('id', id);
    if (error) return setMessage(managerMessage,error.message,'error');
    setMessage(managerMessage,'삭제했습니다.','success');
    await loadLectures();
  }

  $('#htmlFile').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      currentHtml = '';
      $('#fileInfo').hidden = true;
      $('#previewBox').hidden = true;
      return;
    }
    if (!/\.html?$/i.test(file.name)) {
      event.target.value = '';
      return setMessage(uploadMessage,'HTML 또는 HTM 파일만 올릴 수 있습니다.','error');
    }
    if (file.size > 5 * 1024 * 1024) {
      event.target.value = '';
      return setMessage(uploadMessage,'한 파일은 5MB 이하를 권장합니다.','error');
    }

    currentHtml = await file.text();
    if (!$('#lectureTitle').value.trim()) $('#lectureTitle').value = extractTitle(currentHtml, file.name);
    $('#fileInfo').textContent = `${file.name} · ${(file.size/1024).toFixed(1)} KB`;
    $('#fileInfo').hidden = false;
    $('#previewFrame').srcdoc = currentHtml;
    $('#previewBox').hidden = false;
    setMessage(uploadMessage,'파일을 읽었습니다. 미리보기 후 업로드할 수 있습니다.','success');
  });

  $('#uploadForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = $('#htmlFile').files?.[0];
    const book_slug = $('#bookSelect').value;
    const title = $('#lectureTitle').value.trim();
    const summary = $('#lectureSummary').value.trim();
    const is_published = $('#publishNow').checked;

    if (!file || !currentHtml) return setMessage(uploadMessage,'HTML 파일을 선택하세요.','error');
    if (!book_slug || !title) return setMessage(uploadMessage,'성경책과 제목을 확인하세요.','error');

    const btn = $('#uploadBtn');
    btn.disabled = true;
    setMessage(uploadMessage,'업로드 중...');

    const { error } = await supabase.from('lectures').insert({
      book_slug,
      title,
      summary: summary || null,
      content_html: currentHtml,
      source_filename: file.name,
      is_published,
      updated_at: new Date().toISOString()
    });

    btn.disabled = false;
    if (error) return setMessage(uploadMessage,error.message,'error');

    setMessage(uploadMessage,'강의안을 업로드했습니다.','success');
    resetUploadForm();
    await loadLectures();
  });

  function resetUploadForm() {
    $('#uploadForm').reset();
    $('#publishNow').checked = true;
    currentHtml = '';
    $('#fileInfo').hidden = true;
    $('#previewBox').hidden = true;
    $('#previewFrame').removeAttribute('srcdoc');
  }

  $('#resetBtn').addEventListener('click', resetUploadForm);
  $('#refreshLectures').addEventListener('click', loadLectures);
  $('#filterBook').addEventListener('change', renderLectures);
  $('#lectureSearch').addEventListener('input', renderLectures);
  $('#signInBtn').addEventListener('click', signIn);
  $('#signUpBtn').addEventListener('click', signUp);
  $('#forgotPasswordBtn').addEventListener('click', requestPasswordReset);
  $('#updatePasswordBtn').addEventListener('click', updatePassword);
  $('#cancelRecoveryBtn').addEventListener('click', cancelRecovery);
  $('#notAdminSignOut').addEventListener('click', signOut);

  supabase.auth.onAuthStateChange((event, newSession) => {
    session = newSession;

    if (event === 'PASSWORD_RECOVERY') {
      recoveryMode = true;
      setTimeout(showRecoveryPanel, 0);
      return;
    }

    if (!recoveryMode) setTimeout(refreshUI, 0);
  });

  if (recoveryMode) showRecoveryPanel();
  else refreshUI();
}
