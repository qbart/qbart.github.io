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
