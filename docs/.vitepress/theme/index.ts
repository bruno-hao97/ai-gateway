import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import Layout from './Layout.vue';
import ModelsCatalog from './components/ModelsCatalog.vue';
import ModelsCompare from './components/ModelsCompare.vue';
import LandingPage from './components/LandingPage.vue';
import AuthPage from './components/AuthPage.vue';
import LegalPage from './components/LegalPage.vue';
import AboutPage from './components/AboutPage.vue';
import AppDashboard from './components/AppDashboard.vue';
import ApiPlaygroundEmbed from './components/ApiPlaygroundEmbed.vue';
import './brand.css';
import './nav.css';
import './scrollbars.css';
import './models-catalog.css';
import './landing.css';
import './auth.css';
import './legal.css';
import './about.css';
import './app-dashboard.css';
import './api-playground.css';
import './site-footer.css';

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('ModelsCatalog', ModelsCatalog);
    app.component('ModelsCompare', ModelsCompare);
    app.component('LandingPage', LandingPage);
    app.component('AuthPage', AuthPage);
    app.component('LegalPage', LegalPage);
    app.component('AboutPage', AboutPage);
    app.component('AppDashboard', AppDashboard);
    app.component('ApiPlaygroundEmbed', ApiPlaygroundEmbed);
  },
} satisfies Theme;
