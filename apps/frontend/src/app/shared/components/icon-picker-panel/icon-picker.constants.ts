export interface IconGroup { label: string; icons: string[] }

export const ICON_GROUPS: IconGroup[] = [
  {
    label: 'Flag / Priority',
    icons: ['pi pi-flag', 'pi pi-bookmark', 'pi pi-star', 'pi pi-heart', 'pi pi-thumbs-up', 'pi pi-thumbs-down'],
  },
  {
    label: 'Alert',
    icons: ['pi pi-bolt', 'pi pi-exclamation-triangle', 'pi pi-exclamation-circle', 'pi pi-ban', 'pi pi-times-circle'],
  },
  {
    label: 'Status',
    icons: ['pi pi-check-circle', 'pi pi-clock', 'pi pi-pause-circle', 'pi pi-play', 'pi pi-stop-circle'],
  },
  {
    label: 'Arrow',
    icons: ['pi pi-arrow-up', 'pi pi-arrow-down', 'pi pi-arrow-right', 'pi pi-angle-double-up', 'pi pi-angle-double-down'],
  },
  {
    label: 'General',
    icons: ['pi pi-circle', 'pi pi-minus', 'pi pi-ellipsis-h', 'pi pi-tag', 'pi pi-tags', 'pi pi-info-circle'],
  },
];
