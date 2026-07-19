import { redirect } from "next/navigation";

// Middleware mengarahkan user login sesuai role; sisanya ke /login.
export default function Home() {
  redirect("/login");
}
