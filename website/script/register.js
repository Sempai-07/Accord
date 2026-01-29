const form = document.getElementById("registerForm");
const errorDiv = document.getElementById("error");

form.addEventListener("submit", async (e) => {
  e.preventDefault(); // отключаем стандартное поведение формы

  errorDiv.textContent = "";
  const login = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirm = document.getElementById("confirm").value;

  if (password !== confirm) {
    errorDiv.style.color = "red";
    errorDiv.textContent = "Пароли не совпадают!";
    return;
  }

  try {
    const res = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, email, password }),
    });

    const data = await res.json();

    if (data.ok) {
      errorDiv.style.color = "green";
      errorDiv.textContent = "Регистрация успешна! Перенаправление...";
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } else {
      errorDiv.style.color = "red";
      errorDiv.textContent = data.error || "Что-то пошло не так";
    }
  } catch (err) {
    console.error(err);
    errorDiv.style.color = "red";
    errorDiv.textContent = "Ошибка соединения с сервером";
  }
});
