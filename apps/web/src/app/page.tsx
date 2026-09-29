import { redirect } from "next/navigation";

// The (app) route group's AuthGate sends signed-out visitors on to /login.
export default function Home() {
  redirect("/dashboard");
}
