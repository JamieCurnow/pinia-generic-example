interface DefineCacheStoreOpts<T> {
  /** The amount of time to cache fetches to get all items in the store */
  allItemsCacheMs: number;
  /** The amount of time to cache fetches to get a single item in the store */
  singleItemCacheMs: number;
  /**
   * A function that returns the uid of the item.
   * This is used to determine if an item is already in the cache.
   * @example
   * ```ts
   * getUid(org) => org.id
   * ```
   */
  getUid: (item: T) => string | number;
  /* A function that fetches all items from the API */
  getAllItems: () => Promise<T[]>;
  /* A function that fetches a single item from the API */
  getItem: (id: string | number) => Promise<T | undefined>;
  /* A function that updates a single item using the API */
  updateItem: (id: string | number, item: Partial<T>) => Promise<T>;
  /** A function that creates a single item using the API */
  createItem: (item: T) => Promise<T>;
}

/** Just wraps the item and tracks the last fetched time for the cache */
interface StoreItem<T> {
  item: T;
  lastFetched: Date;
}

/** Sets up a store with a bunch of reactive values, cache, and crud methods */
export const defineCacheStore = <T>(opts: DefineCacheStoreOpts<T>) => {
  const { allItemsCacheMs, singleItemCacheMs, getUid } = opts;

  /** This is where all the items will be stored */
  const allItems = ref([]) as Ref<StoreItem<T>[]>;

  /** This is the time that all items were last fetched */
  const lastFetchedAllItems = ref<Date | undefined>(undefined);

  /**
   * This helper function adds or replaces an item in the store
   * and sets the last fetched timestamp
   */
  const updateStoreItem = (newItem: T) => {
    // make the store item with the last fetched timestamp
    const storeItem = {
      item: { ...newItem },
      lastFetched: new Date(),
    };

    // find the index of the item in the store
    const index = allItems.value.findIndex(
      ({ item }) => getUid(item) === getUid(newItem)
    );

    // if it's not in the store, add it
    if (index === -1) {
      // add the item to the store
      allItems.value.push(storeItem);
    } else {
      // otherwise replace the item in the store
      allItems.value.splice(index, 1, storeItem);
    }
  };

  /** This is a reactive boolean that is true when we're fetching all items */
  const gettingAllItems = ref(false);

  /**
   * This is a function that fetches all items from the API and
   * adds them to the store, it will use the cache if it's not expired
   * rather than fetching from the API
   */
  const getAllItems = async () => {
    // set loading to true
    gettingAllItems.value = true;

    // boot out if we have a valid cache
    const lastFetched = lastFetchedAllItems.value;
    if (lastFetched && !cacheHasExpired(lastFetched, allItemsCacheMs)) {
      gettingAllItems.value = false;
      // return the items from the cache
      return allItems.value;
    }

    // otherwise fetch the orgs
    try {
      // fetch the orgs
      const items = await opts.getAllItems();

      // update the store
      allItems.value = items.map((item) => {
        return {
          item,
          lastFetched: new Date(),
        };
      });

      // set the last fetched time
      lastFetchedAllItems.value = new Date();

      // set loading to false
      gettingAllItems.value = false;

      // return the items
      return allItems.value;
    } catch (e) {
      console.error(e);
      gettingAllItems.value = false;
    }
  };

  /**
   * This is a function that fetches a single item from the API and
   * adds it to the store, it will use the cache if it's not expired
   * rather than fetching from the API
   */
  const getSingleItem = async (id: string | number) => {
    // find the item in the cache
    const existingItem = allItems.value.find(({ item }) => getUid(item) === id);

    // boot out if we have a valid cache
    if (
      existingItem &&
      !cacheHasExpired(existingItem.lastFetched, singleItemCacheMs)
    ) {
      // return the item from the cache
      return { ...existingItem.item };
    }

    // otherwise fetch the item
    try {
      // fetch the item
      const freshItem = await opts.getItem(id);
      if (!freshItem) throw new Error("Item not found");

      // update the org in the cache
      updateStoreItem(freshItem);

      // return the item
      return freshItem;
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * This is a function that updates a single item in the API and
   * updates it in the store
   */
  const updateItem = async (id: string | number, item: T) => {
    try {
      // update the item in the API
      const updatedItem = await opts.updateItem(id, item);
      // update the item in the store
      updateStoreItem(updatedItem);
      // return the item
      return updatedItem;
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * This is a function that creates a single item in the API and
   * adds it to the store
   */
  const createItem = async (item: T) => {
    try {
      // create the item in the API
      const createdItem = await opts.createItem(item);
      // update the item in the store
      updateStoreItem(createdItem);
      // return the item
      return createdItem;
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * This is a helper function that returns a bunch of reactive values
   * and functions for a single item in the store
   */
  const itemHelpers = (id: string | number) => {
    // make a reactive item it's reactive so that we can bind to a
    // single value, but we need somewhere to store the item when we
    // fetch it from the API so it has a 'value' property.
    const item = reactive({
      value: undefined,
    }) as { value: T | undefined };

    // this is a reactive boolean that is true when we're fetching the item
    const getting = ref(true);

    // this is a function that fetches the item from the API
    const get = async () => {
      getting.value = true;
      item.value = await getSingleItem(id);
      getting.value = false;
    };

    // this is a reactive boolean that is true when we're saving the item
    const saving = ref(false);

    // this is a function that saves the item to the API
    const saveItem = async () => {
      if (!item.value) return;
      saving.value = true;
      const id = getUid(item.value);
      await updateItem(id, item.value);
      saving.value = false;
    };

    return {
      item,
      getting,
      get,
      saving,
      saveItem,
    };
  };

  return {
    allItems,
    gettingAllItems,
    getAllItems,
    itemHelpers,
    lastFetchedAllItems,
    getSingleItem,
    updateItem,
    createItem,
  };
};

/** Helper function to check if the cache has expired */
const cacheHasExpired = (lastFetched: Date, cacheMs: number) => {
  return new Date().getTime() - lastFetched.getTime() > cacheMs;
};
