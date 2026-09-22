import Link from "next/link";

export type RecipeCardData = {
  id: string;
  name: string;
  original_name?: string | null;
  cuisine_tags?: string[] | null;
  save_count?: number | null;
  users?: { name: string | null } | { name: string | null }[] | null;
  owner_id?: string;
};

const CUISINE_STYLES: Record<string, { emoji: string; bg: string }> = {
  // Primary classifier tags
  meat:        { emoji: "🥩", bg: "#8a3a2a" },
  poultry:     { emoji: "🍗", bg: "#c8802a" },
  seafood:     { emoji: "🐟", bg: "#3a7a9a" },
  vegetarian:  { emoji: "🥗", bg: "#3a8a4a" },
  vegan:       { emoji: "🌱", bg: "#4a9a4a" },
  dessert:     { emoji: "🍰", bg: "#b85a8a" },
  baking:      { emoji: "🍞", bg: "#c89050" },
  breakfast:   { emoji: "🍳", bg: "#c8a040" },
  snack:       { emoji: "🥨", bg: "#a8823a" },
  sauce:       { emoji: "🫙", bg: "#7a6a3a" },
  // Cuisine / style tags
  italian:     { emoji: "🍝", bg: "#c8602a" },
  pasta:       { emoji: "🍝", bg: "#c8602a" },
  mexican:     { emoji: "🌮", bg: "#b8482e" },
  indian:      { emoji: "🍛", bg: "#a8512a" },
  chinese:     { emoji: "🥡", bg: "#b8362e" },
  japanese:    { emoji: "🍣", bg: "#4a6b5a" },
  thai:        { emoji: "🍜", bg: "#4a7a4a" },
  french:      { emoji: "🥐", bg: "#5a5a8a" },
  mediterranean: { emoji: "🥙", bg: "#3a7a7a" },
  american:    { emoji: "🍔", bg: "#c8602a" },
  asian:       { emoji: "🍜", bg: "#4a7a6a" },
  beef:        { emoji: "🥩", bg: "#8a3a2a" },
  pork:        { emoji: "🥩", bg: "#9a4a3a" },
  chicken:     { emoji: "🍗", bg: "#c8802a" },
  fish:        { emoji: "🐟", bg: "#3a7a9a" },
  salmon:      { emoji: "🐟", bg: "#3a7a9a" },
  soup:        { emoji: "🍲", bg: "#8a6a2a" },
  salad:       { emoji: "🥗", bg: "#4a8a5a" },
  rice:        { emoji: "🍚", bg: "#7a8a4a" },
  curry:       { emoji: "🍛", bg: "#a8512a" },
  egg:         { emoji: "🍳", bg: "#c8a040" },
  eggs:        { emoji: "🍳", bg: "#c8a040" },
};

function styleFor(cuisineTags: string[] | null | undefined) {
  if (cuisineTags) {
    for (const tag of cuisineTags) {
      const key = tag.toLowerCase();
      if (CUISINE_STYLES[key]) return CUISINE_STYLES[key];
    }
  }
  return { emoji: "🍽️", bg: "#c8860a" };
}

function ownerName(users: RecipeCardData["users"]) {
  if (!users) return null;
  return Array.isArray(users) ? users[0]?.name ?? null : users.name ?? null;
}

export default function RecipeCard({
  recipe,
  mutualFriends,
}: {
  recipe: RecipeCardData;
  mutualFriends?: number;
}) {
  const { emoji, bg } = styleFor(recipe.cuisine_tags);
  const owner = ownerName(recipe.users);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="flex items-center gap-3 py-2.5 border-b"
      style={{ borderColor: "var(--mk-border)" }}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: bg }}>
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: "#1a1a1a" }}>
          {recipe.name}
        </p>
        {recipe.original_name && (
          <p className="text-[10px] truncate" style={{ color: "#9a7a3a", fontStyle: "italic" }}>
            {recipe.original_name}
          </p>
        )}
        {owner && (
          <p className="text-[10px] text-neutral-400 truncate">by {owner}</p>
        )}
      </div>
      {mutualFriends !== undefined && mutualFriends > 0 && (
        <span className="text-[10px] text-neutral-400 flex-shrink-0">👥 {mutualFriends}</span>
      )}
      <span className="text-[10px] text-neutral-400 flex-shrink-0">♥ {recipe.save_count ?? 0}</span>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#ccc"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <path d="M4 2l4 4-4 4" />
      </svg>
    </Link>
  );
}
