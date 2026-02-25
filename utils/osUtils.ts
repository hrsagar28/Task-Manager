export const isMac = () => {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
};

export const getModifierKey = () => {
    return isMac() ? '⌘' : 'Ctrl+';
};

export const getAltKey = () => {
    return isMac() ? '⌥' : 'Alt+';
};
