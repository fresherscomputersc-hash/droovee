import { redirect } from "next/navigation";

/** Kept as a redirect for old links: /book is now the single booking page. */
export default function UserBookRedirect() {
  redirect("/book");
}
