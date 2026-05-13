import { computed, ref } from 'vue';

function cloneState<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

function statesEqual<T>(left: T, right: T): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

export function useHistory<T>(initialState: T, limit = 50) {
    const past = ref<T[]>([]);
    const present = ref<T>(cloneState(initialState));
    const future = ref<T[]>([]);

    function commit(nextState: T) {
        commitFrom(present.value, nextState);
    }

    function commitFrom(previousState: T, nextState: T) {
        if (statesEqual(previousState, nextState)) {
            present.value = cloneState(nextState);
            future.value = [];
            return;
        }

        const nextPast = [...(past.value as T[]).slice(-limit + 1), cloneState(previousState)];
        past.value = nextPast as typeof past.value;
        present.value = cloneState(nextState);
        future.value = [];
    }

    function replacePresent(nextState: T) {
        present.value = cloneState(nextState);
    }

    function replacePresentShallow(nextState: T) {
        present.value = nextState;
    }

    function mutatePresent(mutator: (state: T) => void) {
        mutator(present.value);
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
        commitFrom,
        replacePresent,
        replacePresentShallow,
        mutatePresent,
        undo,
        redo,
    };
}
