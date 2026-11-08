import Link from "next/link";
import { requireScope } from "@/lib/auth/dal";

export default async function LibraryLayout({ children }: LayoutProps<"/panel/biblioteca">) {
  await requireScope("clients");
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-3xl font-extrabold">Biblioteca</h1>
      <nav
        className="-mx-4 flex gap-4 overflow-x-auto border-b px-4 text-sm font-medium whitespace-nowrap"
        aria-label="Biblioteca"
      >
        <Link href="/panel/biblioteca" className="-mb-px border-b-2 border-transparent pb-2 hover:border-current">
          Ejercicios
        </Link>
        <Link
          href="/panel/biblioteca/plantillas"
          className="-mb-px border-b-2 border-transparent pb-2 hover:border-current"
        >
          Plantillas de entreno
        </Link>
        <Link href="/panel/importar" className="-mb-px border-b-2 border-transparent pb-2 hover:border-current">
          Importar Excel
        </Link>
        <Link
          href="/panel/biblioteca/alimentos"
          className="-mb-px border-b-2 border-transparent pb-2 hover:border-current"
        >
          Alimentos
        </Link>
        <Link href="/panel/biblioteca/menus" className="-mb-px border-b-2 border-transparent pb-2 hover:border-current">
          Menús
        </Link>
        <Link
          href="/panel/biblioteca/suplementos"
          className="-mb-px border-b-2 border-transparent pb-2 hover:border-current"
        >
          Suplementos
        </Link>
      </nav>
      {children}
    </div>
  );
}
