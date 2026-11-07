document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.querySelector('.posts-hero .search');
  const clearButton = document.querySelector('.posts-hero .search-clear');
  const postCards = Array.from(document.querySelectorAll('.posts .post-card'));

  if (!searchInput || postCards.length === 0) return;

  const filterPosts = query => {
    const normalizedQuery = query.trim().toLowerCase();

    postCards.forEach(card => {
      const title = card.dataset.title || '';
      const matches = !normalizedQuery || title.includes(normalizedQuery);
      card.style.display = matches ? '' : 'none';
    });
  };

  const updateClearState = value => {
    if (!clearButton) return;
    clearButton.hidden = value.trim().length === 0;
  };

  searchInput.addEventListener('input', event => {
    const value = event.target.value;
    filterPosts(value);
    updateClearState(value);
  });

  searchInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    searchInput.blur();
  });

  clearButton?.addEventListener('click', () => {
    searchInput.value = '';
    filterPosts('');
    updateClearState('');
    searchInput.focus();
  });

  updateClearState(searchInput.value);
});

// 3D gallery: switch the main render between image and video thumbnails.
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.render-card').forEach(card => {
    const coverLink = card.querySelector('.render-image-link');
    const coverImg = coverLink?.querySelector('img');
    const videoPlayer = card.querySelector('.render-video');
    const thumbs = card.querySelectorAll('.render-thumb');

    const showImage = btn => {
      if (!coverLink || !coverImg) {
        return;
      }
      const display = btn.dataset.display;
      const original = btn.dataset.original;
      if (!display || !original) {
        return;
      }
      if (videoPlayer) {
        videoPlayer.pause();
        videoPlayer.removeAttribute('src');
        const defaultPoster = videoPlayer.dataset.defaultPoster;
        if (defaultPoster) {
          videoPlayer.poster = defaultPoster;
        }
        videoPlayer.load();
        videoPlayer.classList.add('is-hidden');
      }
      coverImg.src = display;
      coverLink.href = original;
      coverLink.classList.remove('is-hidden');
    };

    const showVideo = btn => {
      if (!videoPlayer) {
        return;
      }
      const videoSrc = btn.dataset.original;
      if (!videoSrc) {
        return;
      }
      if (coverLink) {
        coverLink.classList.add('is-hidden');
      }
      const poster = btn.dataset.poster || videoPlayer.dataset.defaultPoster || btn.dataset.display;
      if (poster) {
        videoPlayer.poster = poster;
      }
      const currentSrc = videoPlayer.getAttribute('src');
      if (currentSrc !== videoSrc) {
        videoPlayer.setAttribute('src', videoSrc);
        videoPlayer.load();
      } else {
        videoPlayer.currentTime = 0;
      }
      videoPlayer.classList.remove('is-hidden');
      videoPlayer.play().catch(() => {});
    };

    thumbs.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type || 'image';
        if (type === 'video') {
          showVideo(btn);
        } else {
          showImage(btn);
        }
        thumbs.forEach(other => {
          other.classList.remove('is-active');
          other.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
      });
    });
  });
});
