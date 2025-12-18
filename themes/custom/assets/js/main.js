document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.querySelector('.posts-hero .search');
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

  searchInput.addEventListener('input', event => {
    filterPosts(event.target.value);
  });

  searchInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    searchInput.blur();
  });
});
