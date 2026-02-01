const btnAddFriend = document.getElementById("addFriendBtn");
const friendsLocalSearchInput = document.querySelector(".friends-search input");
const friendsListContainer = document.querySelector(".friends-list");
const friendsEmptyState = friendsListContainer?.querySelector(".empty-state");

const friendsState = {
  friends: [], // текущий список друзей
};

// ============================================
// РЕНДЕР СПИСКА ДРУЗЕЙ
// ============================================

function renderFriendsList(list = friendsState.friends) {
  if (!friendsListContainer) return;

  // убираем только карточки друзей, emptyState оставляем
  friendsListContainer
    .querySelectorAll(".friend-item")
    .forEach((el) => el.remove());

  if (list.length === 0) {
    if (friendsEmptyState) friendsEmptyState.classList.remove("hidden");
    return;
  }

  if (friendsEmptyState) friendsEmptyState.classList.add("hidden");

  list.forEach((friend, index) => {
    const card = createFriendCard(friend);
    card.style.animationDelay = `${index * 0.05}s`;
    friendsListContainer.appendChild(card);
  });
}

function createFriendCard(friend) {
  const div = document.createElement("div");
  div.className = "friend-item";
  div.dataset.userId = friend.id;

  div.innerHTML = `
    <img
      class="friend-avatar"
      src="${friend.avatar || "https://img.icons8.com/?size=100&id=tZuAOUGm9AuS&format=png&color=000000"}"
      alt="${friend.name}"
    />
    <div class="friend-info">
      <a href="/profile/${friend.id}" class="friend-name" style="text-decoration: none; color: inherit;">${friend.name}</a>
      <div class="friend-status">${friend.status || "Нет статуса"}</div>
    </div>
    <div class="friend-actions">
      <button class="btn-friend-action btn-remove">Удалить</button>
    </div>
  `;

  div.querySelector(".btn-remove").addEventListener("click", () => {
    removeFriend(friend.id);
  });

  return div;
}

async function removeFriend(userId) {
  try {
    const response = await fetch("/friends/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    }).catch(() => null);

    if (!response) {
      showToast("Удалён локально (сервер недоступен)", "success");
      return;
    }

    if (response.status === 401) {
      document.location.replace("/login");
      return;
    }

    const { ok, error } = await response.json();

    if (ok) {
      showToast("Друг удалён", "success");

      friendsState.friends = friendsState.friends.filter(
        (f) => f.id !== userId,
      );

      renderFriendsList();

      localStorage.setItem("myFriends", JSON.stringify(friendsState.friends));
    } else {
      showToast(`Ошибка: ${error}`, "error");
    }
  } catch (err) {
    console.error("Ошибка удаления друга:", err);
    showToast("Удалён локально", "success");
    friendsState.friends = friendsState.friends.filter((f) => f.id !== userId);

    renderFriendsList();

    localStorage.setItem("myFriends", JSON.stringify(friendsState.friends));
  }
}

function setupFriendsOverlay() {
  if (!btnAddFriend) return;

  const overlayHTML = `
    <div id="friendsFormOverlay" class="form-overlay hidden">
      <div class="form-container">
        <div class="form-header">
          <h2>Найти друзей</h2>
          <button id="closeFriendsForm" class="btn-close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            id="friendsQuery"
            placeholder="Введите имя пользователя..."
            autocomplete="off"
          />
        </div>

        <div id="friendsSearchStatus" class="search-status hidden">
          <div class="loader"></div>
          <span>Поиск пользователей...</span>
        </div>

        <div id="friendsSearchResults" class="search-results"></div>
      </div>
    </div>
  `;

  document.querySelector(".app").insertAdjacentHTML("beforeend", overlayHTML);

  const overlay = document.getElementById("friendsFormOverlay");
  const closeBtn = document.getElementById("closeFriendsForm");
  const queryInput = document.getElementById("friendsQuery");
  const searchStatus = document.getElementById("friendsSearchStatus");
  const searchResults = document.getElementById("friendsSearchResults");

  function closeOverlay() {
    overlay.classList.add("hidden");
    queryInput.value = "";
    searchResults.innerHTML = "";
    searchStatus.classList.add("hidden");
  }

  btnAddFriend.addEventListener("click", () => {
    overlay.classList.remove("hidden");
    queryInput.focus();
  });

  closeBtn.addEventListener("click", closeOverlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeOverlay();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.classList.contains("hidden")) {
      closeOverlay();
    }
  });

  queryInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = queryInput.value.trim();
      if (query) await searchFriends(query);
    }
  });

  let debounceTimer = null;
  queryInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const query = queryInput.value.trim();

    if (!query) {
      searchResults.innerHTML = "";
      searchStatus.classList.add("hidden");
      return;
    }

    debounceTimer = setTimeout(() => {
      searchFriends(query);
    }, 400);
  });

  async function searchFriends(query) {
    searchStatus.classList.remove("hidden");
    searchResults.innerHTML = "";

    try {
      const response = await fetch("/friends/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: query }),
      });

      if (response.status === 401) {
        document.location.replace("/login");
        return;
      }

      const { ok, error, users } = await response.json();

      searchStatus.classList.add("hidden");

      if (!ok) {
        console.error("Ошибка поиска:", error);
        showToast("Ошибка поиска. Попробуйте ещё раз", "error");
        return;
      }

      if (users && users.length > 0) {
        renderSearchResults(users);
      } else {
        searchResults.innerHTML =
          '<p style="padding: 20px; text-align: center; color: var(--text-secondary);">Пользователей не найдено</p>';
      }
    } catch (err) {
      console.error("Ошибка поиска:", err);
      searchStatus.classList.add("hidden");
      showToast("Ошибка поиска. Попробуйте ещё раз", "error");
    }
  }

  function renderSearchResults(users) {
    searchResults.innerHTML = "";

    users.forEach((user, index) => {
      const isAlreadyFriend = friendsState.friends.some(
        (f) => f.id === user.id,
      );

      const li = document.createElement("li");
      li.className = "song-item";
      li.style.animationDelay = `${index * 0.05}s`;

      li.innerHTML = `
        <div class="song-artwork" style="border-radius: 50%;">
          <img
            src="${user.avatar || "https://img.icons8.com/?size=100&id=tZuAOUGm9AuS&format=png&color=000000"}"
            alt="${user.name}"
            style="border-radius: 50%;"
          />
        </div>
        <div class="song-info">
          <a href="/profile/${user.id}" class="song-title" style="text-decoration: none; color: inherit;">${user.name}</a>
          <div class="song-artist">${user.status || "Нет статуса"}</div>
        </div>
        <div class="song-actions" style="opacity: 1;">
          <button
            class="btn-action btn-add-friend-result ${isAlreadyFriend ? "added" : ""}"
            title="${isAlreadyFriend ? "Уже в друзях" : "Добавить в друзья"}"
            ${isAlreadyFriend ? "disabled" : ""}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${
                isAlreadyFriend
                  ? '<polyline points="20 6 9 17 4 12"></polyline>'
                  : `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                     <circle cx="9" cy="7" r="4"></circle>
                     <line x1="19" y1="8" x2="19" y2="14"></line>
                     <line x1="16" y1="11" x2="22" y2="11"></line>`
              }
            </svg>
          </button>
        </div>
      `;

      if (!isAlreadyFriend) {
        const addBtn = li.querySelector(".btn-add-friend-result");
        addBtn.addEventListener("click", async () => {
          addBtn.disabled = true;

          const success = await addFriend(user);

          if (success) {
            addBtn.classList.add("added");
            addBtn.title = "Уже в друзях";
            addBtn.innerHTML = `
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            `;
          } else {
            addBtn.disabled = false;
          }
        });
      }

      searchResults.appendChild(li);
    });
  }
}

async function addFriend(user) {
  const newFriend = {
    id: user.id,
    name: user.name,
    avatar:
      user.avatar ||
      "https://img.icons8.com/?size=100&id=tZuAOUGm9AuS&format=png&color=000000",
    status: user.status || null,
  };

  friendsState.friends.unshift(newFriend);
  renderFriendsList();
  localStorage.setItem("myFriends", JSON.stringify(friendsState.friends));

  try {
    const response = await fetch("/friends/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    }).catch(() => null);

    if (!response) {
      showToast("Друг добавлен локально (сервер недоступен)", "success");
      return true;
    }

    if (response.status === 401) {
      document.location.replace("/login");
      return false;
    }

    const { ok, error } = await response.json();

    if (ok) {
      showToast(`${user.name} добавлен в друзья`, "success");
      return true;
    } else {
      friendsState.friends = friendsState.friends.filter(
        (f) => f.id !== user.id,
      );
      renderFriendsList();
      localStorage.setItem("myFriends", JSON.stringify(friendsState.friends));
      showToast(`Ошибка: ${error}`, "error");
      return false;
    }
  } catch (err) {
    console.error("Ошибка добавления друга:", err);
    showToast("Друг добавлен локально", "success");
    return true;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("/profile", {
      method: "POST",
    }).catch(() => null);

    if (!response) {
      const saved = localStorage.getItem("myFriends");
      friendsState.friends = saved ? JSON.parse(saved) : [];
      renderFriendsList();
      return;
    }

    if (response.status === 401) {
      document.location.replace("/login");
      return;
    }

    const data = await response.json();

    if (data.ok) {
      const allFriendsInfo = await Promise.all(
        data.friends.map(async (userId) => {
          const response = await fetch("/profile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId }),
          });

          if (!response) {
            return null;
          }

          const userData = await response.json();

          if (!userData.ok) {
            return null;
          }

          return userData;
        }),
      ).catch(() => null);

      if (!allFriendsInfo) {
        showToast("Ошибка при загрузке друзей", "error");
        return;
      } else {
        friendsState.friends = allFriendsInfo || [];
        localStorage.setItem("myFriends", JSON.stringify(friendsState.friends));
      }
    } else {
      console.error("Ошибка загрузки друзей:", data.error);
      const saved = localStorage.getItem("myFriends");
      friendsState.friends = saved ? JSON.parse(saved) : [];
    }
  } catch (err) {
    console.error("Ошибка загрузки друзей:", err);
    const saved = localStorage.getItem("myFriends");
    friendsState.friends = saved ? JSON.parse(saved) : [];
  }

  renderFriendsList();

  setupFriendsOverlay();

  if (friendsLocalSearchInput) {
    friendsLocalSearchInput.addEventListener("input", () => {
      const query = friendsLocalSearchInput.value.trim().toLowerCase();

      if (!query) {
        renderFriendsList();
        return;
      }

      const filtered = friendsState.friends.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          (f.status && f.status.toLowerCase().includes(query)),
      );

      renderFriendsList(filtered);
    });
  }
});
