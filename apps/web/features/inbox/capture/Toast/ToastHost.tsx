'use client';

import { Notifications } from '@mantine/notifications';
import classes from './Toast.module.css';

/** Where the toasts show; mounted once, inside MantineProvider */
export function ToastHost() {
  return <Notifications position="top-right" zIndex={500} limit={1} containerWidth={400} className={classes.notifications} />;
}
