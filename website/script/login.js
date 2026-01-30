const form = document.getElementById("loginForm");
const errorBox = document.getElementById("error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  errorBox.style.display = "none";

  const login = document.getElementById("login").value;
  const password = document.getElementById("password").value;

  const request = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ login, password }),
  });

  const response = await request.json();

  if (response.ok) {
    window.location.replace("/profile");
  } else {
    errorBox.textContent = response.error;
    errorBox.style.display = "block";
  }
});
