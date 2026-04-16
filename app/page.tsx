import { redirect } from "next/navigation"

export default function RootPage() {
  // Redirect to login page - system starts at login screen
  redirect("/login")
}
