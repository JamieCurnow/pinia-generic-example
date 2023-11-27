<template>
  <div>
    <div>Hello org {{ id }}</div>
    <div v-if="getting">Loading org...</div>
    <div v-if="item.value">
      <div v-if="!editing">
        <div>{{ item.value.name }}</div>
        <button @click="toggleEdit()">Edit</button>
      </div>
      <div v-if="editing">
        <div>
          <input v-model="item.value.name" />
        </div>
        <div>
          <button @click="save()">{{ saving ? "Saving" : "Save" }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTestStore } from "~/stores/testStore";

const id = useRoute().params.id as string;

const { itemHelpers } = useTestStore();

const { item, getting, get, saving, saveItem } = itemHelpers(parseInt(id));

onMounted(async () => {
  await get(); // will be cached
});

// edit
const editing = ref(false);
const toggleEdit = () => {
  editing.value = !editing.value;
};

// update
const save = async () => {
  await saveItem();
  toggleEdit();
};
</script>
