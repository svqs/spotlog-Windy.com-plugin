import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-spotlog',
    version: '0.18.7',
    icon: '🌊',
    title: 'spotlog ✦', // Windy needs more than 7 characters; the sparkle stands in for the pixel star
    description: 'Save forecasts for your spots, log how the session really was, and learn which forecast to trust.',
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
