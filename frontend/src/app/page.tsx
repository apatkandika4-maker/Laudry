import { redirect } from "next/navigation";

/** Halaman awal langsung ke layar kasir; yang belum masuk diarahkan ke /login. */
export default function Home() {
  redirect("/pos");
}
