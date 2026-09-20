import type { LocalizedText, RecipeRow } from '../db/schema.types';
import { ingredientId } from './ingredients.seed';

/**
 * The authored Indonesian menu: twenty dishes, each with an English and an
 * Indonesian description. Ingredient quantities are per serving, in the
 * ingredient's own unit (see ingredients.seed.ts).
 *
 * No photographs are shipped: hotlinking third-party food photos is unreliable
 * and often unlicensed, so `imageUrl` is null and the UI draws a typographic
 * placeholder. An admin can set any image URL in the recipe form.
 *
 * Six carry a discount so `discountedRecipes` has content; six are featured.
 */
interface Dish {
  key: string;
  name: string;
  priceIdr: number;
  discountPercent?: number;
  featured?: boolean;
  description: LocalizedText;
  needs: Record<string, number>;
}

const DISHES: readonly Dish[] = [
  {
    key: 'nasi_goreng',
    name: 'Nasi Goreng Kampung',
    priceIdr: 28_000,
    featured: true,
    description: {
      en: 'Wok-fried rice with shallot, garlic and bird’s-eye chilli, finished with sweet soy, a fried egg and crisp shallots.',
      id: 'Nasi digoreng dengan bawang merah, bawang putih dan cabai rawit, dilengkapi kecap manis, telur mata sapi dan bawang goreng.',
    },
    needs: {
      beras: 120,
      telur: 1,
      bawang_merah: 20,
      bawang_putih: 10,
      cabai_rawit: 10,
      kecap_manis: 15,
      minyak: 20,
      bawang_goreng: 5,
      kerupuk: 2,
    },
  },
  {
    key: 'rendang',
    name: 'Rendang Daging',
    priceIdr: 52_000,
    discountPercent: 20,
    featured: true,
    description: {
      en: 'Beef slow-cooked for hours in coconut milk and spices until the sauce darkens and clings to the meat.',
      id: 'Daging sapi dimasak berjam-jam dalam santan dan rempah sampai bumbunya menghitam dan meresap.',
    },
    needs: {
      daging_sapi: 180,
      santan: 200,
      cabai_merah: 30,
      bawang_merah: 30,
      jahe: 10,
      lengkuas: 10,
      serai: 1,
      daun_jeruk: 2,
      kemiri: 10,
      beras: 100,
    },
  },
  {
    key: 'soto_betawi',
    name: 'Soto Betawi',
    priceIdr: 36_000,
    description: {
      en: 'Jakarta beef soup in a rich, spiced coconut-milk broth with potato and tomato.',
      id: 'Soto sapi khas Betawi berkuah santan gurih berempah dengan kentang dan tomat.',
    },
    needs: {
      daging_sapi: 120,
      santan: 150,
      bawang_merah: 20,
      bawang_putih: 10,
      jahe: 10,
      serai: 1,
      daun_salam: 1,
      kentang: 50,
      tomat: 30,
    },
  },
  {
    key: 'rawon',
    name: 'Rawon Surabaya',
    priceIdr: 38_000,
    description: {
      en: 'East Javanese beef soup, black from the kluwek nut, served with bean sprouts.',
      id: 'Sup daging sapi khas Jawa Timur yang berwarna hitam dari kluwek, disajikan dengan tauge.',
    },
    needs: {
      daging_sapi: 150,
      kluwek: 3,
      bawang_merah: 20,
      bawang_putih: 10,
      serai: 1,
      tauge: 30,
      beras: 100,
    },
  },
  {
    key: 'sate_ayam',
    name: 'Sate Ayam Madura',
    priceIdr: 32_000,
    discountPercent: 10,
    featured: true,
    description: {
      en: 'Chicken skewers grilled over charcoal with peanut sauce, sweet soy and shallot, served with lontong.',
      id: 'Sate ayam bakar arang dengan bumbu kacang, kecap manis dan bawang merah, disajikan dengan lontong.',
    },
    needs: {
      ayam: 150,
      kacang_tanah: 40,
      kecap_manis: 20,
      bawang_merah: 15,
      cabai_rawit: 5,
      lontong: 1,
    },
  },
  {
    key: 'gado_gado',
    name: 'Gado-Gado',
    priceIdr: 26_000,
    featured: true,
    description: {
      en: 'Blanched vegetables, tofu, tempeh and egg under a warm palm-sugar peanut sauce, with crackers.',
      id: 'Sayuran rebus, tahu, tempe dan telur dengan bumbu kacang gula aren yang hangat, dan kerupuk.',
    },
    needs: {
      kol: 60,
      tauge: 40,
      kacang_panjang: 40,
      kentang: 60,
      telur: 1,
      tahu: 1,
      tempe: 1,
      kacang_tanah: 50,
      gula_aren: 10,
      cabai_rawit: 5,
      kerupuk: 2,
    },
  },
  {
    key: 'nasi_uduk',
    name: 'Nasi Uduk',
    priceIdr: 24_000,
    description: {
      en: 'Rice steamed in coconut milk with lemongrass and bay leaf, with egg, tempeh and crackers.',
      id: 'Nasi gurih dengan santan, serai dan daun salam, dengan telur, tempe dan kerupuk.',
    },
    needs: {
      beras: 130,
      santan: 80,
      serai: 1,
      daun_salam: 1,
      telur: 1,
      tempe: 1,
      bawang_goreng: 5,
      kerupuk: 1,
    },
  },
  {
    key: 'mie_goreng_jawa',
    name: 'Mie Goreng Jawa',
    priceIdr: 27_000,
    discountPercent: 15,
    description: {
      en: 'Egg noodles stir-fried with chicken, cabbage and sweet soy, Javanese style.',
      id: 'Mi telur goreng dengan ayam, kol dan kecap manis ala Jawa.',
    },
    needs: {
      mie_telur: 130,
      telur: 1,
      kol: 40,
      bawang_merah: 15,
      bawang_putih: 10,
      kecap_manis: 20,
      ayam: 50,
      cabai_rawit: 5,
      minyak: 20,
    },
  },
  {
    key: 'ikan_bakar',
    name: 'Ikan Bakar Jimbaran',
    priceIdr: 58_000,
    description: {
      en: 'Snapper grilled and glazed with chilli, shallot and sweet soy, with a fresh tomato sambal.',
      id: 'Ikan kakap bakar dengan olesan cabai, bawang merah dan kecap manis, dengan sambal tomat segar.',
    },
    needs: {
      ikan_kakap: 250,
      cabai_merah: 20,
      bawang_merah: 20,
      kecap_manis: 15,
      jahe: 5,
      terasi: 5,
      tomat: 30,
      beras: 100,
    },
  },
  {
    key: 'pecel_lele',
    name: 'Pecel Lele',
    priceIdr: 23_000,
    description: {
      en: 'Crisp fried catfish with tomato sambal, cucumber and rice.',
      id: 'Lele goreng renyah dengan sambal tomat, timun dan nasi.',
    },
    needs: {
      lele: 1,
      cabai_rawit: 15,
      tomat: 30,
      terasi: 5,
      bawang_merah: 10,
      timun: 30,
      minyak: 30,
      beras: 120,
    },
  },
  {
    key: 'gudeg',
    name: 'Gudeg Yogya',
    priceIdr: 30_000,
    featured: true,
    description: {
      en: 'Young jackfruit stewed for hours in coconut milk and palm sugar, Yogyakarta style, with chicken and egg.',
      id: 'Nangka muda dimasak lama dalam santan dan gula aren ala Yogyakarta, dengan ayam dan telur.',
    },
    needs: {
      nangka_muda: 200,
      santan: 150,
      gula_aren: 25,
      bawang_merah: 15,
      bawang_putih: 10,
      daun_salam: 2,
      telur: 1,
      ayam: 80,
      beras: 100,
    },
  },
  {
    key: 'soto_ayam',
    name: 'Soto Ayam Lamongan',
    priceIdr: 25_000,
    description: {
      en: 'Clear turmeric chicken soup from Lamongan with bean sprouts, egg and lontong.',
      id: 'Soto ayam kuah kuning bening khas Lamongan dengan tauge, telur dan lontong.',
    },
    needs: {
      ayam: 120,
      tauge: 30,
      telur: 1,
      jahe: 10,
      kunyit: 5,
      serai: 1,
      bawang_goreng: 5,
      kerupuk: 1,
      lontong: 1,
    },
  },
  {
    key: 'lontong_sayur',
    name: 'Lontong Sayur',
    priceIdr: 22_000,
    discountPercent: 10,
    description: {
      en: 'Rice cakes in a coconut-milk vegetable curry with jackfruit and long beans.',
      id: 'Lontong dengan kuah sayur santan, nangka muda dan kacang panjang.',
    },
    needs: {
      lontong: 2,
      santan: 120,
      nangka_muda: 80,
      kacang_panjang: 40,
      cabai_merah: 10,
      bawang_merah: 15,
      telur: 1,
      kerupuk: 1,
    },
  },
  {
    key: 'pempek',
    name: 'Pempek Palembang',
    priceIdr: 30_000,
    description: {
      en: 'Palembang fish cakes served with a sweet, sour and spicy cuko sauce.',
      id: 'Pempek ikan khas Palembang dengan kuah cuko yang manis, asam dan pedas.',
    },
    needs: {
      ikan_kakap: 100,
      tepung_tapioka: 120,
      telur: 1,
      gula_aren: 20,
      asam_jawa: 10,
      cabai_rawit: 10,
      bawang_putih: 5,
    },
  },
  {
    key: 'ayam_penyet',
    name: 'Ayam Penyet',
    priceIdr: 34_000,
    discountPercent: 12,
    description: {
      en: 'Fried chicken pressed flat and buried in fiery sambal, with tempeh, cucumber and rice.',
      id: 'Ayam goreng yang dipenyet dengan sambal pedas, disajikan dengan tempe, timun dan nasi.',
    },
    needs: {
      ayam: 200,
      cabai_rawit: 20,
      tomat: 30,
      bawang_putih: 10,
      terasi: 5,
      timun: 30,
      minyak: 40,
      beras: 120,
      tempe: 1,
    },
  },
  {
    key: 'sop_buntut',
    name: 'Sop Buntut',
    priceIdr: 68_000,
    description: {
      en: 'Oxtail soup simmered until tender, with potato and tomato, served with rice.',
      id: 'Sup buntut yang direbus sampai empuk, dengan kentang dan tomat, disajikan dengan nasi.',
    },
    needs: {
      buntut: 250,
      kentang: 60,
      tomat: 30,
      bawang_putih: 10,
      jahe: 5,
      daun_salam: 1,
      beras: 100,
    },
  },
  {
    key: 'bakso',
    name: 'Bakso',
    priceIdr: 20_000,
    description: {
      en: 'Beef meatballs in a clear, savoury broth with egg noodles, bean sprouts and fried shallot.',
      id: 'Bakso sapi dalam kuah kaldu bening dengan mi telur, tauge dan bawang goreng.',
    },
    needs: { bakso: 6, mie_telur: 60, tauge: 30, bawang_goreng: 5, kerupuk: 1 },
  },
  {
    key: 'es_cendol',
    name: 'Es Cendol',
    priceIdr: 18_000,
    featured: true,
    description: {
      en: 'Pandan rice-flour jelly in coconut milk and palm-sugar syrup over shaved ice.',
      id: 'Cendol pandan dalam santan dan sirup gula aren di atas es serut.',
    },
    needs: { tepung_beras: 40, pandan: 2, santan: 100, gula_aren: 30, es_batu: 150 },
  },
  {
    key: 'klepon',
    name: 'Klepon',
    priceIdr: 15_000,
    description: {
      en: 'Pandan rice-flour balls filled with liquid palm sugar.',
      id: 'Bola-bola tepung beras pandan berisi gula aren cair.',
    },
    needs: { tepung_beras: 60, pandan: 2, gula_aren: 25, santan: 30 },
  },
  {
    key: 'pisang_goreng',
    name: 'Pisang Goreng',
    priceIdr: 16_000,
    discountPercent: 25,
    description: {
      en: 'Bananas fried in a crisp rice-flour batter and dusted with sugar.',
      id: 'Pisang goreng dengan balutan tepung beras yang renyah dan taburan gula.',
    },
    needs: { pisang: 3, tepung_beras: 40, minyak: 60, gula_pasir: 10 },
  },
];

export const recipeId = (key: string): string => `rec_${key}`;

/** The authored food menu as rows. `createdAt` is supplied by the caller's clock. */
export function buildFoodSeed(createdAt: string): RecipeRow[] {
  return DISHES.map((dish) => ({
    id: recipeId(dish.key),
    name: dish.name,
    description: dish.description,
    imageUrl: null,
    category: 'FOOD',
    source: 'SEED',
    priceIdr: dish.priceIdr,
    discountPercent: dish.discountPercent ?? 0,
    status: 'PUBLISHED',
    isFeatured: dish.featured ?? false,
    ingredients: Object.entries(dish.needs).map(([key, quantity]) => ({
      ingredientId: ingredientId(key),
      quantity,
    })),
    createdAt,
    deletedAt: null,
  }));
}
