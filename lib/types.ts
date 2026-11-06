export type MenuCat = {
  id: string;
  name: string;
};

export type MenuProduct = {
  id: string;
  category_id: string;
  name: string;
  price: number;
  sold_count: number;
  is_available: boolean;
  image_url: string | null;
  emoji: string | null;
  tint: string | null;
};
