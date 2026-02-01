import "path";
import "coreio";
import "crypto";
import "uuid";
import "time";
import "strings";
import "net/http";
import "./database/database.ml";
import "./server/bcrypto.ml";
import "arrays";

var server = http.Server({
  cache: { enabled: false },
  static: {
    noCache: true,
    root: process.cwd(),
    index: "index.html",
    clearOnRestart: true,
  },
});

server.use(func (context, next) {
  var token = context.cookies?.accessToken;
  
  if (!token) {
    context.status(401);
    return next();
   }
   
  var user = database.users.find(func(user) {
    return user.accessToken == token;
  });

  if (!user) {
    context.status(401);
    return next();
  }
  
  if (user?.tokenExpiresAt && (time.now() > user?.tokenExpiresAt)) {
    user.accessToken = nil;
    user.tokenExpiresAt = nil;
    database.users.set(user.id, user);
    
    context.clearCookie("accessToken");
    context.user = nil;
    
    context.status(200);
    return next();
  }
  
  context.user = {
    id: user.id,
    login: user.login,
  };
  
  context.status(200);
  
  next();
});

server.get("/", func(context) {
  if (!context?.user) {
    return context.redirect("/login");
  }
  
  return context.sendFile(import("./website/login.html"), {
    "Content-Type": "text/html; charset=utf-8",
  });
});

server.get("/login", func(context) {
  return context.sendFile(import("./website/login.html"), {
    "Content-Type": "text/html; charset=utf-8",
  });
});

server.get("/register", func(context) {
  return context.sendFile(import("./website/register.html"), {
    "Content-Type": "text/html; charset=utf-8",
  });
});

server.get("/profile", func(context) {
  if (!context?.user) {
    return context.redirect("/login");
  }
  
  return context.sendFile(import("./index.html"), {
    "Content-Type": "text/html; charset=utf-8",
  });
});

server.get("/profile/:id", func(context) {
  if (context.params?.id) {
    if (!context?.user) {
      return context.redirect("/login");
    }
      
    if (database.users.has(context.params.id)) {
      if (!context?.user) {
       return context.redirect("/login");
      }
      
      if (context.params.id == context.user?.id) {
        return context.sendFile(import("./index.html"), {
          "Content-Type": "text/html; charset=utf-8",
        });
      }
  
      return context.sendFile(import("./website/friends.html"), {
        "Content-Type": "text/html; charset=utf-8",
      });
    }
  }
  
  if (!context?.user) {
    return context.redirect("/login");
  }
  
  return context.sendFile(import("./index.html"), {
    "Content-Type": "text/html; charset=utf-8",
  });
});

server.post("/register", func(context) {
  var login = context.body?.login;
  var password = context.body?.password;
  var email = context.body?.email;

  if (login == nil || password == nil) {
    return context.json({ ok: false, error: "Неверные данные" }, 400);
  }
  
  if (length(login) < 2) {
    return context.json({ ok: false, error: "Логин должен быть больше или ровно 3 символов" }, 409);
  }
  
  if (length(password) <= 5) {
    return context.json({ ok: false, error: "Пароль должен быть больше или ровно 6 символов" }, 422);
  }
  
  var user = database.users.find(func(user) {
    return user.login == login;
  });
  
  if (user) {
    return context.json({ ok: false, error: "Пользователь уже существует" }, 409);
  }
  
  var alertEmail = database.users.find(func(user) {
    return user.email == email;
  });
  
  if (alertEmail) {
    return context.json({ ok: false, error: "Эта почта уже используется" }, 409);
  }
  
  var userID = uuid.v4();
  var hashedPassword = bcrypto.hashPassword(password);
  
  database.users.set(userID, {
    id: userID,
    login,
    email,
    friends: [],
    password: hashedPassword,
    createdAt: time.now(),
    accessToken: nil,
    tokenExpiresAt: nil,
  });
  
  return context.json({ ok: true });
});

server.post("/login", func(context) {
  var login = context.body?.login;
  var password = context.body?.password;
  
  var user = database.users.find(func(user) {
    return user.login == login;
  });
  
  if (!user) {
    return context.json({ ok: false, error: "Неверные данные" }, 401);
  }
  
  if (!bcrypto.comparePassword(password, user.password)) {
    return context.json({ ok: false, error: "Неверные данные" }, 401);
  }
  
  var token = uuid.v4();
  
  user.accessToken = token;
  user.tokenExpiresAt = time.now() + (7 * 24 * 60 * 60);
  
  database.users.set(user.id, user);
  
  context.cookie("accessToken", token, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 3600000,
  });
  
  return context.json({ ok: true }, 200);
});

server.post("/songs/add", func(context) {
  if (!context?.user) {
    return context.json({ ok: false, error: "Пользователь отсутствует" }, 401);
  }
  
  var oldSongs = database.songs.get(context.user.id) || [];
  
  arrays.unshift(oldSongs, {
    title: context.body.title,
    artist: context.body.artist,
    artwork: context.body.artwork,
    preview: context.body.preview,
    trackId: context.body.trackId,
    createdAt: context.body.createdAt,
  });
  
  database.songs.set(context.user.id, oldSongs);
  
  return context.json({ ok: true }, 200);
});

server.post("/songs/delete", func(context) {
  if (!context?.user) {
    return context.json({ ok: false, error: "Пользователь отсутствует" }, 401);
  }
  
  var oldSongs = database.songs.get(context.user.id) || [];
  
  var newSongs = arrays.filter(oldSongs, func(arr) {
    return arr.trackId != context.body.trackId;
  });
  
  database.songs.set(context.user.id, newSongs);
  
  return context.json({ ok: true }, 200);
});

server.post("/profile", func(context) {
  if (!context?.user) {
    return context.json({ ok: false, error: "Пользователь отсутствует" }, 401);
  }
  
  if (context?.body?.userId) {
    var userData = database.users.get(context.body.userId);
    
    if (!userData) {
      return context.json({ ok: false, error: "Пользователь отсутствует" }, 401);
    }
    
    return context.json({ 
      ok: true,
      id: userData.id,
      name: userData?.name || userData.login,
      avatar: userData?.avatar || nil,
      friends: userData?.friends || [],
      memberSince: userData?.memberSince || "2026",
    }, 200);
  }
  
  var userData = database.users.get(context.user.id);
  
  return context.json({ 
    ok: true,
    id: userData.id,
    name: userData?.name || userData.login,
    avatar: userData?.avatar || nil,
    friends: userData?.friends || [],
    memberSince: userData?.memberSince || "2026",
   }, 200);
});

server.post("/friends/search", func(context) {
  if (!context?.user) {
    return context.json({ ok: false, error: "Пользователь отсутствует" }, 401);
  }
  
  var login = context.body.login;
  
  var allUsers = database.users.all();
  var allListUsers = [];
  
  for (var userId in allUsers) {
    var userData = allUsers[userId];
    
    if (userId == context.user.id) {
      continue;
    }
    
    if (strings.includes(userData.login, login)) {
      arrays.push(allListUsers, {
        id: userData.id,
        name: userData?.name || userData.login,
        avatar: userData?.avatar || nil,
        friends: userData?.friends || [],
        memberSince: userData?.memberSince || "2026",
      });
    }
  }
  
  return context.json({ 
    ok: true,
    users: allListUsers,
   }, 200);
});

server.post("/friends/add", func(context) {
  if (!context?.user) {
    return context.json({ ok: false, error: "Пользователь отсутствует" }, 401);
  }
  
  var userId = context.body.userId;
  
  if (context.user.id == userId) {
    return context.json({
      ok: false,
      error: "Пользователь не найден",
    }, 409);
  }
  
  var userAddedData = database.users.get(userId);
  
  if (!userAddedData) {
    return context.json({
      ok: false,
      error: "Пользователь не найден",
    }, 409);
  }
  
  var userData = database.users.get(context.user.id);
  
  arrays.push(userData.friends, userAddedData.id);
  
  database.users.set(context.user.id, userData);
  
  return context.json({ ok: true }, 200);
});

server.post("/friends/remove", func(context) {
  if (!context?.user) {
    return context.json({ ok: false, error: "Пользователь отсутствует" }, 401);
  }
  
  var userId = context.body.userId;
  
  if (context.user.id == userId) {
    return context.json({
      ok: false,
      error: "Пользователь не найден",
    }, 409);
  }
  
  var userAddedData = database.users.get(userId);
  
  if (!userAddedData) {
    return context.json({
      ok: false,
      error: "Пользователь не найден",
    }, 409);
  }
  
  var userData = database.users.get(context.user.id);
  
  userData.friends = arrays.filter(userData.friends, func(id) {
    return id != userId;
  });
  
  database.users.set(context.user.id, userData);
  
  return context.json({ ok: true }, 200);
});

server.post("/songs/search", func(context) {
  try {
    var query = context.body.query;
    
    if (!query) {
      return context.json({ ok: false, error: "Отсутствует запрос" }, 400);
    }
    
    var itunesUrl = $"https://itunes.apple.com/search?term={query}&limit=10&media=music";
    
    var response = http.Request(itunesUrl);
    
    var data = response.send().json();
    
    if (!data.results) {
      return context.json({ ok: false, error: "Ошибка при получении данных" }, 400);
    }
    
    return context.json({ ok: true, songs: data.results }, 200);
  } catch (err) {
    return context.json({ 
      ok: false,
      error: "Failed to fetch from iTunes API",
    }, 400);
  }
});

server.post("/profile/songs", func(context) {
  if (!context?.user) {
    return context.json({ ok: false, error: "Пользователь отсутствует" }, 401);
  }
  
  var songs = database.songs.get(context.user.id);
  
  return context.json({ 
    ok: true,
    songs,
   }, 200);
});

server.post("/profile/edit/avatar", func(context) {
  if (!context?.user) {
    return context.json({ ok: false, error: "Пользователь отсутствует" }, 401);
  }
  
  var response = handleAvatarUpload(context.body.avatar);
  
  if (!response.ok) {
    return context.json({ ok: false, error: response.error }, 400);
  }
  
  var userData = database.users.get(context.user.id);
  
  userData.avatar = context.body.avatar;
  
  database.users.set(context.user.id, userData);
  
  return context.json({ 
    ok: true,
   }, 200);
});

server.cors({
  credentials: true,
});

var port = coreio.input("Port to server: ");

server.listen(port, func() {
  coreio.print($"Server listen http://localhost:{port}");
});
