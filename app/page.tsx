import Link from "next/link";

// Placeholder temporal (SPEC 02, paso 1): se reemplaza por la landing en el paso 7.
export default function Home() {
  return (
    <main style={{ padding: 32 }}>
      <Link href="/juegos" className="btn">
        Ir a la biblioteca
      </Link>
    </main>
  );
}
