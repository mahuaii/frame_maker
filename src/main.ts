import { createApp } from 'vue';
import App from './App.vue';
import '../css/fonts-local.css';

const isVueNativeMode = new URLSearchParams(window.location.search).get('app') === 'vue';

const stylePromise = isVueNativeMode
    ? import('./styles/vue-native.css')
    : import('../css/style.css');

stylePromise.then(() => {
    createApp(App).mount('#app');
});
