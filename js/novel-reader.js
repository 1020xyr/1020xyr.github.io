(function () {
  'use strict';

  const readerMarker = document.querySelector('.novel-reader-marker');
  const libraryMarker = document.querySelector('.novel-library-marker');
  const shelfMarker = document.querySelector('.novel-shelf-marker');

  const getLastChapter = function (bookId) {
    return localStorage.getItem(`novel-${bookId}-last-chapter`)
      || (bookId === 'ten-lives' ? localStorage.getItem('novel-ten-lives-last-chapter') : null);
  };

  if (shelfMarker) {
    document.body.classList.add('novel-shelf-page');
    document.querySelectorAll('[data-continue-book]').forEach(function (link) {
      const bookId = link.dataset.continueBook;
      const lastChapter = getLastChapter(bookId);
      if (lastChapter) {
        link.href = lastChapter;
        link.textContent = '继续阅读';
      }
    });
    return;
  }

  if (libraryMarker) {
    document.body.classList.add('novel-library-page');
    const continueLink = document.querySelector('[data-continue-reading]');
    const bookId = libraryMarker.dataset.bookId || 'ten-lives';
    const lastChapter = getLastChapter(bookId);
    if (continueLink && lastChapter) {
      const target = document.querySelector(`[data-chapter-path="${lastChapter}"]`);
      continueLink.href = target ? target.href : lastChapter;
      continueLink.textContent = '继续阅读';
      if (target) {
        const range = target.closest('.novel-catalog-range');
        if (range) range.open = true;
      }
    }
    return;
  }

  if (!readerMarker) return;

  document.body.classList.add('novel-reading-page');

  const root = document.documentElement;
  const pageContent = document.querySelector('.page-content');
  const chapterPath = window.location.pathname;
  const chapterNumber = readerMarker.dataset.chapter;
  const bookId = readerMarker.dataset.bookId || 'ten-lives';
  const progress = document.createElement('div');
  progress.className = 'novel-progress';
  document.body.appendChild(progress);

  localStorage.setItem(`novel-${bookId}-last-chapter`, chapterPath);

  const savedSize = Number(localStorage.getItem('novel-reading-size'));
  if (savedSize >= 16 && savedSize <= 24) {
    root.style.setProperty('--novel-reading-size', `${savedSize}px`);
  }

  const updateMeta = function () {
    const meta = document.querySelector('[data-reading-meta]');
    if (!meta || !pageContent) return;
    const text = pageContent.innerText.replace(/\s+/g, '');
    const count = Math.max(0, text.length - 80);
    const minutes = Math.max(1, Math.ceil(count / 420));
    meta.textContent = `第 ${chapterNumber} 章 · 约 ${count} 字 · ${minutes} 分钟`;
  };

  const updateProgress = function () {
    if (!pageContent) return;
    const rect = pageContent.getBoundingClientRect();
    const start = window.scrollY + rect.top;
    const total = Math.max(1, pageContent.offsetHeight - window.innerHeight * 0.65);
    const current = Math.min(total, Math.max(0, window.scrollY - start + window.innerHeight * 0.25));
    progress.style.width = `${(current / total) * 100}%`;
  };

  document.querySelectorAll('[data-font-change]').forEach(function (button) {
    button.addEventListener('click', function () {
      const current = parseFloat(getComputedStyle(root).getPropertyValue('--novel-reading-size')) || 18;
      const next = Math.min(24, Math.max(16, current + Number(button.dataset.fontChange)));
      root.style.setProperty('--novel-reading-size', `${next}px`);
      localStorage.setItem('novel-reading-size', String(next));
    });
  });

  document.querySelectorAll('[data-scroll-top]').forEach(function (button) {
    button.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.target.matches('input, textarea, select')) return;
    if (event.key === 'ArrowLeft' && event.altKey) {
      const prev = document.querySelector('[data-prev-chapter]');
      if (prev && prev.href) window.location.href = prev.href;
    }
    if (event.key === 'ArrowRight' && event.altKey) {
      const next = document.querySelector('[data-next-chapter]');
      if (next && next.href) window.location.href = next.href;
    }
  });

  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateMeta();
  updateProgress();
})();

