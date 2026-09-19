export function SearchBox({ defaultValue = "", large = false }: { defaultValue?: string; large?: boolean }) {
  return (
    <form action="/search" method="get" role="search" className="flex">
      <label htmlFor={large ? "q-large" : "q"} className="sr-only">
        Search players, seasons and clubs
      </label>
      <input
        id={large ? "q-large" : "q"}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={large ? "A player, a year, a club…" : "Search…"}
        className={`w-full rounded-l border border-line bg-ground px-3 text-ink placeholder:text-ink-3 ${large ? "py-3 text-lg" : "py-1.5 text-sm"}`}
      />
      <button type="submit" className={`rounded-r bg-accent px-4 font-semibold text-white ${large ? "text-base" : "text-sm"}`}>
        Go
      </button>
    </form>
  );
}
