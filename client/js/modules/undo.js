function cloneState(state) {
    return JSON.parse(JSON.stringify(state || {}));
}

export function createUndoManager(limit = 30) {
    const stack = [];

    return {
        clear() {
            stack.length = 0;
        },
        canUndo() {
            return stack.length > 0;
        },
        push(entry) {
            stack.push({
                ...entry,
                before: cloneState(entry.before),
                after: cloneState(entry.after),
                time: Date.now()
            });

            if (stack.length > limit) {
                stack.shift();
            }
        },
        pop() {
            return stack.pop() || null;
        },
        getEntries() {
            return stack.slice();
        }
    };
}
