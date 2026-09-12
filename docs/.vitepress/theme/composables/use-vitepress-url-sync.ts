import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vitepress';

/** VitePress route has no query/fullPath — sync from location on client navigations. */
export function useVitepressUrlSync(onSync: () => void) {
  const router = useRouter();
  let prevOnAfterRouteChange = router.onAfterRouteChange;

  function onPopState() {
    onSync();
  }

  onMounted(() => {
    prevOnAfterRouteChange = router.onAfterRouteChange;
    router.onAfterRouteChange = async (href) => {
      await prevOnAfterRouteChange?.(href);
      onSync();
    };
    window.addEventListener('popstate', onPopState);
  });

  onUnmounted(() => {
    router.onAfterRouteChange = prevOnAfterRouteChange;
    window.removeEventListener('popstate', onPopState);
  });
}
