document.addEventListener('DOMContentLoaded', () => {
  annualPosts();
});

const urlParams = new URLSearchParams(window.location.search);
const category = urlParams.get('category');
let currentPage = 1;
let totalPosts = 0;

fetch(`./api/posts/list?annualCategory=${category}`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
})
  .then((response) => response.json())
  .then((data) => {
    totalPosts = data.responseData.bodies;
    annualPosts(currentPage, category, totalPosts);
  })
  .catch((error) => {
    console.error('Error fetching total posts:', error);
  });

const annualPosts = async (page, category, totalPosts) => {
  const response = await fetch(`./api/posts?annualCategory=${category}&pageNum=${page}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  const postlist = document.querySelector('.postlist');
  postlist.innerHTML = '';

  const postsData = data.responseData
    .map(
      (post) =>
        `<div class="postBox">
        <p>${post.annualCategory}</p>
        <p onclick="clickPost(${post.postId})">${post.title}</p>
        <p>${post.nickname}</p>
        <p>${new Date(post.createdAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>
        <p>${post.viewCount}</p>
        </div>`,
    )
    .join('');
  postlist.innerHTML = postsData;

  createPaginationButtons(page, category, totalPosts);
};

const createPaginationButtons = (currentPage, category, totalPosts) => {
  const paginationContainer = document.querySelector('.pagination');
  const totalPages = Math.ceil(totalPosts / 10);

  for (let i = 1; i <= totalPages; i++) {
    const button = document.createElement('button');
    button.innerText = i;
    button.addEventListener('click', () => {
      currentPage = i;
      annualPosts(currentPage, category);
    });

    if (i === currentPage) {
      button.classList.add('active');
    }
    paginationContainer.appendChild(button);
  }
};

// 다른 연도별 조회로 이동
const annualCategory = (category) => {
  location.href = `./annual?category=${category}`;
};

// 상세 페이지로 이동(url 주소 확인 필요)
const clickPost = (postId) => {
  location.href = `./detail?post=${postId}`;
};