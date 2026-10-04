/**
 * A light tick under the finger (the time wheels).
 * Android: the vibration motor. iPhones have no vibration for web pages; Safari 18+ does give a light
 * Taptic tap when a native switch toggles, so a hidden one is flipped. Older iPhones: no tick, nothing breaks.
 */
let label: HTMLLabelElement | null = null;
let last = 0;

export function haptic(): void {
    const now = Date.now();
    if (now - last < 30) {return;} // fast flicks: not a buzz
    last = now;
    try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(8);
            return;
        }
        if (typeof document === 'undefined') {return;}
        if (!label || !label.isConnected) {
            label = document.createElement('label');
            label.setAttribute('aria-hidden', 'true');
            label.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
            const box = document.createElement('input');
            box.type = 'checkbox';
            box.setAttribute('switch', '');
            box.tabIndex = -1;
            label.appendChild(box);
            document.body.appendChild(label);
        }
        label.click();
    } catch {
        /* no haptics here */
    }
}

export function hapticCleanup(): void {
    label?.remove();
    label = null;
}
