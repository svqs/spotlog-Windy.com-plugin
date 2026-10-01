import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-spotlog',
    version: '0.8.0',
    icon: '🌊',
    title: 'Spotlog session diary',
    description: 'Save forecasts for your spots, log how the session really was, and learn which forecast to trust.',
    author: 'Sophia Stoltz',
    desktopUI: 'rhpane',
    mobileUI: 'small',
    desktopWidth: 400,
    listenToSingleclick: true,
    addToContextmenu: true,
    routerPath: '/spotlog',
    private: true,
};

export default config;
