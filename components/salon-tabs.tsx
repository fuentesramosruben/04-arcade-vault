import Link from "next/link";
import { GAMES } from "@/lib/games";
import { ENGINES } from "@/lib/games/registry";
// Pestañas del salón como enlaces a rutas: GLOBAL + una por juego con ranking.
// `active` es "global" o el id del juego de la ruta actual.
export function SalonTabs({ active }: { active: string }) {
  const ranked = GAMES.filter((g) => g.id in ENGINES);
  const tabs = [
    { key: "global", href: "/salon", label: "GLOBAL" },
    ...ranked.map((g) => ({
      key: g.id,
      href: `/salon/${g.id}`,
      label: g.title,
    })),
  ];
  return (
    <nav className="hall-tabs" aria-label="Rankings">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={"chip" + (active === t.key ? " active" : "")}
          aria-current={active === t.key ? "page" : undefined}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
