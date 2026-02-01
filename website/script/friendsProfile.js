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
const shuffleBtn = document.getElementById("shuffleBtn");
const shuffleBtnLarge = document.getElementById("shuffleBtnLarge");
const repeatBtn = document.getElementById("repeatBtn");
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
  user: null,
  allSongs: [],
  displayedSongs: [],
  currentPage: 1,
  currentView: "list",
  isLoading: false,
  currentTrack: null,
  isPlaying: false,
  isShuffle: false,
  shuffleSongs: [],
};

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
    li.dataset.trackId = song.trackId;
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

    if (state.isShuffle && state.shuffleSongs.length > 0) {
      const currentIndex = state.shuffleSongs.findIndex(
        (s) => s.trackId === state.currentTrack?.trackId,
      );

      if (currentIndex >= 0 && currentIndex < state.shuffleSongs.length - 1) {
        playTrack(state.shuffleSongs[currentIndex + 1]);
      } else {
        const shuffled = shuffleArray([...state.allSongs]);
        state.shuffleSongs = shuffled;
        playTrack(state.shuffleSongs[0]);
      }
    } else {
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

      miniPlayer.classList.remove("hidden");
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

  shuffleBtn.addEventListener("click", toggleShuffle);

  shuffleBtnLarge.addEventListener("click", toggleShuffle);

  player.volume = 0.7;
}

function toggleShuffle() {
  if (state.allSongs.length <= 2) {
    showToast(
      "Чтобы перемешать песни, нужно иметь 3 и более добавленных песен",
      "error",
    );
    return;
  }

  state.isShuffle = !state.isShuffle;

  if (state.isShuffle) {
    // Включаем shuffle
    if (shuffleBtn) shuffleBtn.classList.add("active");
    if (shuffleBtnLarge) shuffleBtnLarge.classList.add("active");
    showToast("Перемешивание включено", "success");

    // Создаём перемешанный плейлист
    const shuffled = shuffleArray([...state.allSongs]);

    // Если сейчас играет трек, находим его и ставим в начало
    if (state.currentTrack) {
      const currentIndex = shuffled.findIndex(
        (s) => s.trackId === state.currentTrack.trackId,
      );
      if (currentIndex > 0) {
        // Перемещаем текущий трек в начало
        const [current] = shuffled.splice(currentIndex, 1);
        shuffled.unshift(current);
      }
    }

    state.shuffleSongs = shuffled;
  } else {
    // Выключаем shuffle
    if (shuffleBtn) shuffleBtn.classList.remove("active");
    if (shuffleBtnLarge) shuffleBtnLarge.classList.remove("active");
    state.shuffleSongs = [];
    showToast("Перемешивание выключено", "success");
  }
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function playTrack(song) {
  if (state.currentTrack?.trackId === song.trackId && state.isPlaying) {
    player.pause();
    state.isPlaying = false;

    const newPlayTrack = document.querySelector(
      `li[data-track-id="${song.trackId}"]`,
    );

    if (newPlayTrack) {
      newPlayTrack.classList.remove("playing");
    }

    updatePlayerUI();
  } else {
    state.currentTrack = song;
    player.src = song.preview;
    player.play();
    state.isPlaying = true;

    const newPlayTrack = document.querySelector(
      `li[data-track-id="${song.trackId}"]`,
    );

    if (newPlayTrack) {
      newPlayTrack.classList.add("playing");
    }

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

  // Обновляем иконки play/pause
  const icon = state.isPlaying
    ? '<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>'
    : '<path d="M8 5v14l11-7z"/>';
  playerPlayBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">${icon}</svg>`;

  const fullscreenPlayBtn = document.getElementById("fullscreenPlayBtn");
  if (fullscreenPlayBtn) {
    fullscreenPlayBtn.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">${icon}</svg>`;
  }

  if (shuffleBtn) {
    if (state.isShuffle) {
      shuffleBtn.classList.add("active");
    } else {
      shuffleBtn.classList.remove("active");
    }
  }

  if (shuffleBtnLarge) {
    if (state.isShuffle) {
      shuffleBtnLarge.classList.add("active");
    } else {
      shuffleBtnLarge.classList.remove("active");
    }
  }

  if (navPlayerBtn) {
    if (state.currentTrack) {
      navPlayerBtn.classList.remove("disabled");
    } else {
      navPlayerBtn.classList.add("disabled");
    }
  }

  updateSongItemsState();
}

function updateSongItemsState() {
  const songItems = document.querySelectorAll(".song-item");

  songItems.forEach((item) => {
    const artwork = item.querySelector(".song-artwork");
    const playOverlay = item.querySelector(".play-overlay svg path");

    const trackId = Number(item.dataset.trackId);

    const isCurrentTrack =
      state.currentTrack && state.currentTrack.trackId === trackId;
    const isPlaying = isCurrentTrack && state.isPlaying;

    if (isCurrentTrack) {
      item.classList.add("playing");
    } else {
      item.classList.remove("playing");
    }

    // Обновляем иконку в overlay
    if (playOverlay) {
      playOverlay.setAttribute(
        "d",
        isPlaying ? "M6 4h4v16H6V4zm8 0h4v16h-4V4z" : "M8 5v14l11-7z",
      );
    }
  });
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
  const id = new URL(location.href).pathname.split("/")[2];

  const profileResponse = await fetch("/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: id ?? null }),
  }).catch(() => null);

  if (profileResponse.status === 401) {
    document.location.replace("/login");
  }

  if (profileResponse) {
    const user = await profileResponse.json();

    if (user.ok) {
      userName.textContent = user.name || "Пользователь";

      userAvatar.src =
        user.avatar ||
        "https://img.icons8.com/?size=100&id=tZuAOUGm9AuS&format=png&color=000000";

      memberSince.textContent = `Участник с ${user.memberSince || "2026"}`;

      state.user = user;
    } else {
      showToast("Ошибка при загрузке профиля", "error");
      console.error("Ошибка при загрузке профиля:", user.error);
    }
  }

  const songsResponse = await fetch("/profile/songs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: id ?? null }),
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

      if (state.isShuffle && state.shuffleSongs.length > 0) {
        const currentIndex = state.shuffleSongs.findIndex(
          (s) => s.trackId === state.currentTrack?.trackId,
        );
        const prevIndex =
          currentIndex > 0 ? currentIndex - 1 : state.shuffleSongs.length - 1;
        playTrack(state.shuffleSongs[prevIndex]);
      } else {
        const currentIndex = state.allSongs.findIndex(
          (s) => s.trackId === state.currentTrack?.trackId,
        );
        const prevIndex =
          currentIndex > 0 ? currentIndex - 1 : state.allSongs.length - 1;
        playTrack(state.allSongs[prevIndex]);
      }
    });
  }

  if (nextBtnLarge) {
    nextBtnLarge.addEventListener("click", () => {
      if (state.allSongs.length === 0) return;

      if (state.isShuffle && state.shuffleSongs.length > 0) {
        const currentIndex = state.shuffleSongs.findIndex(
          (s) => s.trackId === state.currentTrack?.trackId,
        );

        if (currentIndex >= 0 && currentIndex < state.shuffleSongs.length - 1) {
          playTrack(state.shuffleSongs[currentIndex + 1]);
        } else {
          const shuffled = shuffleArray([...state.allSongs]);
          state.shuffleSongs = shuffled;
          playTrack(state.shuffleSongs[0]);
        }
      } else {
        const currentIndex = state.allSongs.findIndex(
          (s) => s.trackId === state.currentTrack?.trackId,
        );
        const nextIndex = (currentIndex + 1) % state.allSongs.length;
        playTrack(state.allSongs[nextIndex]);
      }
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

      if (state.isShuffle && state.shuffleSongs.length > 0) {
        const currentIndex = state.shuffleSongs.findIndex(
          (s) => s.trackId === state.currentTrack?.trackId,
        );
        const prevIndex =
          currentIndex > 0 ? currentIndex - 1 : state.shuffleSongs.length - 1;
        playTrack(state.shuffleSongs[prevIndex]);
      } else {
        const currentIndex = state.allSongs.findIndex(
          (s) => s.trackId === state.currentTrack?.trackId,
        );
        const prevIndex =
          currentIndex > 0 ? currentIndex - 1 : state.allSongs.length - 1;
        playTrack(state.allSongs[prevIndex]);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (state.allSongs.length === 0) return;

      if (state.isShuffle && state.shuffleSongs.length > 0) {
        const currentIndex = state.shuffleSongs.findIndex(
          (s) => s.trackId === state.currentTrack?.trackId,
        );

        if (currentIndex >= 0 && currentIndex < state.shuffleSongs.length - 1) {
          playTrack(state.shuffleSongs[currentIndex + 1]);
        } else {
          const shuffled = shuffleArray([...state.allSongs]);
          state.shuffleSongs = shuffled;
          playTrack(state.shuffleSongs[0]);
        }
      } else {
        const currentIndex = state.allSongs.findIndex(
          (s) => s.trackId === state.currentTrack?.trackId,
        );
        const nextIndex = (currentIndex + 1) % state.allSongs.length;
        playTrack(state.allSongs[nextIndex]);
      }
    });
  }

  setupPlayer();
});
