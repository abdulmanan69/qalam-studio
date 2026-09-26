import { toast } from 'sonner';
import { registerSW } from 'virtual:pwa-register';

import i18n from '@/i18n';

/** Register the service worker and tell the user about offline readiness and updates. */
export function registerServiceWorker(): void {
  const update = registerSW({
    onOfflineReady() {
      toast.success(i18n.t('common.offlineReady'));
    },
    onNeedRefresh() {
      toast(i18n.t('common.updateAvailable'), {
        duration: Infinity,
        action: {
          label: i18n.t('common.reload'),
          onClick: () => {
            void update(true);
          },
        },
      });
    },
  });
}
