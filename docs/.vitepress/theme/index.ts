import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import ModelsCatalog from './components/ModelsCatalog.vue';
import ModelsCompare from './components/ModelsCompare.vue';
import './models-catalog.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ModelsCatalog', ModelsCatalog);
    app.component('ModelsCompare', ModelsCompare);
  },
} satisfies Theme;
