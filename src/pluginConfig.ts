import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-spotlog',
    version: '0.18.10',
    icon: '🌊',
    title: 'spotlog ✦', // Windy needs more than 7 characters; the sparkle stands in for the pixel star
    // the welcome text (copy.ts → welcomeText), shown in Windy's plugin gallery
    description: 'Save the forecast before you go out and log how it was after. Spotlog learns from your sessions when your spots look good for you.',
    author: 'Sophia Stoltz',
    repository: 'https://github.com/svqs/spotlog-Windy.com-plugin',
    desktopUI: 'rhpane',
    mobileUI: 'small',
    desktopWidth: 400,
    listenToSingleclick: true,
    addToContextmenu: true,
    routerPath: '/spotlog',
    // public: shown to Windy's team in the plugin publisher, so they can review it for the plugin gallery
    private: false,
};

export default config;
