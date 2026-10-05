/**
 * Drag to rearrange (a Svelte action on the list's container). Items carry `data-drag-id`.
 *  - Mouse: press and move a few pixels.
 *  - Touch: press and hold for a moment (a quick swipe still scrolls), then move.
 * While dragging, `move(id, index)` is called as the item passes the others (the caller reorders the list,
 * Svelte moves the elements); `done()` when it's let go. A click right after a drag is swallowed, so the
 * item doesn't open.
 */
export interface DragSortOptions {
    move: (id: string, index: number) => void;
    done: () => void;
    start?: () => void;
}

const MOUSE_SLOP = 6;
const TOUCH_HOLD_MS = 350;
const TOUCH_SLOP = 8;

export function dragSort(node: HTMLElement, options: DragSortOptions) {
    let opts = options;
    let pointerId: number | null = null;
    let item: HTMLElement | null = null;
    let id = '';
    let startX = 0;
    let startY = 0;
    let grabX = 0;
    let grabY = 0;
    let dragging = false;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let swallowUntil = 0;
    /** where the items sat when the drag began: the slots (measured once, so the others sliding along don't count) */
    let slots: DOMRect[] = [];

    const items = (): HTMLElement[] => Array.from(node.querySelectorAll<HTMLElement>('[data-drag-id]'));

    function place(x: number, y: number) {
        if (!item) {return;}
        item.style.transform = '';
        const r = item.getBoundingClientRect();
        item.style.transform = `translate(${x - grabX - r.left}px, ${y - grabY - r.top}px) scale(1.03)`;
    }
    function begin(x: number, y: number) {
        if (!item) {return;}
        dragging = true;
        const r = item.getBoundingClientRect();
        grabX = startX - r.left;
        grabY = startY - r.top;
        slots = items().map(el => el.getBoundingClientRect());
        item.classList.add('dragging');
        node.classList.add('sorting');
        try {node.setPointerCapture(pointerId as number);} catch { /* not capturable */ }
        opts.start?.();
        place(x, y);
    }
    function over(x: number, y: number) {
        const slot = slots.findIndex(r => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
        if (slot >= 0) {opts.move(id, slot);}
    }
    function reset() {
        clearTimeout(holdTimer);
        if (item) {
            item.classList.remove('dragging');
            item.style.transform = '';
        }
        node.classList.remove('sorting');
        if (pointerId !== null) {try {node.releasePointerCapture(pointerId);} catch { /* released */ }}
        pointerId = null;
        item = null;
        dragging = false;
    }

    function down(e: PointerEvent) {
        if (pointerId !== null || (e.pointerType === 'mouse' && e.button !== 0)) {return;}
        const el = (e.target as HTMLElement).closest<HTMLElement>('[data-drag-id]');
        if (!el || !node.contains(el)) {return;}
        pointerId = e.pointerId;
        item = el;
        id = el.dataset.dragId || '';
        startX = e.clientX;
        startY = e.clientY;
        if (e.pointerType !== 'mouse') {holdTimer = setTimeout(() => begin(startX, startY), TOUCH_HOLD_MS);}
    }
    function moveHandler(e: PointerEvent) {
        if (e.pointerId !== pointerId || !item) {return;}
        const far = Math.hypot(e.clientX - startX, e.clientY - startY);
        if (!dragging) {
            if (e.pointerType === 'mouse') {
                if (far > MOUSE_SLOP) {begin(e.clientX, e.clientY);}
            } else if (far > TOUCH_SLOP) {
                reset(); // moved before the hold: it's a scroll
            }
            return;
        }
        e.preventDefault();
        over(e.clientX, e.clientY);
        place(e.clientX, e.clientY);
    }
    function up(e: PointerEvent) {
        if (e.pointerId !== pointerId) {return;}
        const was = dragging;
        reset();
        if (was) {
            swallowUntil = Date.now() + 400;
            opts.done();
        }
    }
    // while a finger drags, the page must not scroll (needs a non-passive listener)
    function touchMove(e: TouchEvent) {if (dragging) {e.preventDefault();}}
    function click(e: MouseEvent) {
        if (Date.now() < swallowUntil) {
            e.preventDefault();
            e.stopPropagation();
            swallowUntil = 0;
        }
    }
    function contextMenu(e: Event) {if (pointerId !== null) {e.preventDefault();}}

    node.addEventListener('pointerdown', down);
    node.addEventListener('pointermove', moveHandler);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    node.addEventListener('touchmove', touchMove, { passive: false });
    node.addEventListener('click', click, true);
    node.addEventListener('contextmenu', contextMenu);
    return {
        update(next: DragSortOptions) {opts = next;},
        destroy() {
            reset();
            node.removeEventListener('pointerdown', down);
            node.removeEventListener('pointermove', moveHandler);
            node.removeEventListener('pointerup', up);
            node.removeEventListener('pointercancel', up);
            node.removeEventListener('touchmove', touchMove);
            node.removeEventListener('click', click, true);
            node.removeEventListener('contextmenu', contextMenu);
        },
    };
}
