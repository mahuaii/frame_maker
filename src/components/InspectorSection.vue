<script setup lang="ts">
import { computed, useSlots } from 'vue';

withDefaults(defineProps<{
    title?: string;
    sectionClass?: string;
    contentClass?: string;
}>(), {
    title: '',
    sectionClass: undefined,
    contentClass: undefined,
});

const slots = useSlots();
const hasHeader = computed(() => Boolean(slots.actions || slots.title));
</script>

<template>
    <section class="inspector-section" :class="sectionClass">
        <header v-if="title || hasHeader" class="inspector-section-header">
            <h2 class="inspector-section-title">
                <slot name="title">{{ title }}</slot>
            </h2>
            <slot name="actions"></slot>
        </header>
        <div class="inspector-section-content" :class="contentClass">
            <slot></slot>
        </div>
    </section>
</template>
