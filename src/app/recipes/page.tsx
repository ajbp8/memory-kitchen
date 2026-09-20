import { redirect } from "next/navigation";

// Temporary redirect while we rename /discover → /recipes.
// The BottomNav links here; this keeps everything working without
// rewriting the discover page right now.
export default function RecipesPage() {
  redirect("/discover");
}
