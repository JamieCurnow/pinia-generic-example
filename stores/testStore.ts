import { defineStore } from "pinia";
import { defineCacheStore } from "./utils/defineCacheStore";

/** any type, or omit it in js */
interface Org {
  name: string;
  id: number;
}

/**
 * This is a super generic example of a store that fetches data from an API
 * and caches it for a certain amount of time.
 */
export const useTestStore = defineStore("testStore", () => {
  // go look in utils/defineCacheStore.ts to see what this does - it's logic could be
  // moved into a store, or this can be reused in other stores if suitable
  return defineCacheStore<Org>({
    allItemsCacheMs: 1000 * 60,
    singleItemCacheMs: 1000 * 60,
    getAllItems: api.orgs.get,
    getItem: (id) => api.org(id as number).get(),
    updateItem: (id, org) => api.org(id as number).update(org),
    getUid: (org) => org.id,
    createItem: (org) => api.orgs.create(org),
  });
});

/**
 * This is a fake API that simulates fetching data from a server.
 */
const api = {
  orgs: {
    async get() {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return [...db.orgs];
    },
    async create(org: Org) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      db.orgs.push(org);
      return { ...org };
    },
  },
  org: (id: number) => ({
    async get() {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const org = db.orgs.find((org) => org.id === id);
      return org ? { ...org } : undefined;
    },
    async update(org: Partial<Org>) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const existingOrg = db.orgs.find((x) => x.id === id);
      if (!existingOrg) {
        throw new Error("Org not found");
      }
      const newOrg = { ...existingOrg, ...org };
      const existingOrgIndex = db.orgs.findIndex((x) => x.id === id);
      db.orgs.splice(existingOrgIndex, 1, newOrg);
      return { ...newOrg };
    },
  }),
};

/**
 * This is a fake database that simulates a database.
 */
const db = {
  orgs: [
    {
      name: "Org 1",
      id: 1,
    },
    {
      name: "Org 2",
      id: 2,
    },
    {
      name: "Org 3",
      id: 3,
    },
    {
      name: "Org 4",
      id: 4,
    },
  ],
};
