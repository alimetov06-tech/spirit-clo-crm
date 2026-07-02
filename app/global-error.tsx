"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ru">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-milk px-4 py-10 text-ink">
          <section className="w-full max-w-lg rounded-lg border border-graphite/10 bg-white p-6 shadow-soft">
            <h1 className="text-xl font-semibold">Не удалось открыть CRM</h1>
            <p className="mt-3 text-sm text-graphite/70">
              Сервер не смог загрузить страницу. Попробуйте обновить её или вернуться ко входу.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white"
              >
                Обновить
              </button>
              <a href="/login" className="rounded-lg bg-graphite/10 px-4 py-2 text-sm font-medium text-ink">
                Ко входу
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
