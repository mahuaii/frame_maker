import { computed, ref } from 'vue';

function cloneState<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

export function useHistory<T>(initialState: T, limit = 50) {
    const past = ref<T[]>([]);
    const present = ref<T>(cloneState(initialState));
    const future = ref<T[]>([]);

    function commit(nextState: T) {
        past.value = [...past.value.slice(-limit + 1), cloneState(present.value)];
        present.value = cloneState(nextState);
        future.value = [];
    }

    function replacePresent(nextState: T) {
        present.value = cloneState(nextState);
    }

    function undo() {
        const previous = past.value[past.value.length - 1];
        if (!previous) return;

        future.value = [cloneState(present.value), ...future.value];
        present.value = previous;
        past.value = past.value.slice(0, -1);
    }

    function redo() {
        const next = future.value[0];
        if (!next) return;

        past.value = [...past.value, cloneState(present.value)];
        present.value = next;
        future.value = future.value.slice(1);
    }

    return {
        past,
        present,
        future,
        canUndo: computed(() => past.value.length > 0),
        canRedo: computed(() => future.value.length > 0),
        commit,
        replacePresent,
        undo,
        redo,
    };
}
