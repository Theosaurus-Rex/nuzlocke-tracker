import type { RawIndex, RawMove, RawPokemon } from "@/game/pokeapi/map";

const API = "https://pokeapi.co/api/v2";

function ref(kind: string, id: number, name: string) {
  return { name, url: `${API}/${kind}/${String(id)}/` };
}

function slot(n: number, type: string) {
  return { slot: n, type: { name: type, url: `${API}/type/0/` } };
}

export const speciesIndexFixture: RawIndex = {
  results: [
    ref("pokemon", 35, "clefairy"),
    ref("pokemon", 1, "bulbasaur"),
    ref("pokemon", 16, "pidgey"),
    ref("pokemon", 74, "geodude"),
    ref("pokemon", 130, "gyarados"),
    ref("pokemon", 778, "mimikyu-disguised"),
    ref("pokemon", 10033, "venusaur-mega"),
  ],
};

export const moveIndexFixture: RawIndex = {
  results: [
    ref("move", 33, "tackle"),
    ref("move", 22, "vine-whip"),
    ref("move", 450, "bug-bite"),
    ref("move", 204, "charm"),
  ],
};

export const pokemonFixtures: Record<string, RawPokemon> = {
  clefairy: {
    id: 35,
    name: "clefairy",
    types: [slot(1, "fairy")],
    past_types: [{ generation: ref("generation", 5, "generation-v"), types: [slot(1, "normal")] }],
  },
  bulbasaur: {
    id: 1,
    name: "bulbasaur",
    types: [slot(2, "poison"), slot(1, "grass")],
    past_types: [],
  },
  pidgey: { id: 16, name: "pidgey", types: [slot(1, "normal"), slot(2, "flying")], past_types: [] },
  geodude: { id: 74, name: "geodude", types: [slot(1, "rock"), slot(2, "ground")], past_types: [] },
  gyarados: {
    id: 130,
    name: "gyarados",
    types: [slot(1, "water"), slot(2, "flying")],
    past_types: [],
  },
  chikorita: { id: 152, name: "chikorita", types: [slot(1, "grass")], past_types: [] },
  bellsprout: {
    id: 69,
    name: "bellsprout",
    types: [slot(1, "grass"), slot(2, "poison")],
    past_types: [],
  },
};

export const moveFixtures: Record<string, RawMove> = {
  "vine-whip": {
    id: 22,
    name: "vine-whip",
    type: { name: "grass", url: `${API}/type/12/` },
    power: 45,
    accuracy: 100,
    pp: 25,
    past_values: [
      {
        power: 35,
        accuracy: null,
        pp: 15,
        type: null,
        version_group: ref("version-group", 15, "x-y"),
      },
      {
        power: null,
        accuracy: null,
        pp: 10,
        type: null,
        version_group: ref("version-group", 8, "diamond-pearl"),
      },
    ],
  },
  tackle: {
    id: 33,
    name: "tackle",
    type: { name: "normal", url: `${API}/type/1/` },
    power: 40,
    accuracy: 100,
    pp: 35,
    past_values: [
      {
        power: 50,
        accuracy: null,
        pp: null,
        type: null,
        version_group: ref("version-group", 17, "sun-moon"),
      },
      {
        power: 35,
        accuracy: 95,
        pp: null,
        type: null,
        version_group: ref("version-group", 11, "black-white"),
      },
    ],
  },
  "bug-bite": {
    id: 450,
    name: "bug-bite",
    type: { name: "bug", url: `${API}/type/7/` },
    power: 60,
    accuracy: 100,
    pp: 20,
    past_values: [],
  },
  charm: {
    id: 204,
    name: "charm",
    type: { name: "fairy", url: `${API}/type/18/` },
    power: null,
    accuracy: 100,
    pp: 20,
    past_values: [
      {
        power: null,
        accuracy: null,
        pp: null,
        type: { name: "normal", url: `${API}/type/1/` },
        version_group: ref("version-group", 15, "x-y"),
      },
    ],
  },
};
