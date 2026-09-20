// The reference, loaded as one small chunk: it is searched as a whole, so it is fetched as a whole.
import RECIPE_INDEX_JSON from '../generated/recipe-index.json';
import RECIPE_OUTPUT_JSON from '../generated/recipes.json';
import type { GeneratedRecipes, Recipe, RecipeEntry } from '../recipeSchema.ts';

const INDEX = RECIPE_INDEX_JSON as Recipe[];
const OUTPUT = RECIPE_OUTPUT_JSON as GeneratedRecipes;

/** Every entry with the output the verifier recorded for it. */
export const RECIPES: RecipeEntry[] = INDEX.map((r) => ({ ...r, stdout: OUTPUT[r.id]?.stdout ?? '' }));
