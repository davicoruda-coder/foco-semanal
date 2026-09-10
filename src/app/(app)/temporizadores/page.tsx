import { redirect } from "next/navigation";

/** Temporizadores legados — alarme e sessão ficam em Ajustes. */
export default function TemporizadoresPage() {
  redirect("/ajustes");
}
