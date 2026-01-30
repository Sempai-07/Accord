const pages = {
  music: document.getElementById("musicPage"),
  friends: document.getElementById("friendsPage"),
  player: document.getElementById("playerPage"),
};

const navItems = document.querySelectorAll(".nav-item");
const navPlayerBtn = document.getElementById("navPlayerBtn");
const closePlayerPageBtn = document.getElementById("closePlayerPage");

const userName = document.getElementById("userName");
const userAvatar = document.getElementById("userAvatar");
const songCount = document.getElementById("songCount");
const memberSince = document.getElementById("memberSince");
const avatarWrapper = document.getElementById("avatarWrapper");
const avatarInput = document.getElementById("avatarInput");

const openFormBtn = document.getElementById("openForm");
const closeFormBtn = document.getElementById("closeForm");
const playAllBtn = document.getElementById("playAllBtn");
const formOverlay = document.getElementById("songFormOverlay");
const songForm = document.getElementById("songForm");
const queryInput = document.getElementById("query");

const searchResults = document.getElementById("searchResults");
const searchStatus = document.getElementById("searchStatus");

const songList = document.getElementById("songList");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const loadMoreBtn = document.getElementById("loadMoreBtn");

const viewBtns = document.querySelectorAll(".view-btn");

const player = document.getElementById("player");
const miniPlayer = document.getElementById("miniPlayer");
const playerArtwork = document.getElementById("playerArtwork");
const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");
const playerPlayBtn = document.getElementById("playerPlayBtn");
const progressFill = document.getElementById("progressFill");
const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");
const volumeBtn = document.getElementById("volumeBtn");
const volumeSlider = document.getElementById("volumeSlider");

const toastContainer = document.getElementById("toastContainer");

function switchPage(pageName) {
  Object.values(pages).forEach((page) => {
    page.classList.remove("active");
  });

  if (pages[pageName]) {
    pages[pageName].classList.add("active");
  }

  navItems.forEach((item) => {
    if (item.dataset.page === pageName) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}

const state = {
  allSongs: [],
  displayedSongs: [],
  currentPage: 1,
  currentView: "list",
  isLoading: false,
  currentTrack: null,
  isPlaying: false,
};

avatarWrapper.addEventListener("click", () => {
  avatarInput.click();
});

avatarInput.addEventListener("change", () => {
  const file = avatarInput.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Можно загружать только изображения", "error");
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    showToast("Максимальный размер — 2 МБ", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const response = await fetch("/profile/edit/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatar: reader.result,
        }),
      }).catch(() => null);

      if (response.status === 401) {
        document.location.replace("/login");
      }

      const { ok = false, error } = await response.json();

      if (ok) {
        userAvatar.src = reader.result;

        showToast("Аватар обновлён", "success");
      } else {
        showToast(error, "error");
      }
    } catch (err) {
      showToast("Ошибка при добавлении", "error");
    }
  };

  reader.readAsDataURL(file);
});

async function addSongToProfile(song) {
  try {
    const response = await fetch("/songs/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: song.trackName,
        artist: song.artistName,
        artwork: song.artworkUrl100,
        preview: song.previewUrl,
        trackId: song.trackId,
      }),
    });

    if (response.status === 401) {
      document.location.replace("/login");
    }

    const { ok, error } = await response.json();

    if (ok) {
      const newSong = {
        trackId: song.trackId,
        title: song.trackName,
        artist: song.artistName,
        artwork: song.artworkUrl100,
        preview: song.previewUrl,
      };

      state.allSongs.unshift(newSong);
      showToast("Песня добавлена в вашу коллекцию", "success");
      updateSongsList();

      const countSongs = state.allSongs.length;
      const wordSongs =
        countSongs === 1 ? "песня" : countSongs < 5 ? "песни" : "песен";
      songCount.textContent = `${countSongs} ${wordSongs}`;

      localStorage.setItem("mySongs", JSON.stringify(state.allSongs));

      return true;
    } else {
      throw new Error(error);
    }
  } catch (err) {
    console.error("Ошибка добавления песни:", err);

    const newSong = {
      trackId: song.trackId,
      title: song.trackName,
      artist: song.artistName,
      artwork: song.artworkUrl100,
      preview: song.previewUrl,
    };

    state.allSongs.unshift(newSong);

    showToast("Песня добавлена локально", "success");
    updateSongsList();

    const countSongs = state.allSongs.length;
    const wordSongs =
      countSongs === 1 ? "песня" : countSongs < 5 ? "песни" : "песен";
    songCount.textContent = `${countSongs} ${wordSongs}`;

    localStorage.setItem("mySongs", JSON.stringify(state.allSongs));

    return true;
  }
}

function updateSongsList() {
  const start = 0;
  const end = state.currentPage * 12;
  state.displayedSongs = state.allSongs.slice(start, end);

  if (state.allSongs.length === 0) {
    emptyState.classList.remove("hidden");
    songList.innerHTML = "";
    loadMoreBtn.classList.add("hidden");
    playAllBtn.disabled = true;
  } else {
    emptyState.classList.add("hidden");
    playAllBtn.disabled = false;

    renderSongs();

    if (state.allSongs.length > end) {
      loadMoreBtn.classList.remove("hidden");
    } else {
      loadMoreBtn.classList.add("hidden");
    }
  }
}

function renderSongs() {
  songList.innerHTML = "";

  state.displayedSongs.forEach((song, index) => {
    const li = document.createElement("li");
    li.className = "song-item";
    li.style.animationDelay = `${index * 0.05}s`;

    if (state.currentTrack && state.currentTrack.trackId === song.trackId) {
      li.classList.add("playing");
    }

    li.innerHTML = `
      <div class="song-artwork">
        <img src="${song.artwork}" alt="${song.title}">
        <div class="play-overlay">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="${state.currentTrack?.trackId === song.trackId && state.isPlaying ? "M6 4h4v16H6V4zm8 0h4v16h-4V4z" : "M8 5v14l11-7z"}"/>
          </svg>
        </div>
      </div>
      <div class="song-info">
        <div class="song-title">${song.title}</div>
        <div class="song-artist">${song.artist}</div>
      </div>
      <div class="song-actions">
        <button class="btn-action btn-delete" title="Удалить">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    li.addEventListener("click", (e) => {
      if (!e.target.closest(".btn-action")) {
        playTrack(song);
      }
    });

    const deleteBtn = li.querySelector(".btn-delete");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteSong(song.trackId);
    });

    songList.appendChild(li);
  });
}

async function deleteSong(songId) {
  if (confirm("Вы уверены, что хотите удалить эту песню?")) {
    state.allSongs = state.allSongs.filter((s) => s.trackId !== songId);

    if (state.currentTrack?.trackId === songId) {
      player.pause();
      player.currentTime = 0;
      state.isPlaying = false;
      state.currentTrack = null;
      miniPlayer.classList.add("hidden");
      renderSongs();
    }

    const response = await fetch("/songs/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackId: songId,
      }),
    }).catch(() => null);

    if (response.status === 401) {
      document.location.replace("/login");
    }

    const { ok, error } = await response.json();

    if (ok) {
      updateSongsList();

      const countSongs = state.allSongs.length;
      const wordSongs =
        countSongs === 1 ? "песня" : countSongs < 5 ? "песни" : "песен";
      songCount.textContent = `${countSongs} ${wordSongs}`;

      localStorage.setItem("mySongs", JSON.stringify(state.allSongs));

      showToast("Песня удалена", "success");
    } else {
      showToast(`Произошла ошибка при удалении: ${error}`, "error");
    }
  }
}

async function searchSongs(query) {
  if (!query.trim()) return;

  searchStatus.classList.remove("hidden");
  searchResults.innerHTML = "";

  try {
    const response = await fetch("/songs/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: decodeURIComponent(query),
      }),
    });

    if (response.status === 401) {
      document.location.replace("/login");
    }

    const { ok, error, songs } = await response.json();

    if (!ok) {
      alert(String(error));
      searchStatus.classList.add("hidden");
      console.error("Ошибка поиска:", error);
      showToast("Ошибка поиска. Попробуйте еще раз", "error");
      return;
    }

    searchStatus.classList.add("hidden");

    if (songs && songs.length > 0) {
      renderSearchResults(songs);
    } else {
      searchResults.innerHTML =
        '<p style="padding: 20px; text-align: center; color: var(--text-secondary);">Ничего не найдено</p>';
    }
  } catch (error) {
    alert(String(error));
    console.error("Ошибка поиска:", error);
    searchStatus.classList.add("hidden");
    showToast("Ошибка поиска. Попробуйте еще раз", "error");
  }
}

function renderSearchResults(results) {
  searchResults.innerHTML = "";

  results.forEach((song, index) => {
    const isAdded = state.allSongs.some((s) => s.trackId === song.trackId);

    const li = document.createElement("li");
    li.className = "song-item";
    li.style.animationDelay = `${index * 0.05}s`;

    li.innerHTML = `
      <div class="song-artwork">
        <img src="${song.artworkUrl100}" alt="${song.trackName}">
        <div class="play-overlay">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
      <div class="song-info">
        <div class="song-title">${song.trackName}</div>
        <div class="song-artist">${song.artistName}</div>
      </div>
      <div class="song-actions" style="opacity: 1;">
        <button class="btn-action btn-preview" title="Прослушать">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
        <button class="btn-action btn-add ${isAdded ? "added" : ""}" title="${isAdded ? "Уже добавлено" : "Добавить"}" ${isAdded ? "disabled" : ""}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${
              isAdded
                ? '<polyline points="20 6 9 17 4 12"></polyline>'
                : '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>'
            }
          </svg>
        </button>
      </div>
    `;

    const previewBtn = li.querySelector(".btn-preview");
    previewBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      player.src = song.previewUrl;
      player.play();
    });

    const addBtn = li.querySelector(".btn-add");
    if (!isAdded) {
      addBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        addBtn.disabled = true;

        const success = await addSongToProfile(song);
        if (success) {
          addBtn.classList.add("added");
          addBtn.title = "Уже добавлено";
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

function setupPlayer() {
  player.addEventListener("timeupdate", () => {
    const percent = (player.currentTime / player.duration) * 100;
    progressFill.style.width = `${percent}%`;
    currentTime.textContent = formatTime(player.currentTime);
  });

  player.addEventListener("loadedmetadata", () => {
    duration.textContent = formatTime(player.duration);
  });

  player.addEventListener("ended", () => {
    if (state.allSongs.length === 0) return;

    const currentIndex = state.allSongs.findIndex(
      (s) => s.trackId === state.currentTrack?.trackId,
    );
    const nextIndex = (currentIndex + 1) % state.allSongs.length;

    if (nextIndex < state.allSongs.length) {
      playTrack(state.allSongs[nextIndex]);
    } else {
      state.isPlaying = false;
      updatePlayerUI();
    }
  });

  playerPlayBtn.addEventListener("click", () => {
    if (state.isPlaying) {
      player.pause();
      state.isPlaying = false;
      updatePlayerUI();
    } else {
      player.play();
      state.isPlaying = true;
      updatePlayerUI();
    }
  });

  volumeSlider.addEventListener("input", (e) => {
    player.volume = e.target.value / 100;
  });

  volumeBtn.addEventListener("click", () => {
    if (player.volume > 0) {
      player.volume = 0;
      volumeSlider.value = 0;
    } else {
      player.volume = 0.7;
      volumeSlider.value = 70;
    }
  });

  player.volume = 0.7;
}

function playTrack(song) {
  if (state.currentTrack?.trackId === song.trackId && state.isPlaying) {
    player.pause();
    state.isPlaying = false;
    updatePlayerUI();
  } else {
    state.currentTrack = song;
    player.src = song.preview;
    player.play();
    state.isPlaying = true;

    updatePlayerUI();

    miniPlayer.classList.remove("hidden");
  }
}

function updatePlayerUI() {
  if (!state.currentTrack) return;

  playerArtwork.src = state.currentTrack.artwork;
  playerTitle.textContent = state.currentTrack.title;
  playerArtist.textContent = state.currentTrack.artist;

  const fullscreenArtwork = document.getElementById("fullscreenArtwork");
  const fullscreenTitle = document.getElementById("fullscreenTitle");
  const fullscreenArtist = document.getElementById("fullscreenArtist");

  if (fullscreenArtwork) fullscreenArtwork.src = state.currentTrack.artwork;
  if (fullscreenTitle) fullscreenTitle.textContent = state.currentTrack.title;
  if (fullscreenArtist)
    fullscreenArtist.textContent = state.currentTrack.artist;

  const icon = state.isPlaying
    ? '<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>'
    : '<path d="M8 5v14l11-7z"/>';
  playerPlayBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">${icon}</svg>`;

  const fullscreenPlayBtn = document.getElementById("fullscreenPlayBtn");
  if (fullscreenPlayBtn) {
    fullscreenPlayBtn.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">${icon}</svg>`;
  }

  if (navPlayerBtn) {
    if (state.currentTrack) {
      navPlayerBtn.classList.remove("disabled");
    } else {
      navPlayerBtn.classList.add("disabled");
    }
  }

  renderSongs();
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function showLoadingState(show) {
  if (show) {
    loadingState.classList.remove("hidden");
    songList.classList.add("hidden");
  } else {
    loadingState.classList.add("hidden");
    songList.classList.remove("hidden");
  }
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icon = type === "success" ? "✓" : "✕";

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation =
      "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

document.addEventListener("keydown", (keydown) => {
  if (
    keydown.code === "Space" &&
    state.currentTrack &&
    !keydown.target.matches("input, textarea")
  ) {
    keydown.preventDefault();
    if (state.isPlaying) {
      player.pause();
      state.isPlaying = false;
      updatePlayerUI();
    } else {
      player.play();
      state.isPlaying = true;
      updatePlayerUI();
    }
  }

  if (keydown.code === "Escape" && !formOverlay.classList.contains("hidden")) {
    formOverlay.classList.add("hidden");
    queryInput.value = "";
    searchResults.innerHTML = "";
    searchStatus.classList.add("hidden");
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const profileResponse = await fetch("/profile", {
    method: "POST",
  }).catch(() => null);

  if (profileResponse.status === 401) {
    document.location.replace("/login");
  }

  if (profileResponse) {
    const user = await profileResponse.json();

    if (user.ok) {
      userName.textContent = user.name || "Пользователь";

      userAvatar.src = user.avatar || "https://i.imgur.com/8Km9tLL.png";

      memberSince.textContent = `Участник с ${user.memberSince || "2026"}`;
    } else {
      showToast("Ошибка при загрузке профиля", "error");
      console.error("Ошибка при загрузке профиля:", user.error);
    }
  }

  const songsResponse = await fetch("/profile/songs", {
    method: "POST",
  }).catch(() => null);

  if (songsResponse.status === 401) {
    document.location.replace("/login");
  }

  if (songsResponse) {
    const data = await songsResponse.json();

    if (data.ok) {
      state.allSongs = data.songs || [];
    } else {
      const saved = localStorage.getItem("mySongs");
      state.allSongs = saved ? JSON.parse(saved) : [];
      console.error("Ошибка при загрузке песен:", data.error);
    }
  } else {
    const saved = localStorage.getItem("mySongs");
    state.allSongs = saved ? JSON.parse(saved) : [];
  }

  showLoadingState(false);

  updateSongsList();

  const countSongs = state.allSongs.length;
  const wordSongs =
    countSongs === 1 ? "песня" : countSongs < 5 ? "песни" : "песен";
  songCount.textContent = `${countSongs} ${wordSongs}`;

  openFormBtn.addEventListener("click", () => {
    formOverlay.classList.remove("hidden");
    queryInput.focus();
  });

  closeFormBtn.addEventListener("click", () => {
    formOverlay.classList.add("hidden");
    queryInput.value = "";
    searchResults.innerHTML = "";
    searchStatus.classList.add("hidden");
  });

  formOverlay.addEventListener("click", (e) => {
    if (e.target === formOverlay) {
      formOverlay.classList.add("hidden");
      queryInput.value = "";
      searchResults.innerHTML = "";
      searchStatus.classList.add("hidden");
    }
  });

  songForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = queryInput.value.trim();
    if (query) {
      await searchSongs(query);
    }
  });

  playAllBtn.addEventListener("click", () => {
    if (state.allSongs.length > 0) {
      playTrack(state.allSongs[0]);
    }
  });

  loadMoreBtn.addEventListener("click", () => {
    state.currentPage++;
    updateSongsList();
  });

  const currentView = localStorage.getItem("viewModePlayList") || "list";

  viewBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      state.currentView = view;

      localStorage.setItem("viewModePlayList", view);

      viewBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      songList.className = `song-list ${view}-view`;
    });

    state.currentView = currentView;

    viewBtns.forEach((b) => b.classList.remove("active"));

    songList.className = `song-list ${currentView}-view`;
  });

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const pageName = item.dataset.page;
      if (pageName === "player" && !state.currentTrack) {
        showToast("Сначала выберите песню", "error");
        return;
      }
      switchPage(pageName);
    });
  });

  if (closePlayerPageBtn) {
    closePlayerPageBtn.addEventListener("click", () => {
      switchPage("music");
    });
  }

  const fullscreenPlayBtn = document.getElementById("fullscreenPlayBtn");
  const prevBtnLarge = document.getElementById("prevBtnLarge");
  const nextBtnLarge = document.getElementById("nextBtnLarge");
  const volumeSliderLarge = document.getElementById("volumeSliderLarge");
  const progressFillLarge = document.getElementById("progressFillLarge");
  const currentTimeLarge = document.getElementById("currentTimeLarge");
  const durationLarge = document.getElementById("durationLarge");

  if (fullscreenPlayBtn) {
    fullscreenPlayBtn.addEventListener("click", () => {
      if (state.isPlaying) {
        player.pause();
        state.isPlaying = false;
      } else {
        player.play();
        state.isPlaying = true;
      }
      updatePlayerUI();
    });
  }

  if (prevBtnLarge) {
    prevBtnLarge.addEventListener("click", () => {
      if (state.allSongs.length === 0) return;
      const currentIndex = state.allSongs.findIndex(
        (s) => s.trackId === state.currentTrack?.trackId,
      );
      const prevIndex =
        currentIndex > 0 ? currentIndex - 1 : state.allSongs.length - 1;
      playTrack(state.allSongs[prevIndex]);
    });
  }

  if (nextBtnLarge) {
    nextBtnLarge.addEventListener("click", () => {
      if (state.allSongs.length === 0) return;
      const currentIndex = state.allSongs.findIndex(
        (s) => s.trackId === state.currentTrack?.trackId,
      );
      const nextIndex = (currentIndex + 1) % state.allSongs.length;
      playTrack(state.allSongs[nextIndex]);
    });
  }

  if (volumeSliderLarge) {
    volumeSliderLarge.addEventListener("input", (e) => {
      player.volume = e.target.value / 100;
      volumeSlider.value = e.target.value;
    });
  }

  player.addEventListener("timeupdate", () => {
    if (progressFillLarge) {
      const percent = (player.currentTime / player.duration) * 100;
      progressFillLarge.style.width = `${percent}%`;
    }
    if (currentTimeLarge) {
      currentTimeLarge.textContent = formatTime(player.currentTime);
    }
  });

  player.addEventListener("loadedmetadata", () => {
    if (durationLarge) {
      durationLarge.textContent = formatTime(player.duration);
    }
  });

  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (state.allSongs.length === 0) return;
      const currentIndex = state.allSongs.findIndex(
        (s) => s.trackId === state.currentTrack?.trackId,
      );
      const prevIndex =
        currentIndex > 0 ? currentIndex - 1 : state.allSongs.length - 1;
      playTrack(state.allSongs[prevIndex]);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (state.allSongs.length === 0) return;
      const currentIndex = state.allSongs.findIndex(
        (s) => s.trackId === state.currentTrack?.trackId,
      );
      const nextIndex = (currentIndex + 1) % state.allSongs.length;
      playTrack(state.allSongs[nextIndex]);
    });
  }

  setupPlayer();
});
