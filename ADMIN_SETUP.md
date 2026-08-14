# Админ-панель VETOC

Сайт на GitHub Pages не может хранить новые файлы сам. Для загрузки материалов используется Supabase: в нём будут храниться фотографии, видео и тексты, а сайт будет их показывать автоматически.

1. Создайте проект на https://supabase.com.
2. В Supabase откройте `SQL Editor`, вставьте содержимое файла `supabase-schema.sql` и нажмите `Run`.
3. В `Project Settings` -> `API` скопируйте `Project URL` и `anon public key`.
4. Откройте `assets/site-config.js` и вставьте значения:

```js
window.VETOC_CONFIG = {
  supabaseUrl: "https://ваш-проект.supabase.co",
  supabaseAnonKey: "ваш-anon-public-key"
};
```

5. В Supabase откройте `Authentication` -> `Users` -> `Add user` и создайте e-mail и пароль администратора.
6. Загрузите на GitHub в корень репозитория обновлённые `index.html`, `admin.html`, папку `assets` и файл `supabase-schema.sql`.
7. Откройте `https://patimejker-creator.github.io/drug/admin.html` и войдите созданным e-mail и паролем.

Anon key не является секретом. Защиту обеспечивают правила доступа в `supabase-schema.sql`: новые материалы может добавлять и удалять только вошедший пользователь.
