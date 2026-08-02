<p align="right">
  <a href="./architecture.md">English</a> · <strong>Русский</strong>
</p>

# Архитектура

Orcestr Core разделён по runtime и framework boundaries:

- [`@orcestr/core`](../frontend/packages/core/README.ru.md) содержит независимые
  от framework primitives для transport, parsing ошибок, путей полей,
  каталогов сообщений и безопасной навигации;
- [`@orcestr/core-react`](../frontend/packages/core-react/README.ru.md)
  связывает представление ошибок с React и TanStack Query. Он не рисует UI и
  получает callback уведомления от приложения;
- [`@orcestr/core-next`](../frontend/packages/core-next/README.ru.md) содержит
  небольшой Next.js-слой для определения origin и безопасных redirects;
- [`orcestr-core`](../backend/README.ru.md) содержит Python-модели и тип
  исключения. Опциональный extra `fastapi` добавляет exception handlers и
  request-ID middleware.

Направление зависимости всегда framework adapter → Core. Product domains и
пакеты [Orcestr Auth](https://github.com/Artasov/orcestr-auth) могут зависеть от
Core, но Core не импортирует их. Для визуальных уведомлений можно использовать
[Orcestr UI](https://github.com/Artasov/orcestr-ui), однако Core React принимает
callback и не импортирует UI-библиотеку.

## Ответственность consumer-приложения

«Product/domain-код» означает бизнес-слой приложения, которое подключило Core,
а не название ещё одного обязательного пакета. Этот слой определяет коды вроде
`order_already_closed`, их переводы и возможность повторить операцию.
[Orcestr Auth](https://github.com/Artasov/orcestr-auth) — конкретный domain
package для авторизации; он определяет коды вроде `invalid_credentials`.
[Orcestr UI](https://github.com/Artasov/orcestr-ui) может показать разрешённое
сообщение как alert, ошибку поля или toast.

Core отвечает за wire format, строгий parsing, transport behavior и extension
points. Такое направление сохраняет Core пригодным за пределами продуктов
Orcestr и не позволяет пакету API-контрактов зависеть от авторизации или
визуального дизайна.
