import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import Layout from './Layout.vue';
import ModelsCatalog from './components/ModelsCatalog.vue';
import ModelsCompare from './components/ModelsCompare.vue';
import LandingPage from './components/LandingPage.vue';
import AuthPage from './components/AuthPage.vue';
import AppDashboard from './components/AppDashboard.vue';
import './models-catalog.css';
import './landing.css';
import './auth.css';
import './app-dashboard.css';

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('ModelsCatalog', ModelsCatalog);
    app.component('ModelsCompare', ModelsCompare);
    app.component('LandingPage', LandingPage);
    app.component('AuthPage', AuthPage);
    app.component('AppDashboard', AppDashboard);
  },
} satisfies Theme;
